/**
 * Loader de next/image (ADR-009): las fotos de producto se sirven desde variantes AVIF
 * pre-generadas (scripts/optimize-product-images.mjs; en producción, el worker del VPS).
 * Sin transformación por pedido → sin costo de Image Optimization y sin demora en el LCP.
 */
import { storageShareUrl, storageVariantUrl, VARIANT_WIDTHS as WIDTHS } from "./admin/image-paths";

function pick(width: number) {
  return WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
}

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const m = src.match(/^\/products\/([^/]+)\/([^/]+)\.webp$/);
  if (m) return `/img/products/${m[1]}/${m[2]}-${pick(width)}.avif`;
  // Fotos subidas desde el admin (Supabase Storage): mismas variantes AVIF, generadas al subir.
  const stored = storageVariantUrl(src, width);
  if (stored) return stored;
  // Otros assets estáticos (logo): se sirven tal cual.
  return `${src}?w=${width}`;
}

/**
 * URL pública de una foto para compartir/indexar (sitemap, JSON-LD, Open Graph):
 * JPEG de 1000 px, el formato más compatible con WhatsApp, Facebook y Merchant Center.
 */
export function publicImageUrl(src: string) {
  const m = src.match(/^\/products\/([^/]+)\/([^/]+)\.webp$/);
  return m ? `/img/products/${m[1]}/${m[2]}-share.jpg` : (storageShareUrl(src) ?? src);
}
