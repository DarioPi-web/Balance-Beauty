import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CatalogSnapshot, Product, SortKey, Taxon } from "./types";

export type { Product, Taxon, SortKey } from "./types";

/** Tag único del catálogo: el admin llama a revalidateTag(CATALOG_TAG, "max") al editar. */
export const CATALOG_TAG = "catalog";

/**
 * Catálogo completo cacheado (53 productos: cabe entero; filtrar en memoria es más barato
 * que consultar la base por cada página). Fuente según CATALOG_SOURCE.
 */
async function snapshot(): Promise<CatalogSnapshot> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  if (process.env.CATALOG_SOURCE === "supabase") {
    const { loadSupabase } = await import("./source-supabase");
    return loadSupabase();
  }
  const { loadFixture } = await import("./source-fixture");
  return loadFixture();
}

const byOrder = (a: Taxon, b: Taxon) => a.order - b.order;

export async function listCategories() {
  return (await snapshot()).categories.toSorted(byOrder);
}

export async function listConcerns() {
  return (await snapshot()).concerns.toSorted(byOrder);
}

export async function getCategory(slug: string) {
  return (await snapshot()).categories.find((c) => c.slug === slug) ?? null;
}

export async function getConcern(slug: string) {
  return (await snapshot()).concerns.find((c) => c.slug === slug) ?? null;
}

export const brandSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Marcas derivadas de los productos (hasta tener la tabla brands poblada, Q‑25). */
export async function listBrands(): Promise<Taxon[]> {
  const { products } = await snapshot();
  const counts = new Map<string, number>();
  for (const p of products) if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .map(([name], i) => ({
      slug: brandSlug(name),
      name,
      description: `Productos ${name} disponibles en Balance Beauty, con envío a todo el país.`,
      order: i,
    }));
}

export async function getBrand(slug: string) {
  return (await listBrands()).find((b) => b.slug === slug) ?? null;
}

export async function listProducts(filter?: {
  category?: string;
  concern?: string;
  brand?: string;
}) {
  const { products } = await snapshot();
  return products.filter(
    (p) =>
      (!filter?.category || p.categories.includes(filter.category)) &&
      (!filter?.concern || p.concerns.includes(filter.concern)) &&
      (!filter?.brand || (p.brand !== null && brandSlug(p.brand) === filter.brand)),
  );
}

export async function getProduct(slug: string) {
  return (await snapshot()).products.find((p) => p.slug === slug) ?? null;
}

/** Relacionados: misma preocupación principal o categoría; prioriza los que tienen foto. */
export async function relatedProducts(product: Product, limit = 4) {
  const { products } = await snapshot();
  const score = (p: Product) =>
    (p.concerns[0] && p.concerns[0] === product.concerns[0] ? 3 : 0) +
    (p.categories.some((c) => product.categories.includes(c)) ? 2 : 0) +
    (p.images.length ? 1 : 0);
  return products
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({ p, s: score(p) }))
    .filter(({ s }) => s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** Orden por defecto "recomendados": con foto y stock primero. */
export function sortProducts(products: Product[], sort: SortKey = "recomendados") {
  const list = [...products];
  switch (sort) {
    case "precio-asc":
      return list.sort((a, b) => a.price - b.price);
    case "precio-desc":
      return list.sort((a, b) => b.price - a.price);
    case "nombre":
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    default:
      return list.sort(
        (a, b) =>
          Number(b.inStock) - Number(a.inStock) ||
          b.images.length - a.images.length ||
          a.name.localeCompare(b.name, "es"),
      );
  }
}
