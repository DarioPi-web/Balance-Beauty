-- Balance Beauty - instalacion inicial en Supabase (cualquier proyecto vacio). Staging actual: tblitemxzgeolktuieph (sa-east-1)
-- Pegar todo en Dashboard > SQL Editor > New query > Run. Es una sola transaccion: si algo falla, no se aplica nada.
-- Generado desde supabase/migrations + supabase/seed.sql. No editar a mano.
begin;

-- ===== migracion 20261117000001_schema.sql =====
-- Balance Beauty — esquema inicial (docs/03). Montos en pesos enteros (ARS).

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent no es IMMUTABLE; wrapper para columnas generadas e índices
create or replace function public.unaccent_immutable(text)
returns text
language sql
immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ───────────── Enums ─────────────
create type public.user_role       as enum ('customer', 'wholesale', 'admin', 'staff');
create type public.product_status  as enum ('draft', 'active', 'archived');
create type public.order_status    as enum ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status  as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process');
create type public.payment_method  as enum ('card', 'bank_transfer', 'qr', 'cash_pickup');
create type public.shipping_method as enum ('home_delivery', 'branch_pickup', 'store_pickup');
create type public.routine_step    as enum ('cleanse', 'treat', 'hydrate', 'protect', 'supplement', 'accessory');
create type public.time_of_use     as enum ('am', 'pm', 'am_pm');

-- ───────────── Perfiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  dni text,
  role public.user_role not null default 'customer',
  wholesale_approved_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  label text,
  recipient text not null,
  phone text,
  street text not null,
  number text not null,
  floor_apt text,
  city text not null,
  province text not null,
  postal_code text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ───────────── Catálogo ─────────────
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_path text
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories,
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

-- Preocupaciones de la piel (navegación principal, docs/14 §3)
create table public.concerns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

-- Activos (ingredientes) con explicación corta
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  summary text,
  description text
);

create sequence public.sku_seq start 157; -- SKUs heredados de WooCommerce: 104–156

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_wp_id bigint unique,
  sku text not null unique default nextval('public.sku_seq')::text,
  name text not null,
  slug text not null unique,
  brand_id uuid references public.brands,
  tagline text,                    -- "para qué sirve" en una línea
  short_description text,
  description text,
  how_to_use text,
  skin_types text[] not null default '{}',
  routine_step public.routine_step,
  time_of_use public.time_of_use,
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price >= 0),
  price_without_national_taxes int check (price_without_national_taxes >= 0),
  track_stock boolean not null default true,
  stock int not null default 0 check (stock >= 0),
  reserved_stock int not null default 0 check (reserved_stock >= 0),
  low_stock_threshold int not null default 3,
  weight_g int check (weight_g > 0),
  length_cm numeric(6,1),
  width_cm numeric(6,1),
  height_cm numeric(6,1),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  requires_prescription boolean not null default false,
  seo_title text,
  seo_description text,
  search tsvector generated always as (
    setweight(to_tsvector('spanish', public.unaccent_immutable(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple',  coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('spanish', public.unaccent_immutable(coalesce(tagline, ''))), 'B') ||
    setweight(to_tsvector('spanish', public.unaccent_immutable(coalesce(short_description, ''))), 'B') ||
    setweight(to_tsvector('spanish', public.unaccent_immutable(coalesce(description, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserved_le_stock check (reserved_stock <= stock or not track_stock)
);
create index products_search_idx on public.products using gin (search);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_active_idx on public.products (created_at desc) where status = 'active';
create index products_brand_idx on public.products (brand_id);

create table public.product_categories (
  product_id uuid references public.products on delete cascade,
  category_id uuid references public.categories on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories (category_id);

create table public.product_concerns (
  product_id uuid references public.products on delete cascade,
  concern_id uuid references public.concerns on delete cascade,
  is_primary boolean not null default false,
  primary key (product_id, concern_id)
);
create index product_concerns_concern_idx on public.product_concerns (concern_id);

create table public.product_ingredients (
  product_id uuid references public.products on delete cascade,
  ingredient_id uuid references public.ingredients on delete cascade,
  concentration text,              -- "10 %", "5 %"
  is_key boolean not null default true,
  sort_order int not null default 0,
  primary key (product_id, ingredient_id)
);
create index product_ingredients_ingredient_idx on public.product_ingredients (ingredient_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  storage_path text not null,
  alt text,
  width int,
  height int,
  sort_order int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.related_products (
  product_id uuid references public.products on delete cascade,
  related_id uuid references public.products on delete cascade,
  primary key (product_id, related_id),
  check (product_id <> related_id)
);

-- Listas de precios (minorista / mayorista)
create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  min_order_amount int not null default 0
);
create table public.product_prices (
  price_list_id uuid references public.price_lists on delete cascade,
  product_id uuid references public.products on delete cascade,
  price int not null check (price >= 0),
  primary key (price_list_id, product_id)
);

-- ───────────── Carrito ─────────────
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  coupon_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carts_user_idx on public.carts (user_id);

create table public.cart_items (
  cart_id uuid references public.carts on delete cascade,
  product_id uuid references public.products,
  quantity int not null check (quantity > 0 and quantity <= 50),
  primary key (cart_id, product_id)
);

-- ───────────── Promociones y cupones ─────────────
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('installments', 'payment_method_discount', 'percent_off', 'free_shipping')),
  title text not null,
  badge_text text,
  payment_method public.payment_method,
  percent numeric(5,2) check (percent between 0 and 100),
  installments int check (installments > 0),
  min_amount int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent numeric(5,2) check (percent between 0 and 100),
  amount int check (amount >= 0),
  min_amount int not null default 0,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  check (percent is not null or amount is not null)
);

-- ───────────── Envíos ─────────────
create table public.shipping_rates (           -- tarifa plana de respaldo
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  postal_code_from int,
  postal_code_to int,
  method public.shipping_method not null,
  carrier text,
  price int not null check (price >= 0),
  free_from int,
  eta_days text,
  is_active boolean not null default true
);

create table public.shipping_rate_matrix (     -- precalculada por el VPS (ADR-014)
  carrier text not null,
  service text not null,
  postal_code int not null,
  weight_bucket_g int not null,
  size_bucket text not null default 'S',
  price int not null check (price >= 0),
  eta_days text,
  refreshed_at timestamptz not null default now(),
  primary key (carrier, service, postal_code, weight_bucket_g, size_bucket)
);

create table public.pickup_branches (
  carrier text not null,
  code text not null,
  name text not null,
  address text,
  city text,
  province text,
  postal_code int,
  lat numeric(9,6),
  lng numeric(9,6),
  hours text,
  refreshed_at timestamptz not null default now(),
  primary key (carrier, code)
);
create index pickup_branches_cp_idx on public.pickup_branches (postal_code);

-- ───────────── Pedidos ─────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('public.order_number_seq'),
  user_id uuid references public.profiles on delete set null,
  email text not null,
  phone text,
  full_name text not null,
  dni text,
  status public.order_status not null default 'pending_payment',
  payment_method public.payment_method not null,
  shipping_method public.shipping_method not null,
  shipping_address jsonb,
  shipping_quote jsonb,
  subtotal int not null check (subtotal >= 0),
  discount_total int not null default 0 check (discount_total >= 0),
  shipping_total int not null default 0 check (shipping_total >= 0),
  total int not null check (total >= 0),
  coupon_id uuid references public.coupons,
  promotion_ids uuid[] not null default '{}',
  customer_note text,
  admin_note text,
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.products on delete set null,
  sku text not null,
  name text not null,
  unit_price int not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total int not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount int not null check (amount >= 0),
  installments int,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_idx on public.payments (order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  carrier text not null,
  tracking_code text,
  tracking_url text,
  label_path text,
  status text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);
create index shipments_order_idx on public.shipments (order_id);

-- ───────────── Contenido ─────────────
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  desktop_path text not null,
  mobile_path text not null,
  href text,
  sort_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_visible boolean not null default true
);

create table public.pages (
  slug text primary key,
  title text not null,
  body text not null,
  seo_description text,
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false
);

-- ───────────── Legal / contacto ─────────────
create table public.withdrawal_requests (     -- Botón de arrepentimiento (Res. 424/2020)
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  order_number int,
  email text not null,
  full_name text not null,
  reason text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  message text not null check (char_length(message) <= 5000),
  kind text not null default 'contact' check (kind in ('contact', 'wholesale')),
  created_at timestamptz not null default now()
);

-- ───────────── Auditoría ─────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);


-- ===== migracion 20261117000002_functions.sql =====
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


-- ===== migracion 20261117000003_rls.sql =====
-- RLS en TODAS las tablas. Patrón performante: (select auth.uid()) / (select public.is_admin()).
-- Escrituras de clientes (carrito, pedidos) pasan por Server Actions/RPC; acá no se habilitan inserts directos.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','brands','categories','concerns','ingredients','products',
    'product_categories','product_concerns','product_ingredients','product_images','related_products',
    'price_lists','product_prices','carts','cart_items','promotions','coupons',
    'shipping_rates','shipping_rate_matrix','pickup_branches',
    'orders','order_items','payments','shipments',
    'banners','faqs','pages','store_settings','withdrawal_requests','contact_messages','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- admin/staff: acceso total
    execute format(
      'create policy "admin all" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t);
  end loop;
end $$;

-- ── Catálogo público (lectura anónima) ──
create policy "public read active products" on public.products
  for select to anon, authenticated using (status = 'active');

create policy "public read brands" on public.brands for select to anon, authenticated using (true);
create policy "public read categories" on public.categories for select to anon, authenticated using (is_visible);
create policy "public read concerns" on public.concerns for select to anon, authenticated using (is_visible);
create policy "public read ingredients" on public.ingredients for select to anon, authenticated using (true);

create policy "public read product_categories" on public.product_categories
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_concerns" on public.product_concerns
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_ingredients" on public.product_ingredients
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read related" on public.related_products
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = related_id and p.status = 'active'));

create policy "public read active promotions" on public.promotions
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read active banners" on public.banners
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read faqs" on public.faqs for select to anon, authenticated using (is_visible);
create policy "public read pages" on public.pages for select to anon, authenticated using (true);
create policy "public read settings" on public.store_settings for select to anon, authenticated using (is_public);
create policy "public read shipping_rates" on public.shipping_rates for select to anon, authenticated using (is_active);
create policy "public read rate matrix" on public.shipping_rate_matrix for select to anon, authenticated using (true);
create policy "public read branches" on public.pickup_branches for select to anon, authenticated using (true);

-- ── Mayoristas: precios de lista solo si están aprobados ──
create policy "wholesale read prices" on public.product_prices
  for select to authenticated
  using (exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid()) and pr.role = 'wholesale' and pr.wholesale_approved_at is not null
  ));

-- ── Hook de Auth: el rol supabase_auth_admin lee el rol del perfil ──
create policy "auth hook reads roles" on public.profiles
  for select to supabase_auth_admin using (true);

-- ── Datos propios del cliente ──
create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

create policy "own addresses" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own carts read" on public.carts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own cart items read" on public.cart_items
  for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

create policy "own orders read" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own order items read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "own payments read" on public.payments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "own shipments read" on public.shipments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- ── Formularios públicos (Turnstile se valida en la Server Action) ──
create policy "anyone can request withdrawal" on public.withdrawal_requests
  for insert to anon, authenticated with check (true);
create policy "anyone can send contact" on public.contact_messages
  for insert to anon, authenticated with check (true);


-- ===== seed (catalogo de ejemplo) =====
-- GENERADO por scripts/generate-seed.mjs — no editar a mano.
-- Catálogo heredado de WooCommerce (backup 2026-06-28). Re-exportar del sitio en vivo antes del go-live.

insert into public.price_lists (code, name) values ('retail', 'Minorista'), ('wholesale', 'Mayorista') on conflict (code) do nothing;

-- Categorías propuestas (validar con cliente, Q-07)
insert into public.categories (name, slug, sort_order) values
  ('Limpieza', 'limpieza', 0),
  ('Hidratación', 'hidratacion', 1),
  ('Protección solar', 'proteccion-solar', 2),
  ('Serums', 'serums', 3),
  ('Despigmentantes', 'despigmentantes', 4),
  ('Anti-acné', 'anti-acne', 5),
  ('Contorno de ojos y labios', 'contorno-ojos-labios', 6),
  ('Corporal', 'corporal', 7),
  ('Nutricosmética', 'nutricosmetica', 8),
  ('Accesorios', 'accesorios', 9)
on conflict (slug) do nothing;

-- Preocupaciones de la piel (docs/14 §3)
insert into public.concerns (name, slug, sort_order) values
  ('Acné', 'acne', 0),
  ('Manchas', 'manchas', 1),
  ('Rosácea y piel sensible', 'rosacea-sensible', 2),
  ('Hidratación', 'hidratacion', 3),
  ('Antiedad', 'antiedad', 4),
  ('Protección solar', 'proteccion-solar', 5),
  ('Ojeras', 'ojeras', 6),
  ('Corporal', 'corporal', 7),
  ('Íntimo', 'intimo', 8)
on conflict (slug) do nothing;

-- Productos
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (104, '104', 'Agua Micelar', 'agua-micelar', 'El agua micelar es ideal para una limpieza práctica y efectiva, perfecta para comenzar o finalizar el día. Gracias a su tecnología micelar, atrae y elimina impurezas y maquillaje sin necesidad de frotar. Su fórmula 3 en 1 limpia, desmaquilla e hidrata, dejando la piel fresca, suave y equilibrada, sin sensación grasosa.

Un primer paso simple que mantiene la piel limpia y saludable todos los días', 25000, true, 17, 260, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (105, '105', 'Espuma de limpieza', 'espuma-limpieza', 'La espuma de limpieza proporciona una higiene más profunda, ideal para complementar la rutina y eliminar residuos que se acumulan en la piel. Su textura ligera y envolvente permite limpiar en profundidad sin resecar. Su fórmula 3 en 1 limpia, desmaquilla e hidrata, dejando la piel purificada, luminosa y visiblemente más uniforme.

La limpieza profunda es clave para una piel renovada y libre de impurezas.', 25000, true, 7, 260, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (106, '106', 'Scrub facial y corporal 5% ac glicólico', 'scrumb-fisicoquimico', 'La exfoliación combina acción física y química para eliminar células muertas, desobstruir poros y eliminar impurezas acumuladas, renovando la superficie de la piel. Este paso es indispensable para mejorar la textura, estimular la regeneración celular y devolver luminosidad. Además, favorece la absorción de los activos aplicados posteriormente. Uso semanal.

Exfoliar es renovar: el paso clave para una piel más suave, uniforme y luminosa.', 29500, false, 0, 360, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (107, '107', 'Crema hidratante corporal supreme Urea', 'crema-corporal', 'Una fórmula súper hidratante, de rápida absorción que no deja efecto graso, para una piel suave, hidratada y radiante durante todo el día. Un blend de activos hidratantes y nutritivos, rico en omegas, micronutrientes esenciales y aminoácidos. Urea + karité Hydra Nutriskin® Rosa de Jericó', 48000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (108, '108', 'Anticelulitis', 'crema-corporal-celulitis', 'Crema corporal reductora de la celulitis con una doble eficacia: Ayuda a mejorar visiblemente la apariencia de la piel de naranja mientras ayuda a disminuir la retención de líquidos mejorando la microcirculación.', 48000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (109, '109', 'Hydra Filler Light', 'hydra-filler-light', 'La hidratación facial es fundamental para mantener el equilibrio y la salud de la piel. Hydra Filler Light está formulado con una textura liviana, ideal para pieles mixtas a grasas o para quienes buscan una hidratación sin sensación pesada. Su combinación de activos ayuda a restaurar la barrera cutánea, aportando frescura, suavidad y luminosidad, mientras mantiene la piel protegida durante el día.', 29600, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (110, '110', 'Hydra Filler Intense', 'hydra-filler-intense', 'La hidratación profunda es clave para devolverle a la piel su vitalidad y elasticidad. Hydra Filler Intense presenta una textura más rica y nutritiva, ideal para pieles secas o deshidratadas que requieren un mayor aporte de hidratación. Su fórmula concentrada ayuda a reparar la barrera protectora, mejorar la tersura y aportar luminosidad, dejando la piel visiblemente más saludable y confortable. Ideal para uso diario.', 29600, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (111, '111', 'Hydra edad de oro', 'hydra-age-oro-edad', 'Este tratamiento hidratante está diseñado para cubrir las necesidades de las pieles más maduras, brindando una hidratación profunda y sostenida. Su fórmula con activos de alto poder nutritivo ayuda a reforzar la barrera protectora de la piel, mejorar la tersura y devolver luminosidad. Ideal para acompañar los procesos naturales de la piel con el paso del tiempo, aportando firmeza, confort y un aspecto más saludable.rnrn', 32700, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (112, '112', 'Protector Solar con Color', 'protector-solar-con-color', 'Además de brindar alta protección solar, esta emulsión facial con color ayuda a unificar el tono de la piel, disimulando imperfecciones de forma natural. Su textura de toque seco permite un acabado mate y liviano, ideal para el uso diario. Protege frente a los rayos UVA/UVB y la luz azul, aportando un efecto saludable y uniforme en la piel.', 35500, true, 0, 150, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (113, '113', 'Protector Solar sin Color', 'protector-solar-sin-color', 'Esta emulsión facial está diseñada para proteger la piel del rostro de la exposición diaria al sol. Su fórmula liviana actúa contra los rayos UVA/UVB y la luz azul, previniendo el envejecimiento prematuro y la aparición de manchas. Aporta hidratación sin dejar residuos grasos, logrando un acabado confortable y de rápida absorción.', 35500, true, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (114, '114', 'EXEL pantalla fotoprotectora SPF 60', 'protector-exel-sin-color', 'La Pantalla Fotoprotectora Clarificante SPF60 de Exel es la solución ideal para quienes buscan una protección efectiva contra los dañinos rayos UV. Formulada especialmente para pieles con tendencia a las manchas, esta crema de tono claro se adapta perfectamente al rostro, cuello y escote, brindando una cobertura uniforme y segura. Su factor de protección solar 60 garantiza una defensa robusta, permitiendo disfrutar del sol sin preocupaciones. Incorporar la Pantalla Fotoprotectora Clarificante SPF60 en tu rutina de cuidado de la piel es un paso esencial para mantener un cutis saludable y radiante. Protege tu piel de los efectos nocivos del sol y previene la aparición de manchas, asegurando que tu belleza natural brille en cualquier ocasión. Con Exel, cuida tu piel con confianza y efectividad.', 46000, true, 1, 36000, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (115, '115', 'Protector via Oral', 'protector-via-oral', null, 42000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (116, '116', 'Clear complexión despigmentante', 'despigment-clear-complex', 'Clear Complexion, innovador y poderoso complejo despigmentante que permite unificar el color de la piel logrando el aspecto deseado. Su formulación sinérgica aporta luminosidad, brillo y tersura a la piel del rostro, cuello, escote y manos.', 48000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (117, '117', 'Ac glicolico 10% (ULTRA DEFENSE)', 'ultra-defense-acido-glicolico-10', 'Pensada para combatir el envejecimiento cutáneo, favoreciendo la renovación celular, fortaleciendo la barrera cutánea y devolviendo su elasticidad y flexibilidad. Ideal uso nocturno.', 38000, true, 10, 150, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (118, '118', 'Contorno de ojos bolsas y ojeras', 'home-care-contorno-bolsas-y-ojeras', 'Formulado para tratar bolsas y ojeras, este contorno de ojos ayuda a descongestionar la zona periocular, favoreciendo la microcirculación y reduciendo la apariencia de hinchazón y oscurecimiento. Su acción contribuye a iluminar la mirada, mejorar el tono de la piel y devolver un aspecto más fresco y descansado. Ideal para quienes buscan revitalizar el contorno de ojos y mejorar visiblemente su apariencia.', 32000, false, 0, 93, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (119, '119', 'Home Care Ojeras Vasculares', 'home-care-ojeras-vasculares', null, 29600, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (120, '120', 'Home Care Ojeras Despigmentantes', 'home-care-ojeras-despicmentantes', null, 29600, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (121, '121', 'Lips glow hidratación + volumen', 'lips-glow-hidratante', 'El cuidado de los labios es esencial para lucir una boca hidratada y luminosa, mejorar la textura y disminuir sus arrugas. La exfoliación e hidratación son dos pasos fundamentales de una rutina. Aseguran una regeneración efectiva, mejorando la calidad, el aspecto, la tersura y su luminosidad.', 32800, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (122, '122', 'Serum hyaluronic', 'serum-hyaluronico', 'El serum Hyaluronic combina activos altamente hidratantes que trabajan en profundidad para restaurar los niveles de agua en la piel. Su fórmula con ácido hialurónico y vitaminas B3 y B5 hidrata intensamente, mejora la elasticidad y refuerza la barrera cutánea, dejando la piel más suave, luminosa y revitalizada.

La hidratación profunda es esencial para una piel saludable y radiante.', 40000, true, 0, 143, 10, 4, 10, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (123, '123', 'Serum Edad de Oro', 'serum-edad-oro', 'Este serum nutritivo está especialmente formulado para pieles maduras y secas que requieren un cuidado intensivo. Su textura oleosa aporta nutrición profunda, ayudando a restaurar la barrera cutánea y mejorar la elasticidad de la piel. Actúa sobre los signos del envejecimiento, devolviendo suavidad, luminosidad y confort, dejando la piel visiblemente más revitalizada y flexible.', 33000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (124, '124', 'Serum Expression', 'sermun-expression', 'El serum Xpression está formulado para actuar específicamente sobre las líneas de expresión, ayudando a suavizar visiblemente arrugas dinámicas y prevenir su formación. Gracias a su acción focalizada, relaja la apariencia de la piel sin perder naturalidad, aportando un aspecto más descansado y rejuvenecido.

Un tratamiento clave para una piel más lisa, uniforme y visiblemente más joven.', 32000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (125, '125', 'Vitamina C', 'vitamina-c-sulderm', 'Monodosis antioxidantes de uso diario. Fórmula a base de Vitamina C + E + Hydra Skin + Ácido Ferúlico, una combinación de potentes antioxidantes que ayudan a proteger la piel contra los radicales libres y agentes externos, ayudando a prevenir y a mejorar los signos del envejecimiento, las arrugas finas y promoviendo la producción de colágeno y elastina para una piel más iluminada y rejuvenecida.', 75000, true, 6, 140, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (126, '126', 'Serum de Pynogenol 5%', 'serum-de-pynogenol-5', null, 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (127, '127', 'Serum C/Niacinamida', 'serum-c-niacinamida', null, 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (128, '128', 'ROSATOPIC Serum', 'rosatopis-serum', 'Este serum está especialmente formulado para pieles sensibles con tendencia a la rosácea, brindando una acción calmante y fortalecedora. Su textura fresca y aterciopelada ayuda a reforzar los capilares y la epidermis, mejorando la vasoconstricción y reduciendo visiblemente las rojeces. Contribuye a equilibrar la piel, aportando hidratación y confort, y mejorando progresivamente su aspecto general.', 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (129, '129', 'Serum Bakuchiol', 'serum-bakuchiol', null, 32000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (130, '130', 'Serum Renovador Antiage', 'serum-renovador-antiage', null, 32000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (131, '131', 'ACNEPLUR Serum', 'serum-acneplur', 'Este serum actúa de forma específica sobre las imperfecciones, ayudando a disminuir los síntomas del acné y regular la producción de sebo. Su fórmula liviana favorece el equilibrio de la microbiota cutánea, mejorando el aspecto general de la piel y reduciendo la apariencia de poros e irregularidades. Ideal para lograr una piel más equilibrada, uniforme y saludable.', 33000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (132, '132', 'ACNEPLUR Foam', 'espuma-acneplur-foam', 'Esta espuma de limpieza está especialmente formulada para pieles oleosas y con tendencia acnéica. Ayuda a eliminar impurezas, exceso de sebo y residuos acumulados, sin alterar la barrera natural de la piel. Su acción contribuye a purificar, equilibrar y preparar la piel para potenciar los tratamientos posteriores, dejándola fresca, limpia y con una textura más uniforme.', 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (133, '133', 'ACNEPLUR Hydra', 'crema-sulderm-hydra-acneplur', 'Este hidratante está diseñado para aportar el equilibrio justo que las pieles oleosas y acnéicas necesitan. Su fórmula ayuda a hidratar sin generar oleosidad, restaurando la barrera cutánea y contribuyendo a mantener la piel protegida. Actúa en sinergia con el resto de la línea, mejorando la textura y favoreciendo un aspecto más saludable y controlado.', 29800, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (134, '134', 'Spray Mist', 'spray-mist-hidratante', 'Bruma facial &amp; corporal. Un shock de hidratación y protección. Ectoina. Prebióticos. Niacinamida Una combinación de ingredientes que actúan en sinergia para ayudar a restaurar la hidratación de la piel, manteniendo en equilibrio la microbiota cutánea y reforzando la barrera de protección natural de la piel.', 30000, true, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (135, '135', 'Solucion de Metformina 30%', 'solucion-de-metformina-30', null, 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (136, '136', 'ROSATOPIC Biosensitive', 'rosatopic-biosensitive-crema', 'Esta crema ha sido desarrollada para reconstituir y proteger las pieles más sensibles, ayudando a calmar la irritación y las rojeces características de la rosácea. Su fórmula aporta hidratación profunda y acción reparadora, fortaleciendo la barrera cutánea y evitando la progresión de la sensibilidad. Ideal para lograr una piel más equilibrada, confortable y visiblemente saludable.', 34000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (137, '137', 'Cleanser con Ac.Mandelico', 'cleanser-con-ac-mandelico', null, 22000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (138, '138', 'Cleanser con Salisilico', 'cleanser-con-salisilico', null, 22000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (139, '139', 'Gel Crema Despigmentante con Metimazol 5% y Tran 4%', 'gel-crema-despigmentante-con-metimazol-5-y-tran-4', null, 49800, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (140, '140', 'Despigmentante Axilas e Ingle', 'despigmentante-axilas-e-ingle', null, 49800, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (141, '141', 'Crema Despigmentante Y Reparadora Azelaico 20%', 'crema-despigmentante-y-reparadora-azelaico-20', null, 49800, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (142, '142', 'Nutriceutico Antiglicante', 'nutriceutico-antiglicante', null, 32000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (143, '143', 'Jabon de limpieza intimo prebiótico', 'jabon-intimo-sulderm', 'Con ácido láctico pH 4,5. Balanceado. Jabón líquido de limpieza formulado específicamente para el área íntima, brindando higiene, seguridad y confort. Con ácido láctico que ayuda a mantener equilibrada la flora microbiota vulvo vaginal brindando un cuidado protector.', 38000, true, 9, 350, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (144, '144', 'Skin Booster Liderma', 'skin-booster-liderma', null, 28000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (145, '145', 'Carthage Deep care', 'emulsion-de-limpieza-de-carthage', 'Elimina suavemente cualquier resto de impureza manteniendo su bienestar y elasticidad.

MODO DE USO

Aplicar sobre el rostro humedecido con masajes suaves y enjuagar.

BENEFICIOS

Limpieza

TIPOS DE PIEL

Piel Grasa, Piel Mixta, Piel Normal, Piel Sensible', 26400, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (146, '146', 'Maquina de Afeitar', 'maquina-de-afeitar', null, 3000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (147, '147', 'Perfilador', 'perfilador', null, 3000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (148, '148', 'Vinchas Balance', 'vinchas-balance', null, 0, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (149, '149', 'Pads Ecológicos', 'pads-ecologicos', null, 0, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (150, '150', 'Fine Power', 'fine-power', null, 60000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (151, '151', 'Fine Strong', 'fine-strong', null, 60000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (152, '152', 'Fine Smooth', 'fine-smooth', null, 70000, false, 0, 640, 10, 4, 10, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (153, '153', 'Fine Peak', 'fine-peak', null, 60000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (154, '154', 'Fine Beauti', 'fine-beauti', null, 60000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (155, '155', 'DermaNutrix Drink Beauty', 'dermanutrix-drink-beauty', null, 60000, false, 0, null, null, null, null, 'active') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;
insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (156, '156', 'Drink Beauty Hyalucol', 'drink-beauty-hyalucol', null, 60000, false, 0, null, null, null, null, 'draft') on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;

select setval('public.sku_seq', greatest((select max(sku::int) from public.products where sku ~ '^[0-9]+$') + 1, 157), false);

-- Promociones vigentes en el sitio actual (valores a confirmar, Q-02/Q-03)
insert into public.promotions (kind, title, badge_text, payment_method, percent) values ('payment_method_discount', '10 % off pagando con transferencia', '10 % OFF transferencia', 'bank_transfer', 10), ('payment_method_discount', '10 % off pagando con QR', '10 % OFF QR', 'qr', 10);
insert into public.promotions (kind, title, badge_text, installments, min_amount) values ('installments', '6 cuotas sin interés', '6 cuotas sin interés', 6, 0), ('installments', '12 cuotas sin interés desde $150.000', '12 cuotas sin interés', 12, 150000);

-- Ajustes públicos de la tienda
insert into public.store_settings (key, value, is_public) values
  ('social', '{"instagram":"https://www.instagram.com/balancesaludbelleza","tiktok":"https://www.tiktok.com/@balancesaludbelleza","facebook":"https://www.facebook.com/profile.php?id=100037905023515"}', true),
  ('transfer_discount_percent', '10', true),
  ('installments_threshold', '150000', true)
on conflict (key) do nothing;


-- ===== historial de migraciones (para que supabase db push no las repita) =====
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ('20261117000001', 'schema') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261117000002', 'functions') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261117000003', 'rls') on conflict (version) do nothing;

commit;
-- Verificacion: deberia devolver la cantidad de productos cargados
select count(*) as productos from public.products;
