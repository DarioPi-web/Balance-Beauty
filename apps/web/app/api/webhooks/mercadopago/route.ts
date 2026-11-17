import { checkMercadoPagoWebhook } from "@/lib/payments/mercadopago-core";
import { isMercadoPagoConfigured, mercadoPago } from "@/lib/payments/mercadopago";
import { handlePaymentUpdate } from "@/lib/orders/payment-events";

/**
 * Webhook de Mercado Pago (ADR‑002):
 * 1) firma HMAC válida (si no → 401)  2) solo pagos  3) re-consulta el pago en MP
 * 4) actualiza el pedido de forma idempotente. Responde rápido: MP reintenta ante errores 5xx.
 */
export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !isMercadoPagoConfigured()) {
    return new Response("Pagos no configurados", { status: 503 });
  }

  const check = checkMercadoPagoWebhook({
    url: new URL(request.url),
    headers: request.headers,
    secret,
  });
  if (!check.ok) {
    console.warn(
      JSON.stringify({
        event: "mp.webhook.rejected",
        reason: check.reason,
        requestId: request.headers.get("x-request-id"),
      }),
    );
    return new Response("Firma inválida", { status: check.status });
  }
  if (check.type !== "payment") {
    return new Response("Ignorado", { status: 200 });
  }

  try {
    const payment = await mercadoPago.getPayment(check.dataId);
    await handlePaymentUpdate("mercadopago", payment);
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(
      JSON.stringify({ event: "mp.webhook.error", dataId: check.dataId, error: String(e) }),
    );
    return new Response("Error temporal", { status: 500 }); // MP reintenta
  }
}
