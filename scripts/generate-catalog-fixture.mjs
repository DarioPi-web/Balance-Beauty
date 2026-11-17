// Genera el catálogo de desarrollo (apps/web/lib/catalog/fixture.json) y copia las fotos
// identificadas a apps/web/public/products/. Uso: node scripts/generate-catalog-fixture.mjs [carpeta-uploads]
// Se usa mientras no haya Supabase local (Docker). Re-ejecutable.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PHOTOS, BRANDS, RULES, REQUIRES_REVIEW } from "./catalog-mapping.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uploads = process.argv[2]; // carpeta wp-content/uploads del backup (opcional)

function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [h, ...d] = rows;
  return d.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}

const cleanText = (s) =>
  s
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/(rn)+(?=\s)/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n\n")
    .trim();
const isBoilerplate = (s) => /Pagos con tarjeta de Cr[eé]dito/i.test(s);

const categories = [
  ["limpieza", "Limpieza", "Limpiadores, aguas micelares y exfoliantes para empezar tu rutina."],
  ["hidratacion", "Hidratación", "Cremas y brumas que restauran la barrera de la piel."],
  ["proteccion-solar", "Protección solar", "Protectores con y sin color para el uso diario."],
  ["serums", "Serums", "Activos concentrados para cada necesidad."],
  ["despigmentantes", "Despigmentantes", "Tratamientos para manchas y tono desparejo."],
  ["anti-acne", "Anti‑acné", "Fórmulas para piel grasa, granitos y puntos negros."],
  ["contorno-ojos-labios", "Contorno de ojos y labios", "Cuidado específico para zonas delicadas."],
  ["corporal", "Corporal", "Hidratación, celulitis y cuidado del cuerpo."],
  ["nutricosmetica", "Nutricosmética", "Suplementos para la piel desde adentro."],
  ["accesorios", "Accesorios", "Complementos para tu rutina."],
].map(([slug, name, description], i) => ({ slug, name, description, order: i }));

const concerns = [
  ["acne", "Acné", "Granitos, puntos negros y exceso de grasa."],
  ["manchas", "Manchas", "Melasma, manchas por sol y por acné."],
  ["rosacea-sensible", "Rosácea y piel sensible", "Rojeces, ardor y reactividad."],
  ["hidratacion", "Hidratación", "Piel tirante, opaca o deshidratada."],
  ["antiedad", "Antiedad", "Líneas finas, firmeza y luminosidad."],
  ["proteccion-solar", "Protección solar", "Prevención diaria del daño solar."],
  ["ojeras", "Ojeras", "Ojeras vasculares, pigmentadas y bolsas."],
  ["corporal", "Corporal", "Celulitis, sequedad y cuidado del cuerpo."],
  ["intimo", "Íntimo", "Higiene y cuidado de la zona íntima."],
].map(([slug, name, description], i) => ({ slug, name, description, order: i }));

const rows = parseCsv(
  readFileSync(join(root, "supabase/seed/legacy_products.csv"), "utf8").replace(/^﻿/, ""),
);
// Originales (fuente) fuera de public/; las variantes servidas las genera optimize-product-images.mjs
const publicDir = join(root, "assets/products");
let copied = 0;

const products = rows
  .filter((r) => r.status === "active" && Number(r.price_ars) > 0)
  .map((r) => {
    const sku = Number(r.sku);
    const cats = new Set();
    const cons = [];
    for (const rule of RULES) {
      if (rule.re.test(r.name)) {
        if (rule.cat && cats.size === 0) cats.add(rule.cat);
        for (const c of rule.concerns ?? []) if (!cons.includes(c)) cons.push(c);
      }
    }
    if (cats.size === 0) cats.add("serums");

    const images = (PHOTOS[sku] ?? []).map((base, i) => {
      const file = `${base}.webp`;
      if (uploads) {
        const src = join(uploads, "2026", "11", file);
        if (existsSync(src)) {
          mkdirSync(join(publicDir, r.slug), { recursive: true });
          copyFileSync(src, join(publicDir, r.slug, file));
          copied++;
        }
      }
      return {
        src: `/products/${r.slug}/${file}`,
        alt:
          i === 0
            ? `${r.name}${BRANDS[sku] ? ` ${BRANDS[sku]}` : ""}`
            : `${r.name} — foto ${i + 1}`,
      };
    });

    const description = isBoilerplate(r.description) ? "" : cleanText(r.description);
    const firstSentence = description.split(/(?<=[.!?])\s/)[0] ?? "";
    return {
      id: String(r.legacy_id),
      sku: r.sku,
      slug: r.slug,
      name: r.name.trim(),
      brand: BRANDS[sku] ?? null,
      tagline: firstSentence.length > 20 && firstSentence.length < 160 ? firstSentence : null,
      description,
      // En el CSV: price_ars = precio de lista; sale_price_ars = oferta (si existe).
      price: r.sale_price_ars ? Number(r.sale_price_ars) : Number(r.price_ars),
      compareAtPrice: r.sale_price_ars ? Number(r.price_ars) : null,
      stock: r.stock === "" ? null : Number(r.stock),
      inStock: r.stock_status !== "outofstock",
      categories: [...cats],
      concerns: cons,
      images,
      requiresReview: REQUIRES_REVIEW.test(r.name),
    };
  });

const out = { generatedAt: new Date().toISOString().slice(0, 10), categories, concerns, products };
writeFileSync(
  join(root, "apps/web/lib/catalog/fixture.json"),
  JSON.stringify(out, null, 2) + "\n",
  "utf8",
);
console.log(
  `fixture: ${products.length} productos, ${products.filter((p) => p.images.length).length} con foto, ${copied} fotos copiadas`,
);
