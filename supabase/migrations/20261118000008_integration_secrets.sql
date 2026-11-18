-- Credenciales de integraciones administrables desde /admin/integraciones.
-- Se guardan CIFRADAS en Supabase Vault (vault.secrets, nombre "bb_<clave>").
--   * El admin escribe y ve el estado (configurado, últimos 4 caracteres) — nunca el valor.
--   * El servidor del sitio (y el VPS) las lee con la clave de servidor (private.server_keys),
--     igual que place_order: sin service role.
--   * Cada cambio queda en audit_log SIN el valor.

create table if not exists private.integration_keys (
  name text primary key,
  grp text not null,            -- mercadopago | andreani | email
  is_secret boolean not null,   -- false = se puede mostrar completo (ej. código de cliente)
  updated_at timestamptz,
  updated_by uuid
);
revoke all on private.integration_keys from public, anon, authenticated;

insert into private.integration_keys (name, grp, is_secret) values
  ('mercadopago_access_token', 'mercadopago', true),
  ('mercadopago_webhook_secret', 'mercadopago', true),
  ('andreani_env', 'andreani', false),
  ('andreani_user', 'andreani', false),
  ('andreani_password', 'andreani', true),
  ('andreani_client', 'andreani', false),
  ('andreani_contract_home', 'andreani', false),
  ('andreani_contract_branch', 'andreani', false),
  ('andreani_origin_branch', 'andreani', false),
  ('resend_api_key', 'email', true),
  ('email_from', 'email', false),
  ('email_admin_notifications', 'email', false)
on conflict (name) do nothing;

-- Guarda (o borra, con valor vacío) una credencial. Solo admin/staff.
create or replace function public.admin_set_integration_secret(p_name text, p_value text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not exists (select 1 from private.integration_keys where name = p_name) then
    raise exception 'Clave desconocida' using hint = 'admin';
  end if;
  if v_value is not null and length(v_value) > 2000 then
    raise exception 'Valor demasiado largo' using hint = 'admin';
  end if;

  select id into v_id from vault.secrets where name = 'bb_' || p_name;
  if v_value is null then
    if v_id is not null then
      delete from vault.secrets where id = v_id;
    end if;
  elsif v_id is null then
    perform vault.create_secret(v_value, 'bb_' || p_name, 'Balance Beauty · integración');
  else
    perform vault.update_secret(v_id, v_value);
  end if;

  update private.integration_keys set updated_at = now(), updated_by = (select auth.uid()) where name = p_name;
  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), case when v_value is null then 'integration.clear' else 'integration.set' end,
          'integration', p_name, null);
  return jsonb_build_object('ok', true, 'name', p_name, 'configured', v_value is not null);
end;
$$;

-- Estado para el panel: configurado o no, pista (últimos 4 o valor completo si no es secreto).
create or replace function public.admin_integration_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_object_agg(k.name, jsonb_build_object(
      'group', k.grp,
      'configured', d.decrypted_secret is not null,
      'hint', case
        when d.decrypted_secret is null then null
        when k.is_secret then '••••' || right(d.decrypted_secret, 4)
        else d.decrypted_secret end,
      'updated_at', k.updated_at))
    from private.integration_keys k
    left join vault.decrypted_secrets d on d.name = 'bb_' || k.name), '{}'::jsonb);
end;
$$;

-- Lectura de todos los valores para el servidor (web en Vercel y VPS). Exige la clave de servidor.
create or replace function public.get_integration_secrets(p_server_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.check_server_key('checkout', p_server_key) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_object_agg(k.name, d.decrypted_secret)
    from private.integration_keys k
    join vault.decrypted_secrets d on d.name = 'bb_' || k.name), '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_set_integration_secret(text, text) from public, anon;
grant execute on function public.admin_set_integration_secret(text, text) to authenticated;
revoke execute on function public.admin_integration_status() from public, anon;
grant execute on function public.admin_integration_status() to authenticated;
revoke execute on function public.get_integration_secrets(text) from public;
grant execute on function public.get_integration_secrets(text) to anon, authenticated;
