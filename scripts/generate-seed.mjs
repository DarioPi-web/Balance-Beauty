// Genera supabase/seed.sql a partir del catálogo exportado de WooCommerce.
// Uso: pnpm seed:generate   (re-ejecutable; no requiere dependencias)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = join(root, "supabase", "seed", "legacy_products.csv");
const outPath = join(root, "supabase", "seed.sql");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}

const q = (v) =>
  v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const int = (v) =>
  v === "" || v === null || v === undefined || Number.isNaN(Number(v))
    ? "null"
    : String(Math.round(Number(v)));

// El texto repetido de medios de pago no es descripción de producto (docs/09 §2).
const isPaymentBoilerplate = (s) => /Pagos con tarjeta de Cr[eé]dito/i.test(s);
// El export de WP dejó saltos de línea como "rn" literales pegados al texto ("día.rn Un…").
const cleanText = (s) =>
  s
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/(rn)+(?=\s)/g, "\n")
    .replace(/\s+n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n\n")
    .trim();

const products = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));

const lines = [];
lines.push("-- GENERADO por scripts/generate-seed.mjs — no editar a mano.");
lines.push(
  "-- Catálogo heredado de WooCommerce (backup 2026-06-28). Re-exportar del sitio en vivo antes del go-live.",
);
lines.push("begin;");
lines.push("");
lines.push(
  "insert into public.price_lists (code, name) values ('retail', 'Minorista'), ('wholesale', 'Mayorista') on conflict (code) do nothing;",
);
lines.push("");
lines.push("-- Categorías propuestas (validar con cliente, Q-07)");
const categories = [
  ["Limpieza", "limpieza"],
  ["Hidratación", "hidratacion"],
  ["Protección solar", "proteccion-solar"],
  ["Serums", "serums"],
  ["Despigmentantes", "despigmentantes"],
  ["Anti-acné", "anti-acne"],
  ["Contorno de ojos y labios", "contorno-ojos-labios"],
  ["Corporal", "corporal"],
  ["Nutricosmética", "nutricosmetica"],
  ["Accesorios", "accesorios"],
];
lines.push("insert into public.categories (name, slug, sort_order) values");
lines.push(
  categories.map(([n, s], i) => `  (${q(n)}, ${q(s)}, ${i})`).join(",\n") +
    "\non conflict (slug) do nothing;",
);
lines.push("");
lines.push("-- Preocupaciones de la piel (docs/14 §3)");
const concerns = [
  ["Acné", "acne"],
  ["Manchas", "manchas"],
  ["Rosácea y piel sensible", "rosacea-sensible"],
  ["Hidratación", "hidratacion"],
  ["Antiedad", "antiedad"],
  ["Protección solar", "proteccion-solar"],
  ["Ojeras", "ojeras"],
  ["Corporal", "corporal"],
  ["Íntimo", "intimo"],
];
lines.push("insert into public.concerns (name, slug, sort_order) values");
lines.push(
  concerns.map(([n, s], i) => `  (${q(n)}, ${q(s)}, ${i})`).join(",\n") +
    "\non conflict (slug) do nothing;",
);
lines.push("");
lines.push("-- Productos");
let draftCount = 0;
for (const p of products) {
  const price = int(p.price_ars);
  const missingPrice = price === "null";
  const description = isPaymentBoilerplate(p.description) ? "" : cleanText(p.description);
  // Sin precio o sin imagen → borrador hasta completar contenido (Q-08).
  const status = p.status === "active" && !missingPrice && p.image_path ? "active" : "draft";
  if (status === "draft") draftCount++;
  const weightG = p.weight_kg ? int(Number(p.weight_kg) * 1000) : "null";
  const stock = p.stock === "" ? (p.stock_status === "instock" ? "0" : "0") : int(p.stock);
  lines.push(
    `insert into public.products (legacy_wp_id, sku, name, slug, description, price, track_stock, stock, weight_g, length_cm, width_cm, height_cm, status) values (` +
      [
        int(p.legacy_id),
        q(p.sku),
        q(p.name),
        q(p.slug),
        q(description),
        missingPrice ? "0" : price,
        p.manage_stock === "yes" ? "true" : "false",
        stock,
        weightG,
        p.length_cm || "null",
        p.width_cm || "null",
        p.height_cm || "null",
        `'${status}'`,
      ].join(", ") +
      `) on conflict (legacy_wp_id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, status = excluded.status;`,
  );
}
lines.push("");
lines.push(
  "select setval('public.sku_seq', greatest((select max(sku::int) from public.products where sku ~ '^[0-9]+$') + 1, 157), false);",
);
lines.push("");
lines.push("-- Promociones vigentes en el sitio actual (valores a confirmar, Q-02/Q-03)");
lines.push(
  "insert into public.promotions (kind, title, badge_text, payment_method, percent) values ('payment_method_discount', '10 % off pagando con transferencia', '10 % OFF transferencia', 'bank_transfer', 10), ('payment_method_discount', '10 % off pagando con QR', '10 % OFF QR', 'qr', 10);",
);
lines.push(
  "insert into public.promotions (kind, title, badge_text, installments, min_amount) values ('installments', '6 cuotas sin interés', '6 cuotas sin interés', 6, 0), ('installments', '12 cuotas sin interés desde $150.000', '12 cuotas sin interés', 12, 150000);",
);
lines.push("");
lines.push("-- Ajustes públicos de la tienda");
lines.push(`insert into public.store_settings (key, value, is_public) values
  ('social', '{"instagram":"https://www.instagram.com/balancesaludbelleza","tiktok":"https://www.tiktok.com/@balancesaludbelleza","facebook":"https://www.facebook.com/profile.php?id=100037905023515"}', true),
  ('transfer_discount_percent', '10', true),
  ('installments_threshold', '150000', true)
on conflict (key) do nothing;`);
lines.push("");
lines.push("commit;");

writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(
  `seed.sql generado: ${products.length} productos (${draftCount} en borrador por falta de precio/imagen).`,
);
