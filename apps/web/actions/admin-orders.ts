"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { loadOrderForEmail, notifyOrderStatus } from "@/lib/orders/notifications";

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["mark_paid", "prepare", "ship", "deliver", "cancel"]),
  carrier: z.string().trim().max(60).optional(),
  tracking: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
  confirm: z.literal("on").optional(),
});

/**
 * Cambia el estado de un pedido (formulario del detalle en /admin). La regla de qué transición
 * es válida vive en la base (admin_order_action); acá se valida la forma y se avisa al cliente.
 */
export async function adminOrderAction(fd: FormData): Promise<void> {
  const str = (k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : undefined);
  const parsed = schema.safeParse({
    id: str("id"),
    action: str("action"),
    carrier: str("carrier"),
    tracking: str("tracking"),
    note: str("note"),
    confirm: str("confirm"),
  });
  const id = str("id") ?? "";
  const back = (q: string) => redirect(`/admin/pedidos/${id}?${q}`);
  if (!parsed.success) back("error=" + encodeURIComponent("Datos inválidos"));
  const d = parsed.data!;
  if (d.action === "cancel" && d.confirm !== "on") {
    back("error=" + encodeURIComponent("Marcá la casilla para confirmar la cancelación"));
  }

  const { supabase } = await requireAdmin(`/admin/pedidos/${id}`);
  const notifies = d.action === "mark_paid" || d.action === "ship" || d.action === "cancel";
  // Se lee ANTES de cambiar el estado: la cancelación necesita saber si ya estaba pagado.
  const order = notifies ? await loadOrderForEmail(supabase, d.id) : null;
  const { error } = await supabase.rpc("admin_order_action", {
    p_order_id: d.id,
    p_action: d.action,
    p_carrier: d.carrier || undefined,
    p_tracking_code: d.tracking || undefined,
    p_note: d.note || undefined,
  });
  if (error) {
    const msg = error.hint === "admin" ? error.message : "No se pudo actualizar el pedido";
    if (error.hint !== "admin")
      console.error(
        JSON.stringify({
          event: "admin.order_action.error",
          code: error.code,
          message: error.message,
        }),
      );
    back("error=" + encodeURIComponent(msg));
  }

  // Email al cliente (pago acreditado, despacho, cancelación) sin demorar la respuesta.
  if (order) {
    const kind = d.action === "mark_paid" ? "paid" : d.action === "ship" ? "shipped" : "cancelled";
    const wasPaid = order.status === "paid" || order.status === "preparing";
    after(() =>
      notifyOrderStatus(kind, order, { carrier: d.carrier, tracking: d.tracking, wasPaid }).catch(
        (e) =>
          console.error(JSON.stringify({ event: "email.order_status.error", error: String(e) })),
      ),
    );
  }
  back("ok=" + d.action);
}
