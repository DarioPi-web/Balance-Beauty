import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProviderPayment } from "@/lib/payments/types";
import { UUID_RE } from "./types";

/**
 * Punto único donde un pago verificado actualiza el pedido: RPC confirm_payment
 * (idempotente por provider + provider_payment_id; solo marca "paid" si cubre el total).
 * Requiere SUPABASE_SERVICE_ROLE_KEY (la RPC solo la puede ejecutar service_role).
 */
export async function handlePaymentUpdate(
  provider: "mercadopago",
  payment: ProviderPayment,
): Promise<{ persisted: boolean; orderStatus?: string; reason?: string; changed?: boolean }> {
  const log = {
    event: "payment.update",
    provider,
    paymentId: payment.providerPaymentId,
    status: payment.status,
    orderId: payment.externalReference,
    amount: payment.amount,
  };

  if (!payment.externalReference || !UUID_RE.test(payment.externalReference)) {
    console.warn(JSON.stringify({ ...log, skipped: "sin external_reference válido" }));
    return { persisted: false, reason: "no_reference" };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(JSON.stringify({ ...log, skipped: "falta SUPABASE_SERVICE_ROLE_KEY" }));
    return { persisted: false, reason: "not_configured" };
  }

  const { data, error } = await createSupabaseAdminClient().rpc("confirm_payment", {
    p_order_id: payment.externalReference,
    p_provider: provider,
    p_provider_payment_id: payment.providerPaymentId,
    p_status: payment.status,
    p_amount: payment.amount,
    p_installments: payment.installments ?? undefined,
    p_raw: JSON.parse(JSON.stringify(payment.raw ?? null)),
  });
  if (error) throw error; // el webhook responde 500 y Mercado Pago reintenta

  const result = data as { ok: boolean; order_status?: string; reason?: string; changed?: boolean };
  console.info(JSON.stringify({ ...log, result }));
  return {
    persisted: true,
    orderStatus: result.order_status,
    reason: result.reason,
    changed: Boolean(result.changed),
  };
}
