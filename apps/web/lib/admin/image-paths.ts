/**
 * Rutas de las fotos subidas desde el admin al bucket "product-images" (migración 10).
 * Por cada foto: <slug>/<id>.avif (maestra, 1600 px) + <slug>/<id>-<ancho>.avif para cada
 * ancho que usa el loader (ADR-009) + <slug>/<id>-share.jpg para compartir/indexar.
 * Puro (sin dependencias): lo usan el loader de imágenes, las acciones y los tests.
 */
export const VARIANT_WIDTHS = [256, 384, 640, 828, 1080] as const;
export const MASTER_WIDTH = 1600;
export const SHARE_WIDTH = 1000;
export const BUCKET = "product-images";

export function imageKeys(slug: string, id: string) {
  const base = `${slug}/${id}`;
  return {
    master: `${base}.avif`,
    variants: VARIANT_WIDTHS.map((w) => ({ width: w, key: `${base}-${w}.avif` })),
    share: `${base}-share.jpg`,
  };
}

/** Todas las claves de una foto a partir de su storage_path (para borrarla). */
export function keysFromStoragePath(storagePath: string): string[] | null {
  const m = storagePath.match(/^([a-z0-9-]+)\/([a-z0-9-]+)\.avif$/);
  if (!m) return null;
  const k = imageKeys(m[1], m[2]);
  return [k.master, ...k.variants.map((v) => v.key), k.share];
}

/** URL de una foto a partir de storage_path ("/products/…" = archivo del sitio; si no, bucket). */
export function imageSrc(storagePath: string): string {
  return storagePath.startsWith("/")
    ? storagePath
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

const STORAGE_RE =
  /^(.*\/storage\/v1\/object\/public\/product-images\/[a-z0-9-]+\/[a-z0-9-]+)\.avif$/;

/** URL de la variante más chica que cubre `width`, o null si no es una foto del bucket. */
export function storageVariantUrl(src: string, width: number): string | null {
  const m = src.match(STORAGE_RE);
  if (!m) return null;
  const w = VARIANT_WIDTHS.find((v) => v >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
  return `${m[1]}-${w}.avif`;
}

export function storageShareUrl(src: string): string | null {
  const m = src.match(STORAGE_RE);
  return m ? `${m[1]}-share.jpg` : null;
}
