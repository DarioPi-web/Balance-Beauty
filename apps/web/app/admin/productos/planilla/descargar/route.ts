import { requireAdmin } from "@/lib/admin/server";
import { buildProductWorkbook } from "@/lib/admin/product-sheet";
import { loadSheetProducts } from "@/lib/admin/sheet-data";

/** Descarga la planilla Excel con todos los productos (solo admin). */
export async function GET() {
  const { supabase } = await requireAdmin("/admin/productos/planilla");
  const products = await loadSheetProducts(supabase);
  const file = await buildProductWorkbook(products);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="productos-balance-beauty-${today}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
