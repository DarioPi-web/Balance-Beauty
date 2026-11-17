// Pre-genera variantes AVIF de las fotos de producto (ADR-009, docs/11 §3).
// Fuente: assets/products/<slug>/<foto>.webp  →  apps/web/public/img/products/<slug>/<foto>-<ancho>.avif
// En producción esto lo hace el worker del VPS al subir una imagen desde el admin.
// Uso: node scripts/optimize-product-images.mjs
import { createRequire } from "node:module";
import { readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, parse } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireFromWeb = createRequire(join(root, "apps/web/package.json"));
const sharp = createRequire(requireFromWeb.resolve("next/package.json"))("sharp");

// Debe coincidir con apps/web/lib/image-loader.ts
export const WIDTHS = [256, 384, 640, 828, 1080];

const src = join(root, "assets/products");
const out = join(root, "apps/web/public/img/products");
let made = 0;
let bytes = 0;

for (const slug of readdirSync(src)) {
  for (const file of readdirSync(join(src, slug))) {
    const { name } = parse(file);
    mkdirSync(join(out, slug), { recursive: true });
    for (const w of WIDTHS) {
      const dest = join(out, slug, `${name}-${w}.avif`);
      if (existsSync(dest)) continue;
      await sharp(join(src, slug, file))
        .resize({ width: w, withoutEnlargement: true })
        .avif({ quality: 52, effort: 6 })
        .toFile(dest);
      made++;
      bytes += statSync(dest).size;
    }
  }
}
console.log(`variantes nuevas: ${made} (${(bytes / 1024).toFixed(0)} KB)`);
