"use server";

import { z } from "zod";
import { readCart } from "@/lib/cart/server";
import { checkoutServerKey, isSupabaseConfigured } from "@/lib/orders/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type CouponResult =
  | { ok: true; code: string; discount: number; percent: number | null }
  | { ok: false; error: string };

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "Revisá el código");

/**
 * Vista previa del código de descuento en el checkout. El subtotal sale del carrito (cookie
 * firmada) en el servidor, nunca del navegador. El descuento definitivo lo calcula place_order.
 */
export async function checkCoupon(raw: string): Promise<CouponResult> {
  const parsed = code.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisá el código (letras, números o guiones)." };
  const serverKey = checkoutServerKey();
  if (!isSupabaseConfigured() || !serverKey)
    return { ok: false, error: "No disponible por ahora." };
  const cart = await readCart();
  if (!cart.items.length) return { ok: false, error: "Tu carrito está vacío." };

  const { data, error } = await createSupabasePublicClient().rpc("check_coupon", {
    p_server_key: serverKey,
    p_code: parsed.data,
    p_subtotal: cart.subtotal,
  });
  if (error || !data) {
    if (error?.hint !== "checkout")
      console.error(JSON.stringify({ event: "coupon.check.error", code: error?.code }));
    return {
      ok: false,
      error:
        error?.hint === "checkout"
          ? error.message
          : "No pudimos validar el código. Probá de nuevo.",
    };
  }
  const d = data as { code: string; discount: number; percent: number | null };
  return {
    ok: true,
    code: d.code,
    discount: d.discount,
    percent: d.percent === null ? null : Number(d.percent),
  };
}
