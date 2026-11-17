"use server";

import { redirect } from "next/navigation";
import { readCartLines, writeCartLines } from "@/lib/cart/server";
import { getOrderSummary, isSupabaseConfigured, toCheckoutOrder } from "@/lib/orders/server";
import type { PlacedOrder } from "@/lib/orders/types";
import { isMercadoPagoConfigured, mercadoPago } from "@/lib/payments/mercadopago";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkoutFieldErrors,
  checkoutFromFormData,
  checkoutSchema,
  toPlaceOrderPayload,
} from "@/lib/validation/checkout";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Lo que escribió el comprador, para no perderlo si hay errores. */
  values?: Record<string, string>;
};

const resultUrl = (id: string, estado?: string) =>
  `/checkout/resultado?ref=${id}${estado ? `&estado=${estado}` : ""}`;

/**
 * Crea el pedido. Valida con Zod, recalcula todo en la base (place_order) y, si el pago es con
 * Mercado Pago, redirige a Checkout Pro. Nunca usa precios ni totales que vengan del cliente.
 */
export async function placeOrder(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;

  const parsed = checkoutSchema.safeParse(checkoutFromFormData(fd));
  if (!parsed.success) {
    return {
      error: "Revisá los datos marcados.",
      fieldErrors: checkoutFieldErrors(parsed.error),
      values,
    };
  }
  if (!isSupabaseConfigured()) {
    return { error: "El checkout no está disponible en este entorno.", values };
  }
  if (parsed.data.paymentMethod === "mercadopago" && !isMercadoPagoConfigured()) {
    return {
      error: "El pago con tarjeta todavía no está habilitado. Elegí transferencia bancaria.",
      fieldErrors: { paymentMethod: "Por ahora solo transferencia" },
      values,
    };
  }

  const lines = await readCartLines();
  if (lines.length === 0) return { error: "Tu carrito está vacío.", values };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_checkout: toPlaceOrderPayload(parsed.data, lines),
  });
  if (error) {
    if (error.hint === "checkout") return { error: error.message, values };
    console.error(
      JSON.stringify({
        event: "checkout.place_order.error",
        code: error.code,
        message: error.message,
      }),
    );
    return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.", values };
  }

  const order = data as unknown as PlacedOrder;
  await writeCartLines([]);

  let target = resultUrl(order.id);
  if (parsed.data.paymentMethod === "mercadopago") {
    try {
      const { redirectUrl } = await mercadoPago.createCheckout(
        toCheckoutOrder(order.id, order, {
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          dni: parsed.data.dni,
        }),
      );
      target = redirectUrl;
    } catch (e) {
      console.error(
        JSON.stringify({ event: "checkout.mp.error", order: order.number, error: String(e) }),
      );
      target = resultUrl(order.id, "error-pago");
    }
  }
  redirect(target);
}

/** Genera un nuevo link de pago para un pedido con tarjeta que todavía no se pagó. */
export async function retryPayment(fd: FormData): Promise<void> {
  const ref = String(fd.get("ref") ?? "");
  const summary = await getOrderSummary(ref);
  if (!summary || summary.status !== "pending_payment" || summary.payment_method !== "card") {
    redirect(resultUrl(ref));
  }
  if (!isMercadoPagoConfigured()) redirect(resultUrl(ref, "error-pago"));

  let target: string;
  try {
    const { redirectUrl } = await mercadoPago.createCheckout(
      toCheckoutOrder(ref, summary, { fullName: summary.first_name, email: "" }),
    );
    target = redirectUrl;
  } catch (e) {
    console.error(
      JSON.stringify({ event: "checkout.mp.retry.error", order: summary.number, error: String(e) }),
    );
    target = resultUrl(ref, "error-pago");
  }
  redirect(target);
}
