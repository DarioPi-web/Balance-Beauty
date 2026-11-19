"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSeller } from "@/lib/seller/server";

/** La vendedora actualiza sus datos de cobro (CBU/alias). Solo los suyos (RPC con auth.uid()). */
export async function updatePayoutInfo(fd: FormData): Promise<void> {
  const parsed = z
    .string()
    .trim()
    .max(300)
    .safeParse(fd.get("payout_info") ?? "");
  if (!parsed.success)
    redirect("/vendedora?error=" + encodeURIComponent("Máximo 300 caracteres") + "#cobro");
  const { supabase } = await requireSeller("/vendedora");
  const { error } = await supabase.rpc("seller_update_payout_info", { p_payout_info: parsed.data });
  if (error) {
    console.error(JSON.stringify({ event: "seller.payout_info.error", code: error.code }));
    redirect(
      "/vendedora?error=" + encodeURIComponent("No se pudo guardar. Probá de nuevo.") + "#cobro",
    );
  }
  redirect("/vendedora?ok=cobro#cobro");
}
