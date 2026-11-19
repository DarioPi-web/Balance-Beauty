import "server-only";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "./product-sheet-core";

/** Productos tal como van en la planilla (todos, incluidos borradores y archivados). */
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function loadSheetProducts(supabase: Client): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "sku, name, status, price, compare_at_price, stock, track_stock, low_stock_threshold, weight_g, length_cm, width_cm, height_cm, tagline, seller_commission_percent, brand:brands(name)",
    )
    .order("name")
    .limit(2000);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    sku: p.sku,
    name: p.name,
    brand: (p.brand as { name: string } | null)?.name ?? null,
    status: p.status,
    price: p.price,
    compare_at_price: p.compare_at_price,
    stock: p.track_stock ? p.stock : null,
    low_stock_threshold: p.low_stock_threshold,
    weight_g: p.weight_g,
    length_cm: p.length_cm === null ? null : Number(p.length_cm),
    width_cm: p.width_cm === null ? null : Number(p.width_cm),
    height_cm: p.height_cm === null ? null : Number(p.height_cm),
    tagline: p.tagline,
    seller_commission_percent:
      p.seller_commission_percent === null ? null : Number(p.seller_commission_percent),
  }));
}
