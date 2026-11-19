"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { CATALOG_TAG } from "@/lib/catalog";

/**
 * Inventario por lote (v1.2): el stock cambia solo por estas acciones, siempre con lote o
 * motivo, y cada cambio queda en el libro de movimientos (migraciones 15/16).
 */
const uuid = z.string().uuid();
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const back = (id: string, q: Record<string, string>) =>
  redirect(`/admin/productos/${id}?${new URLSearchParams(q)}#inventario`);

function fail(
  id: string,
  error: { hint?: string | null; message: string; code?: string },
  event: string,
): never {
  if (error.hint !== "admin")
    console.error(JSON.stringify({ event, code: error.code, message: error.message }));
  return back(id, {
    error: error.hint === "admin" ? error.message : "No se pudo registrar. Probá de nuevo.",
  });
}

const receiveSchema = z.object({
  qty: z.coerce.number().int().min(1, "La cantidad tiene que ser mayor a cero").max(100_000),
  lot: z.string().trim().min(1, "Indicá el número de lote").max(40),
  expires: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}(-\d{2})?$/.test(v), "Revisá el vencimiento"),
  cost: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,9}$/.test(v), "El costo va en pesos, sin decimales"),
  note: z.string().trim().max(200),
});

/** Vencimiento "AAAA-MM" (como viene en el envase) → último día de ese mes. */
function expiryDate(v: string): string | undefined {
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const [y, m] = v.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${v}-${String(last).padStart(2, "0")}`;
}

export async function receiveStock(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/productos");
  const parsed = receiveSchema.safeParse({
    qty: str(fd, "qty"),
    lot: str(fd, "lot"),
    expires: str(fd, "expires"),
    cost: str(fd, "cost"),
    note: str(fd, "note"),
  });
  if (!parsed.success) back(id, { error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;
  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { error } = await supabase.rpc("admin_inventory_receive", {
    p_product_id: id,
    p_qty: d.qty,
    p_lot_code: d.lot,
    p_expires_on: expiryDate(d.expires),
    p_unit_cost: d.cost ? Number(d.cost) : undefined,
    p_note: d.note || undefined,
  });
  if (error) fail(id, error, "admin.inventory.receive");
  updateTag(CATALOG_TAG);
  back(id, { ok: "recibido" });
}

const adjustSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "El ajuste no puede ser cero")
    .refine((n) => Math.abs(n) <= 100_000, "Revisá la cantidad"),
  kind: z.enum(["waste", "count", "adjustment"]),
  reason: z.string().trim().min(3, "Contá el motivo (ej.: “frasco roto”)").max(200),
  lot_id: z.union([uuid, z.literal("")]),
});

export async function adjustStock(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/productos");
  const sign = str(fd, "direction") === "in" ? 1 : -1;
  const parsed = adjustSchema.safeParse({
    delta: String(sign * Math.abs(Number(str(fd, "qty") || 0))),
    kind: str(fd, "kind"),
    reason: str(fd, "reason"),
    lot_id: str(fd, "lot_id"),
  });
  if (!parsed.success) back(id, { error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;
  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { error } = await supabase.rpc("admin_inventory_adjust", {
    p_product_id: id,
    p_delta: d.delta,
    p_kind: d.kind,
    p_reason: d.reason,
    p_lot_id: d.lot_id || undefined,
  });
  if (error) fail(id, error, "admin.inventory.adjust");
  updateTag(CATALOG_TAG);
  back(id, { ok: "ajustado" });
}

const lotStatusSchema = z.object({
  lot_id: uuid,
  status: z.enum(["available", "quarantine", "recalled"]),
  reason: z.string().trim().min(3, "Contá el motivo").max(200),
});

export async function setLotStatus(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/productos");
  const parsed = lotStatusSchema.safeParse({
    lot_id: str(fd, "lot_id"),
    status: str(fd, "status"),
    reason: str(fd, "reason"),
  });
  if (!parsed.success) back(id, { error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;
  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { error } = await supabase.rpc("admin_inventory_set_lot_status", {
    p_lot_id: d.lot_id,
    p_status: d.status,
    p_reason: d.reason,
  });
  if (error) fail(id, error, "admin.inventory.lot_status");
  updateTag(CATALOG_TAG);
  back(id, { ok: "lote" });
}
