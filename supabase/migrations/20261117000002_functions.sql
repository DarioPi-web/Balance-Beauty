-- Funciones base: rol, triggers, hook de JWT y búsqueda.

-- ¿El usuario actual es admin/staff? Se usa en políticas como (select public.is_admin()).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'staff')
  );
$$;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger products_updated_at  before update on public.products  for each row execute function public.set_updated_at();
create trigger carts_updated_at     before update on public.carts     for each row execute function public.set_updated_at();
create trigger orders_updated_at    before update on public.orders    for each row execute function public.set_updated_at();
create trigger payments_updated_at  before update on public.payments  for each row execute function public.set_updated_at();
create trigger shipments_updated_at before update on public.shipments for each row execute function public.set_updated_at();

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hook de Auth: agrega user_role al JWT (habilitar en config.toml / dashboard).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'customer')::text));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;

-- Búsqueda: FTS en español + similitud por trigramas, solo productos activos.
create or replace function public.search_products(q text, max_results int default 20)
returns table (
  id uuid,
  slug text,
  name text,
  tagline text,
  price int,
  rank real
)
language sql
stable
set search_path = ''
as $$
  with query as (
    select websearch_to_tsquery('spanish', public.unaccent_immutable(q)) as tsq,
           public.unaccent_immutable(lower(q)) as plain
  )
  select p.id, p.slug, p.name, p.tagline, p.price,
         (ts_rank(p.search, query.tsq) + extensions.similarity(public.unaccent_immutable(lower(p.name)), query.plain))::real as rank
  from public.products p, query
  where p.status = 'active'
    and (p.search @@ query.tsq
         or extensions.similarity(public.unaccent_immutable(lower(p.name)), query.plain) > 0.2)
  order by rank desc
  limit least(greatest(max_results, 1), 50);
$$;
