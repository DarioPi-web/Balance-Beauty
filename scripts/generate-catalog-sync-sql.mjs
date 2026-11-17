#!/usr/bin/env node
/**
 * Genera supabase/staging-sync-catalogo.sql a partir de apps/web/lib/catalog/fixture.json
 * (la versión depurada del catálogo: marcas, fotos, categorías y preocupaciones corregidas).
 * El SQL es idempotente (upserts por sku/slug) y corre en una transacción:
 * se pega en Supabase > SQL Editor. Productos que no están en el fixture pasan a borrador.
 *
 *   node scripts/generate-catalog-sync-sql.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = JSON.parse(readFileSync(`${root}apps/web/lib/catalog/fixture.json`, "utf8"));

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const int = (v) => (v === null || v === undefined ? "null" : String(Math.round(Number(v))));
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const out = [];
const sql = (s) => out.push(s);

sql(
  "-- Balance Beauty · sincroniza el catálogo de Supabase STAGING con la versión depurada del sitio.",
);
sql(
  "-- Generado por scripts/generate-catalog-sync-sql.mjs desde apps/web/lib/catalog/fixture.json. No editar a mano.",
);
sql("-- Pegar todo en Supabase > SQL Editor > New query > Run. Se puede correr varias veces.");
sql("begin;");
sql("");

sql("-- Categorías y preocupaciones");
for (const [table, list] of [
  ["categories", fixture.categories],
  ["concerns", fixture.concerns],
]) {
  for (const t of list) {
    sql(
      `insert into public.${table} (slug, name, description, sort_order) values (${q(t.slug)}, ${q(t.name)}, ${q(t.description)}, ${int(t.order)}) ` +
        `on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;`,
    );
  }
}
sql("");

sql("-- Marcas");
const brands = [...new Set(fixture.products.map((p) => p.brand).filter(Boolean))].sort();
for (const b of brands) {
  sql(
    `insert into public.brands (name, slug) values (${q(b)}, ${q(slugify(b))}) on conflict (name) do update set slug = excluded.slug;`,
  );
}
sql("");

sql("-- Productos que no están en el catálogo depurado: a borrador (no se borran)");
sql(
  `update public.products set status = 'draft' where sku not in (${fixture.products.map((p) => q(p.sku)).join(", ")});`,
);
sql("");

sql("-- Productos (el orden del sitio se conserva con created_at)");
fixture.products.forEach((p, i) => {
  const tracked = p.stock !== null && p.stock !== undefined;
  sql(
    `insert into public.products (sku, slug, name, brand_id, tagline, description, price, compare_at_price, track_stock, stock, status, requires_prescription, created_at) values (` +
      [
        q(p.sku),
        q(p.slug),
        q(p.name),
        p.brand ? `(select id from public.brands where name = ${q(p.brand)})` : "null",
        q(p.tagline),
        q(p.description),
        int(p.price),
        int(p.compareAtPrice),
        tracked ? "true" : "false",
        tracked ? int(Math.max(0, p.stock)) : "0",
        "'active'",
        p.requiresReview ? "true" : "false",
        `now() - interval '${i} seconds'`,
      ].join(", ") +
      `) on conflict (sku) do update set slug = excluded.slug, name = excluded.name, brand_id = excluded.brand_id, tagline = excluded.tagline, ` +
      `description = excluded.description, price = excluded.price, compare_at_price = excluded.compare_at_price, track_stock = excluded.track_stock, ` +
      `stock = greatest(excluded.stock, public.products.reserved_stock), status = 'active', requires_prescription = excluded.requires_prescription, created_at = excluded.created_at;`,
  );
});
sql("");

const skus = fixture.products.map((p) => q(p.sku)).join(", ");
sql("-- Relaciones e imágenes: se reemplazan para los productos sincronizados");
sql(
  `delete from public.product_categories where product_id in (select id from public.products where sku in (${skus}));`,
);
sql(
  `delete from public.product_concerns where product_id in (select id from public.products where sku in (${skus}));`,
);
sql(
  `delete from public.product_images where product_id in (select id from public.products where sku in (${skus}));`,
);
for (const p of fixture.products) {
  const pid = `(select id from public.products where sku = ${q(p.sku)})`;
  for (const c of p.categories) {
    sql(
      `insert into public.product_categories (product_id, category_id) select ${pid}, id from public.categories where slug = ${q(c)};`,
    );
  }
  p.concerns.forEach((c, i) => {
    sql(
      `insert into public.product_concerns (product_id, concern_id, is_primary) select ${pid}, id, ${i === 0} from public.concerns where slug = ${q(c)};`,
    );
  });
  // Rutas relativas (/products/...): las sirve el sitio con sus variantes AVIF (ADR-009), no Storage.
  p.images.forEach((img, i) => {
    sql(
      `insert into public.product_images (product_id, storage_path, alt, sort_order) values (${pid}, ${q(img.src)}, ${q(img.alt)}, ${i});`,
    );
  });
}
sql("");
sql("commit;");
sql("");
sql("-- Verificación: productos activos, con marca y con foto");
sql(
  "select count(*) filter (where status = 'active') as activos, count(*) filter (where status = 'active' and brand_id is not null) as con_marca, " +
    "(select count(distinct product_id) from public.product_images) as con_foto from public.products;",
);

const target = `${root}supabase/staging-sync-catalogo.sql`;
writeFileSync(target, out.join("\n") + "\n");
console.log(
  `staging-sync-catalogo.sql: ${fixture.products.length} productos, ${brands.length} marcas, ` +
    `${fixture.products.filter((p) => p.images.length).length} con foto.`,
);
