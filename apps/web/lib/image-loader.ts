/**
 * Loader de next/image (ADR-009): las fotos de producto se sirven desde variantes AVIF
 * pre-generadas (scripts/optimize-product-images.mjs; en producción, el worker del VPS).
 * Sin transformación por pedido → sin costo de Image Optimization y sin demora en el LCP.
 */
const WIDTHS = [256, 384, 640, 828, 1080] as const;

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
  // Otros assets estáticos (logo): se sirven tal cual.
  return `${src}?w=${width}`;
}
