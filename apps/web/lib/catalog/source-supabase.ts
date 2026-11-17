import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { CatalogSnapshot, Product, Taxon } from "./types";

/**
 * Fuente de producción: Supabase (lectura anónima con RLS: solo productos activos).
 * Una sola consulta con relaciones embebidas por entidad (docs/11 §4: sin N+1, sin select *).
 * NOTA: se activa con CATALOG_SOURCE=supabase; probar contra Supabase local cuando haya Docker.
 */
export async function loadSupabase(): Promise<CatalogSnapshot> {
  const db = createSupabasePublicClient();

  const [cats, cons, prods] = await Promise.all([
    db.from("categories").select("slug, name, description, sort_order").order("sort_order"),
    db.from("concerns").select("slug, name, description, sort_order").order("sort_order"),
    db
      .from("products")
      .select(
        `id, sku, slug, name, tagline, description, price, compare_at_price, stock, reserved_stock,
         track_stock, requires_prescription,
         brand:brands(name),
         product_categories(category:categories(slug)),
         product_concerns(is_primary, concern:concerns(slug)),
         product_images(storage_path, alt, sort_order)`,
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  for (const r of [cats, cons, prods]) if (r.error) throw r.error;

  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  type Row = Record<string, unknown> & {
    product_images?: { storage_path: string; alt: string | null; sort_order: number }[];
    product_categories?: { category: { slug: string } | null }[];
    product_concerns?: { is_primary: boolean; concern: { slug: string } | null }[];
    brand?: { name: string } | null;
  };

  const toTaxon = (t: Record<string, unknown>): Taxon => ({
    slug: String(t.slug),
    name: String(t.name),
    description: (t.description as string) ?? "",
    order: Number(t.sort_order ?? 0),
  });

  // Hasta generar los tipos reales (pnpm db:types), supabase-js infiere las relaciones como arrays.
  const products: Product[] = ((prods.data ?? []) as unknown as Row[]).map((p) => {
    const available = Number(p.stock ?? 0) - Number(p.reserved_stock ?? 0);
    return {
      id: String(p.id),
      sku: String(p.sku),
      slug: String(p.slug),
      name: String(p.name),
      brand: p.brand?.name ?? null,
      tagline: (p.tagline as string) ?? null,
      description: (p.description as string) ?? "",
      price: Number(p.price),
      compareAtPrice: (p.compare_at_price as number) ?? null,
      stock: p.track_stock ? available : null,
      inStock: !p.track_stock || available > 0,
      categories: (p.product_categories ?? []).flatMap((c) =>
        c.category ? [c.category.slug] : [],
      ),
      concerns: (p.product_concerns ?? [])
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
        .flatMap((c) => (c.concern ? [c.concern.slug] : [])),
      images: (p.product_images ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ src: storage + i.storage_path, alt: i.alt ?? String(p.name) })),
      requiresReview: Boolean(p.requires_prescription),
    };
  });

  return {
    categories: (cats.data ?? []).map(toTaxon),
    concerns: (cons.data ?? []).map(toTaxon),
    products,
  };
}
