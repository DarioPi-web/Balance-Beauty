-- Usuarios y roles desde el admin (2026-11-20, pedido del dueño).
-- * admin_list_users: todos los usuarios registrados (auth.users + profiles) con búsqueda,
--   filtro por rol y paginado. Solo admin.
-- * admin_set_user_role: cambia el rol con resguardos:
--     - nadie se quita a sí mismo el acceso de administración (evita quedar afuera);
--     - siempre tiene que quedar al menos un administrador;
--     - al pasar a mayorista se marca la aprobación; cada cambio queda en audit_log.
-- Roles: customer (cliente), wholesale (mayorista), staff (equipo: acceso al admin),
-- admin (administración completa). is_admin() ya incluye staff.

create or replace function public.admin_list_users(
  p_query text default null,
  p_role text default null,
  p_limit int default 50,
  p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(lower(trim(coalesce(p_query, ''))), '');
  v_role public.user_role;
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_role is not null and p_role <> '' then
    begin
      v_role := p_role::public.user_role;
    exception when others then
      raise exception 'Rol inválido' using hint = 'admin';
    end;
  end if;

  return (
    with base as (
      select u.id, lower(u.email) as email, u.created_at, u.last_sign_in_at,
             coalesce(p.role, 'customer'::public.user_role) as role,
             p.full_name, p.phone,
             exists (select 1 from public.sellers s where s.user_id = u.id) as is_seller,
             (select count(*) from public.orders o where o.user_id = u.id or lower(o.email) = lower(u.email)) as orders
        from auth.users u
        left join public.profiles p on p.id = u.id
       where (v_q is null or lower(u.email) like '%' || v_q || '%'
                         or lower(coalesce(p.full_name, '')) like '%' || v_q || '%')
         and (v_role is null or coalesce(p.role, 'customer'::public.user_role) = v_role)
    )
    select jsonb_build_object(
      'total', (select count(*) from base),
      'counts', (select jsonb_object_agg(r, n) from (
                   select coalesce(p.role, 'customer'::public.user_role)::text as r, count(*) as n
                     from auth.users u left join public.profiles p on p.id = u.id
                    group by 1) c),
      'users', coalesce((select jsonb_agg(b order by b.created_at desc)
                           from (select * from base order by created_at desc limit v_limit offset v_offset) b),
                        '[]'::jsonb))
  );
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new public.user_role;
  v_old public.user_role;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  begin
    v_new := p_role::public.user_role;
  exception when others then
    raise exception 'Rol inválido' using hint = 'admin';
  end;

  select lower(u.email), coalesce(p.role, 'customer'::public.user_role) into v_email, v_old
    from auth.users u left join public.profiles p on p.id = u.id
   where u.id = p_user_id;
  if v_email is null then
    raise exception 'Usuario inexistente' using hint = 'admin';
  end if;
  if v_old = v_new then
    return jsonb_build_object('ok', true, 'changed', false, 'role', v_new);
  end if;

  if p_user_id = (select auth.uid()) and v_old in ('admin', 'staff') and v_new not in ('admin', 'staff') then
    raise exception 'No podés quitarte a vos mismo el acceso al administrador. Pedíselo a otra persona administradora.'
      using hint = 'admin';
  end if;
  if v_old = 'admin' and v_new <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Tiene que quedar al menos un administrador.' using hint = 'admin';
  end if;

  insert into public.profiles (id, role) values (p_user_id, v_new)
  on conflict (id) do update
     set role = excluded.role,
         wholesale_approved_at = case when excluded.role = 'wholesale'
                                      then coalesce(public.profiles.wholesale_approved_at, now())
                                      else public.profiles.wholesale_approved_at end,
         updated_at = now();

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'profile.role', 'profiles', p_user_id::text,
          jsonb_build_object('email', v_email, 'from', v_old, 'to', v_new));

  return jsonb_build_object('ok', true, 'changed', true, 'role', v_new, 'email', v_email);
end;
$$;

revoke all on function public.admin_list_users(text, text, int, int) from public, anon;
grant execute on function public.admin_list_users(text, text, int, int) to authenticated;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
