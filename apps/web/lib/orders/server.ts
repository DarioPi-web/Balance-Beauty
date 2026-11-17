import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { UUID_RE, type OrderSummary } from "./types";

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Clave que habilita place_order (la base guarda su hash). Sin ella el checkout queda cerrado. */
export const checkoutServerKey = (): string | null => {
  const k = process.env.CHECKOUT_SERVER_KEY;
  return k && k.length >= 32 ? k : null;
};

export type ShippingRate = {
  method: "home_delivery" | "branch_pickup";
  price: number;
  freeFrom: number | null;
  carrier: string | null;
  eta: string | null;
};

/** Tarifas de envío vigentes (lectura pública cacheada; se revalida con el tag "shipping"). */
export async function listShippingRates(): Promise<ShippingRate[]> {
  "use cache";
  cacheTag("shipping");
  cacheLife("hours");
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createSupabasePublicClient()
    .from("shipping_rates")
    .select("method, price, free_from, carrier, eta_days")
    .eq("is_active", true)
    .in("method", ["home_delivery", "branch_pickup"])
    .order("price");
  if (error) throw error;
  const best = new Map<string, ShippingRate>();
  for (const r of data ?? []) {
    if (best.has(r.method)) continue; // la más barata por método (tarifa nacional de respaldo)
    best.set(r.method, {
      method: r.method as ShippingRate["method"],
      price: r.price,
      freeFrom: r.free_from,
      carrier: r.carrier,
      eta: r.eta_days,
    });
  }
  // Envío a domicilio primero: es la opción por defecto del formulario.
  return [...best.values()].sort((a, b) =>
    a.method === "home_delivery" ? -1 : b.method === "home_delivery" ? 1 : 0,
  );
}

/** Resumen público de un pedido por uuid (sin datos personales). */
export async function getOrderSummary(id: string): Promise<OrderSummary | null> {
  if (!UUID_RE.test(id) || !isSupabaseConfigured()) return null;
  const { data, error } = await createSupabasePublicClient().rpc("get_order_summary", {
    p_order_id: id,
  });
  if (error) throw error;
  return (data as OrderSummary | null) ?? null;
}

export { toCheckoutOrder } from "./mapping";
