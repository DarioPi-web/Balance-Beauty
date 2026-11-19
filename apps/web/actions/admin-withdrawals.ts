"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";

/** Marca atendida una solicitud de arrepentimiento (ya se le escribió al cliente). */
export async function handleWithdrawal(fd: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success || fd.get("confirm") !== "on")
    redirect(
      `/admin?error=${encodeURIComponent("Marcá la casilla para confirmar que ya le escribiste")}#arrepentimientos`,
    );
  const { supabase } = await requireAdmin("/admin");
  const { error } = await supabase.rpc("admin_withdrawal_handle", { p_id: id.data });
  if (error) {
    if (error.hint !== "admin")
      console.error(JSON.stringify({ event: "admin.withdrawal.error", code: error.code }));
    redirect(
      `/admin?error=${encodeURIComponent(error.hint === "admin" ? error.message : "No se pudo actualizar")}#arrepentimientos`,
    );
  }
  redirect("/admin?ok=arrepentimiento#arrepentimientos");
}
