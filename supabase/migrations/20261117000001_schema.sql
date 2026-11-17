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
