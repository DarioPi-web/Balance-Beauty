import { listCategories, listConcerns, listProducts, sortProducts } from "@/lib/catalog";
import imageLoader from "@/lib/image-loader";
import type { SearchDoc } from "@/lib/search";

/**
 * Índice de búsqueda estático (se prerenderiza en el build con Cache Components y se
 * revalida con el tag "catalog"). Lo descarga el diálogo de búsqueda recién al abrirse.
 */
export async function GET() {
  const [products, categories, concerns] = await Promise.all([
    listProducts(),
    listCategories(),
    listConcerns(),
  ]);
  const catName = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const conName = Object.fromEntries(concerns.map((c) => [c.slug, c.name]));

  const docs: SearchDoc[] = sortProducts(products).map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    tagline: p.tagline,
    price: p.price,
    image: p.images[0] ? imageLoader({ src: p.images[0].src, width: 128 }) : null,
    concerns: p.concerns.map((c) => conName[c] ?? c),
    categories: p.categories.map((c) => catName[c] ?? c),
  }));

  return Response.json(docs, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
