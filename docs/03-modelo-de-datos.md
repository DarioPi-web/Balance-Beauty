# 03 — Modelo de datos (Supabase / Postgres)

Convenciones: `snake_case`, PK `uuid` (`gen_random_uuid()`), `created_at`/`updated_at timestamptz`, montos en **`integer` de pesos** (ARS sin decimales, igual que hoy; si hiciera falta precisión, migrar a centavos `bigint`). Todo en el schema `public` con **RLS habilitado en todas las tablas**.

## Diagrama entidad‑relación (resumen)

```
auth.users 1─1 profiles 1─N addresses
profiles 1─N orders 1─N order_items N─1 products
orders 1─N payments · orders 1─N shipments · orders N─1 coupons
products N─N categories (product_categories) · products N─1 brands
products 1─N product_images · products 1─N product_prices N─1 price_lists
carts 1─N cart_items N─1 products
promotions · banners · faqs · pages · store_settings · shipping_rates · withdrawal_requests · audit_log
```

## Migración inicial (borrador `supabase/migrations/0001_init.sql`)

```sql
-- Extensiones
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pg_cron;

-- unaccent no es IMMUTABLE; wrapper para usarlo en columnas generadas/índices
create or replace function public.unaccent_immutable(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Enums
create type user_role       as enum ('customer','wholesale','admin','staff');
create type product_status  as enum ('draft','active','archived');
create type order_status    as enum ('pending_payment','paid','preparing','shipped','delivered','cancelled','refunded');
create type payment_status  as enum ('pending','approved','rejected','cancelled','refunded','in_process');
create type payment_method  as enum ('card','bank_transfer','qr','cash_pickup');
create type shipping_method as enum ('home_delivery','branch_pickup','store_pickup');

-- Perfiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, phone text, dni text,
  role user_role not null default 'customer',
  wholesale_approved_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  label text, recipient text not null, phone text,
  street text not null, number text not null, floor_apt text,
  city text not null, province text not null, postal_code text not null,
  notes text, is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Catálogo
create table brands (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, logo_path text);
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories,
  name text not null, slug text not null unique, description text,
  image_path text, sort_order int not null default 0, is_visible boolean not null default true
);

create sequence sku_seq start 157;  -- SKUs heredados llegan hasta 156

create table products (
  id uuid primary key default gen_random_uuid(),
  legacy_wp_id bigint unique,
  sku text not null unique default nextval('sku_seq')::text,
  name text not null, slug text not null unique,
  brand_id uuid references brands,
  short_description text, description text,       -- description en Markdown/HTML sanitizado
  how_to_use text, ingredients text, skin_types text[],
  price int not null check (price >= 0),            -- precio de lista ARS
  compare_at_price int check (compare_at_price >= 0),
  price_without_national_taxes int,                 -- Ley 27.743 (o calcular por alícuota)
  track_stock boolean not null default true,
  stock int not null default 0,
  reserved_stock int not null default 0,
  low_stock_threshold int not null default 3,
  weight_g int, length_cm numeric, width_cm numeric, height_cm numeric,
  status product_status not null default 'draft',
  is_featured boolean not null default false,
  requires_prescription boolean not null default false, -- magistrales: ver riesgos R‑04
  seo_title text, seo_description text,
  search tsvector generated always as (
    setweight(to_tsvector('spanish', unaccent_immutable(coalesce(name,''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent_immutable(coalesce(sku,''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent_immutable(coalesce(short_description,''))), 'B') ||
    setweight(to_tsvector('spanish', unaccent_immutable(coalesce(description,''))), 'C')
  ) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_search_idx on products using gin (search);
create index products_name_trgm  on products using gin (name gin_trgm_ops);
create index products_status_idx on products (status);

create table product_categories (product_id uuid references products on delete cascade, category_id uuid references categories on delete cascade, primary key (product_id, category_id));
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  storage_path text not null, alt text, sort_order int not null default 0
);
create table related_products (product_id uuid references products on delete cascade, related_id uuid references products on delete cascade, primary key (product_id, related_id));

-- Listas de precios (minorista / mayorista)
create table price_lists (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, min_order_amount int default 0);
create table product_prices (price_list_id uuid references price_lists on delete cascade, product_id uuid references products on delete cascade, price int not null, primary key (price_list_id, product_id));

-- Carrito
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete set null,
  coupon_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table cart_items (cart_id uuid references carts on delete cascade, product_id uuid references products, quantity int not null check (quantity > 0), primary key (cart_id, product_id));

-- Promociones y cupones
create table promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('installments','payment_method_discount','percent_off','free_shipping')),
  title text not null, badge_text text,
  payment_method payment_method,            -- p. ej. 10% bank_transfer/qr
  percent numeric(5,2), installments int, min_amount int,
  starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true
);
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, percent numeric(5,2), amount int,
  min_amount int, max_uses int, used_count int not null default 0,
  starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true
);

-- Envíos
create table shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone text not null,                     -- CABA, GBA, INTERIOR, o lista de CP
  postal_code_from int, postal_code_to int,
  method shipping_method not null, carrier text,
  price int not null, free_from int, eta_days text, is_active boolean not null default true
);

-- Matriz de tarifas precalculada por el VPS (ADR-014): el checkout lee esto, no llama al VPS
create table shipping_rate_matrix (
  carrier text not null,                   -- correo_argentino | andreani
  service text not null,                   -- domicilio | sucursal
  postal_code int not null,                -- CP representativo o exacto
  weight_bucket_g int not null,            -- 500, 1000, 2000, 5000...
  size_bucket text not null default 'S',   -- S/M/L según volumen
  price int not null, eta_days text,
  refreshed_at timestamptz not null default now(),
  primary key (carrier, service, postal_code, weight_bucket_g, size_bucket)
);
create table pickup_branches (
  carrier text not null, code text not null,
  name text not null, address text, city text, province text, postal_code int,
  lat numeric, lng numeric, hours text, refreshed_at timestamptz default now(),
  primary key (carrier, code)
);
create index pickup_branches_cp_idx on pickup_branches (postal_code);

-- Pedidos
create sequence order_number_seq start 1001;
create table orders (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('order_number_seq'),
  user_id uuid references profiles,
  email text not null, phone text, full_name text not null, dni text,
  status order_status not null default 'pending_payment',
  payment_method payment_method not null,
  shipping_method shipping_method not null,
  shipping_address jsonb,                  -- snapshot
  subtotal int not null, discount_total int not null default 0, shipping_total int not null default 0, total int not null,
  coupon_id uuid references coupons, promotion_ids uuid[],
  customer_note text, admin_note text,
  reserved_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index orders_user_idx on orders (user_id, created_at desc);
create index orders_status_idx on orders (status, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products,
  sku text not null, name text not null,   -- snapshot
  unit_price int not null, quantity int not null check (quantity > 0), line_total int not null
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  provider text not null,                  -- getnet | mercadopago | manual
  provider_payment_id text,
  status payment_status not null default 'pending',
  amount int not null, installments int, raw jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)   -- idempotencia de webhooks
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  carrier text not null, tracking_code text, tracking_url text,
  shipped_at timestamptz, delivered_at timestamptz
);

-- Contenido / CMS liviano
create table banners (id uuid primary key default gen_random_uuid(), title text, desktop_path text not null, mobile_path text not null, href text, sort_order int default 0, starts_at timestamptz, ends_at timestamptz, is_active boolean default true);
create table faqs (id uuid primary key default gen_random_uuid(), question text not null, answer text not null, sort_order int default 0, is_visible boolean default true);
create table pages (slug text primary key, title text not null, body text not null, seo_description text, updated_at timestamptz default now());
create table store_settings (key text primary key, value jsonb not null);  -- whatsapp, cbu/alias, horarios, redes, % transferencia

-- Legal
create table withdrawal_requests (   -- Botón de arrepentimiento
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text),1,8)),
  order_number int, email text not null, full_name text not null, reason text,
  created_at timestamptz not null default now(), handled_at timestamptz
);
create table contact_messages (id uuid primary key default gen_random_uuid(), name text, email text, phone text, message text not null, kind text default 'contact', created_at timestamptz default now());

-- Auditoría
create table audit_log (id bigserial primary key, actor uuid, action text not null, entity text not null, entity_id text, diff jsonb, created_at timestamptz default now());
```

## Inventario por lote (v1.2 · migraciones 15 y 16)

Plan completo en [17](17-plan-catalogo-inventario-y-automatizacion.md) §3.

| Tabla                                      | Para qué                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suppliers`                                | Proveedores (CUIT, contacto, plazo de entrega).                                                                                                                                                     |
| `inventory_lots`                           | Un lote por producto y código: vencimiento, costo, recibido, **en mano**, estado (`available`, `quarantine`, `expired`, `recalled`, `depleted`).                                                    |
| `stock_movements`                          | Libro **inmutable** de cada cambio de stock (recepción, venta, devolución, ajuste, merma, conteo, cuarentena, retiro) con lote, pedido, usuario y motivo. Solo se borra en cascada con el producto. |
| `purchase_orders` / `purchase_order_items` | Órdenes de compra (estructura lista; pantalla en v1.7).                                                                                                                                             |
| `price_history`                            | Cada cambio de precio/tachado (trigger).                                                                                                                                                            |
| `product_regulatory`                       | Datos ANMAT: inscripción, grado, titular, elaborador, país, INCI, PAO, advertencias (lectura pública para productos activos; pantalla en v1.5).                                                     |
| `products` (+)                             | `gtin` (EAN validado), `net_content`/`net_unit`, `supplier_id`, `unit_cost`, `reorder_point`.                                                                                                       |

Reglas:

- `products.stock` sigue siendo el **stock vendible** que leen el catálogo y `place_order`; es la suma de los lotes `available` (vista `inventory_discrepancies` para conciliar).
- Solo cambia por RPC: `admin_inventory_receive`, `admin_inventory_adjust`, `admin_inventory_set_lot_status`; `admin_save_product` ya **no** toca el stock.
- Ventas: trigger en `orders` asigna lotes por **FEFO** al pasar a `paid` y los devuelve a los mismos lotes si un pedido pagado se cancela.
- Job diario (pg_cron 03:05 AR) `private.inventory_expire_lots()`: lotes vencidos salen de la venta.
- El stock previo quedó en un lote `INICIAL` sin vencimiento por producto.

## Funciones (RPC)

| Función                                     | Tipo                                   | Descripción                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_admin()`                                | `security definer stable`              | `exists(select 1 from profiles where id = auth.uid() and role in ('admin','staff'))` — usada en políticas                                                                         |
| `search_products(q text, limit int)`        | `stable`                               | FTS + similitud trigram, solo `status='active'`                                                                                                                                   |
| `place_order(cart_id uuid, checkout jsonb)` | `security definer`                     | Transacción: recalcula precios/promos, bloquea filas de productos, valida stock, incrementa `reserved_stock`, crea `orders`/`order_items`, fija `reserved_until = now() + 30 min` |
| `confirm_payment(order_id, payment jsonb)`  | `security definer` (solo service role) | Idempotente: marca pago, `stock -= qty`, `reserved_stock -= qty`, estado `paid`                                                                                                   |
| `release_expired_reservations()`            | pg_cron cada 5 min                     | Pedidos `pending_payment` vencidos → `cancelled`, libera reservas (excepto transferencias, que tienen 48 h)                                                                       |
| `handle_new_user()`                         | trigger en `auth.users`                | Crea `profiles`                                                                                                                                                                   |
| `custom_access_token_hook`                  | Auth hook                              | Agrega `user_role` al JWT                                                                                                                                                         |
| `set_updated_at()`                          | trigger                                | Mantiene `updated_at`                                                                                                                                                             |

## Políticas RLS (resumen)

| Tabla                                                                                                                                          | anon                                                                                 | authenticated                                   | admin                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| products, categories, brands, product_images, banners, faqs, pages, promotions(activas), shipping_rates, shipping_rate_matrix, pickup_branches | `select` donde `status='active'`/`is_visible` (matriz y sucursales: lectura pública) | idem                                            | todo (el VPS escribe matriz/sucursales con su secret key dedicada) |
| product_prices                                                                                                                                 | —                                                                                    | `select` si `role='wholesale'` aprobado         | todo                                                               |
| profiles, addresses                                                                                                                            | —                                                                                    | solo `id = auth.uid()` / `user_id = auth.uid()` | todo                                                               |
| carts, cart_items                                                                                                                              | vía Server Action con service role + cookie firmada                                  | propios                                         | todo                                                               |
| orders, order_items, payments, shipments                                                                                                       | —                                                                                    | `select` propios                                | todo                                                               |
| withdrawal_requests, contact_messages                                                                                                          | `insert` (con Turnstile validado en servidor)                                        | `insert`                                        | todo                                                               |
| store_settings                                                                                                                                 | `select` de claves públicas                                                          | idem                                            | todo                                                               |
| audit_log, coupons                                                                                                                             | —                                                                                    | —                                               | todo                                                               |

Regla: `using (is_admin())` para el bloque admin; nunca `using (true)` en tablas con datos personales.

## Storage

| Bucket           | Público      | Uso                                                              |
| ---------------- | ------------ | ---------------------------------------------------------------- |
| `product-images` | sí (lectura) | `products/<product_id>/<uuid>.webp`                              |
| `banners`        | sí           | Banners home desktop/mobile                                      |
| `media`          | sí           | Video home, logos                                                |
| `private`        | no           | Comprobantes de transferencia subidos por clientes (signed URLs) |

Escritura en buckets públicos solo por admin (política `storage.objects` con `is_admin()`).

## Tipos

`pnpm supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts` en cada migración (script `db:types`).
