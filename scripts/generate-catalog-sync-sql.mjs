#!/usr/bin/env node
/**
 * Genera supabase/staging-sync-catalogo.sql a partir de apps/web/lib/catalog/fixture.json
 * (la versión depurada del catálogo: marcas, fotos, categorías y preocupaciones corregidas).
 *
 * - Idempotente (upserts por sku/slug) y en una transacción: se puede correr varias veces.
 * - Compacto: los datos viajan en un único bloque JSON y el SQL los expande con jsonb_to_recordset.
 * - Productos que no están en el fixture pasan a borrador (no se borran).
 * - Incluye la configuración base de la tienda (listas de precio, promociones, ajustes públicos).
 *
 *   node scripts/generate-catalog-sync-sql.mjs
 * Aplicar: Supabase MCP execute_sql, `psql -f`, o SQL Editor del dashboard.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = JSON.parse(readFileSync(`${root}apps/web/lib/catalog/fixture.json`, "utf8"));

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const brands = [...new Set(fixture.products.map((p) => p.brand).filter(Boolean))].sort();
const data = {
  categories: fixture.categories.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    sort_order: t.order,
  })),
  concerns: fixture.concerns.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    sort_order: t.order,
  })),
  brands: brands.map((name) => ({ name, slug: slugify(name) })),
  products: fixture.products.map((p, i) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    tagline: p.tagline,
    description: p.description,
    price: p.price,
    compare_at_price: p.compareAtPrice,
    track_stock: p.stock !== null && p.stock !== undefined,
    stock: Math.max(0, p.stock ?? 0),
    requires_prescription: Boolean(p.requiresReview),
    position: i,
    categories: p.categories,
    concerns: p.concerns,
    images: p.images.map((img) => ({ path: img.src, alt: img.alt })),
  })),
};

const json = JSON.stringify(data);
if (json.includes("$bb$")) throw new Error("El JSON contiene el delimitador $bb$");

const sql = `-- Balance Beauty · sincroniza el catálogo de Supabase con la versión depurada del sitio.
-- Generado por scripts/generate-catalog-sync-sql.mjs desde apps/web/lib/catalog/fixture.json. No editar a mano.
-- Idempotente: se puede correr varias veces. ${data.products.length} productos, ${brands.length} marcas.
begin;

create temp table _bb on commit drop as select $bb$${json}$bb$::jsonb as d;

-- Configuración base de la tienda
insert into public.price_lists (code, name) values ('retail', 'Minorista'), ('wholesale', 'Mayorista') on conflict (code) do nothing;
insert into public.promotions (kind, title, badge_text, payment_method, percent, installments, min_amount)
select * from (values
  ('payment_method_discount', '10 % off pagando con transferencia', '10 % OFF transferencia', 'bank_transfer'::public.payment_method, 10::numeric, null::int, 0),
  ('payment_method_discount', '10 % off pagando con QR', '10 % OFF QR', 'qr'::public.payment_method, 10, null, 0),
  ('installments', '6 cuotas sin interés', '6 cuotas sin interés', null, null, 6, 0),
  ('installments', '12 cuotas sin interés desde $150.000', '12 cuotas sin interés', null, null, 12, 150000)
) v(kind, title, badge_text, payment_method, percent, installments, min_amount)
where not exists (select 1 from public.promotions p where p.title = v.title);
insert into public.store_settings (key, value, is_public) values
  ('social', '{"instagram":"https://www.instagram.com/balancesaludbelleza","tiktok":"https://www.tiktok.com/@balancesaludbelleza","facebook":"https://www.facebook.com/profile.php?id=100037905023515"}', true),
  ('transfer_discount_percent', '10', true),
  ('installments_threshold', '150000', true)
on conflict (key) do nothing;

-- Taxonomías y marcas
insert into public.categories (slug, name, description, sort_order)
select slug, name, description, sort_order from _bb, jsonb_to_recordset(d->'categories') as x(slug text, name text, description text, sort_order int)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.concerns (slug, name, description, sort_order)
select slug, name, description, sort_order from _bb, jsonb_to_recordset(d->'concerns') as x(slug text, name text, description text, sort_order int)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.brands (name, slug)
select name, slug from _bb, jsonb_to_recordset(d->'brands') as x(name text, slug text)
on conflict (name) do update set slug = excluded.slug;

-- Productos (el orden del sitio se conserva con created_at)
create temp table _p on commit drop as
select x.* from _bb, jsonb_to_recordset(d->'products') as x(
  sku text, slug text, name text, brand text, tagline text, description text, price int, compare_at_price int,
  track_stock boolean, stock int, requires_prescription boolean, position int,
  categories jsonb, concerns jsonb, images jsonb);

update public.products set status = 'draft' where sku not in (select sku from _p);

insert into public.products (sku, slug, name, brand_id, tagline, description, price, compare_at_price, track_stock, stock, status, requires_prescription, created_at)
select p.sku, p.slug, p.name, b.id, p.tagline, p.description, p.price, p.compare_at_price, p.track_stock, p.stock, 'active', p.requires_prescription,
       now() - make_interval(secs => p.position)
from _p p left join public.brands b on b.name = p.brand
on conflict (sku) do update set slug = excluded.slug, name = excluded.name, brand_id = excluded.brand_id, tagline = excluded.tagline,
  description = excluded.description, price = excluded.price, compare_at_price = excluded.compare_at_price, track_stock = excluded.track_stock,
  stock = greatest(excluded.stock, public.products.reserved_stock), status = 'active',
  requires_prescription = excluded.requires_prescription, created_at = excluded.created_at;

-- Relaciones e imágenes: se reemplazan para los productos sincronizados
delete from public.product_categories where product_id in (select id from public.products where sku in (select sku from _p));
delete from public.product_concerns   where product_id in (select id from public.products where sku in (select sku from _p));
delete from public.product_images     where product_id in (select id from public.products where sku in (select sku from _p));

insert into public.product_categories (product_id, category_id)
select pr.id, c.id from _p p join public.products pr on pr.sku = p.sku
cross join lateral jsonb_array_elements_text(p.categories) as s(slug) join public.categories c on c.slug = s.slug;

insert into public.product_concerns (product_id, concern_id, is_primary)
select pr.id, c.id, s.ord = 1 from _p p join public.products pr on pr.sku = p.sku
cross join lateral jsonb_array_elements_text(p.concerns) with ordinality as s(slug, ord) join public.concerns c on c.slug = s.slug;

-- Rutas "/products/...": las sirve el sitio con variantes AVIF (ADR-009), no Supabase Storage.
insert into public.product_images (product_id, storage_path, alt, sort_order)
select pr.id, i.value->>'path', i.value->>'alt', (i.ord - 1)::int from _p p join public.products pr on pr.sku = p.sku
cross join lateral jsonb_array_elements(p.images) with ordinality as i(value, ord);

commit;

-- Verificación
select count(*) filter (where status = 'active') as activos,
       count(*) filter (where status = 'active' and brand_id is not null) as con_marca,
       (select count(distinct product_id) from public.product_images) as con_foto
from public.products;
`;

writeFileSync(`${root}supabase/staging-sync-catalogo.sql`, sql);
console.log(
  `staging-sync-catalogo.sql: ${data.products.length} productos, ${brands.length} marcas, ${(sql.length / 1024).toFixed(1)} KB`,
);
