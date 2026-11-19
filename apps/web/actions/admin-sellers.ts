"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";

/** Admin de vendedoras: alta/edición, códigos de descuento y liquidaciones (migración 17). */
const uuid = z.string().uuid();
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const back = (q: Record<string, string>, anchor?: string) =>
  redirect(`/admin/vendedoras?${new URLSearchParams(q)}${anchor ? `#${anchor}` : ""}`);

function dbError(error: { hint?: string | null; message: string; code?: string }, event: string) {
  if (error.hint !== "admin")
    console.error(JSON.stringify({ event, code: error.code, message: error.message }));
  return error.hint === "admin" ? error.message : "No se pudo guardar. Probá de nuevo.";
}

const percent = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number().min(0, "La comisión va de 0 a 60 %").max(60, "La comisión va de 0 a 60 %"));

const sellerSchema = z.object({
  id: z.union([uuid, z.literal("")]),
  email: z.string().trim().toLowerCase().email("Revisá el email"),
  full_name: z.string().trim().min(3, "Ingresá nombre y apellido").max(120),
  phone: z.string().trim().max(40),
  commission_percent: percent,
  payout_info: z.string().trim().max(300),
  is_active: z.boolean(),
});

export async function saveSeller(fd: FormData): Promise<void> {
  const parsed = sellerSchema.safeParse({
    id: str(fd, "id"),
    email: str(fd, "email"),
    full_name: str(fd, "full_name"),
    phone: str(fd, "phone"),
    commission_percent: str(fd, "commission_percent") || "10",
    payout_info: str(fd, "payout_info"),
    is_active: str(fd, "id") ? fd.get("is_active") === "on" : true,
  });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;
  const { supabase } = await requireAdmin("/admin/vendedoras");
  const { data, error } = await supabase.rpc("admin_save_seller", {
    p_id: d.id || null,
    p_email: d.email,
    p_full_name: d.full_name,
    p_phone: d.phone,
    p_commission_percent: d.commission_percent,
    p_is_active: d.is_active,
    p_payout_info: d.payout_info,
  });
  if (error) back({ error: dbError(error, "admin.seller.save") });
  back({ ok: d.id ? "guardada" : "creada" }, `v-${data}`);
}

const couponSchema = z.object({
  seller_id: uuid,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,20}$/, "El código lleva de 4 a 20 letras, números o guiones"),
  percent: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number().gt(0, "El descuento va de 1 a 50 %").max(50, "El descuento va de 1 a 50 %")),
  min_amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? 0 : Number(v.replace(/\D/g, ""))))
    .pipe(z.number().int().min(0).max(100_000_000)),
  ends_at: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Revisá la fecha"),
  is_active: z.boolean(),
});

export async function saveSellerCoupon(fd: FormData): Promise<void> {
  const parsed = couponSchema.safeParse({
    seller_id: str(fd, "seller_id"),
    code: str(fd, "code"),
    percent: str(fd, "percent"),
    min_amount: str(fd, "min_amount"),
    ends_at: str(fd, "ends_at"),
    is_active: fd.get("is_active") !== "off",
  });
  const anchor = `v-${str(fd, "seller_id")}`;
  if (!parsed.success)
    back({ error: parsed.error.issues[0]?.message ?? "Revisá el código" }, anchor);
  const d = parsed.data!;
  const { supabase } = await requireAdmin("/admin/vendedoras");
  const { error } = await supabase.rpc("admin_save_seller_coupon", {
    p_seller_id: d.seller_id,
    p_code: d.code,
    p_percent: d.percent,
    p_min_amount: d.min_amount,
    // Vence al final del día elegido (hora de Argentina).
    p_ends_at: d.ends_at ? `${d.ends_at}T23:59:59-03:00` : null,
    p_is_active: d.is_active,
  });
  if (error) back({ error: dbError(error, "admin.seller.coupon") }, anchor);
  back({ ok: "codigo" }, anchor);
}

const payoutSchema = z.object({
  seller_id: uuid,
  method: z.string().trim().max(60),
  reference: z.string().trim().max(120),
  confirm: z.literal("on", { message: "Marcá la casilla para confirmar que ya le pagaste" }),
});

export async function createPayout(fd: FormData): Promise<void> {
  const parsed = payoutSchema.safeParse({
    seller_id: str(fd, "seller_id"),
    method: str(fd, "method"),
    reference: str(fd, "reference"),
    confirm: str(fd, "confirm"),
  });
  const anchor = `v-${str(fd, "seller_id")}`;
  if (!parsed.success)
    back({ error: parsed.error.issues[0]?.message ?? "Revisá los datos" }, anchor);
  const d = parsed.data!;
  const { supabase } = await requireAdmin("/admin/vendedoras");
  const { error } = await supabase.rpc("admin_create_payout", {
    p_seller_id: d.seller_id,
    p_method: d.method,
    p_reference: d.reference,
    p_notes: "",
  });
  if (error) back({ error: dbError(error, "admin.seller.payout") }, anchor);
  back({ ok: "liquidacion" }, anchor);
}
