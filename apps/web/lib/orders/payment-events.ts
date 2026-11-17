import "server-only";
import type { ProviderPayment } from "@/lib/payments/types";

/**
 * Punto único donde un pago verificado actualiza el pedido.
 * Con Supabase: RPC confirm_payment (idempotente por provider + provider_payment_id, docs/03).
 * HOY (sin base de datos): solo registra el evento. NO marca pedidos como pagos.
 */
export async function handlePaymentUpdate(
  provider: "mercadopago",
  payment: ProviderPayment,
): Promise<{ persisted: boolean }> {
  console.info(
    JSON.stringify({
      event: "payment.update",
      provider,
      paymentId: payment.providerPaymentId,
      status: payment.status,
      orderId: payment.externalReference,
      amount: payment.amount,
    }),
  );
  // TODO(F4, requiere Supabase): createSupabaseAdminClient().rpc("confirm_payment", {...})
  return { persisted: false };
}
