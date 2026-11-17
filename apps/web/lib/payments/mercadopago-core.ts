/**
 * Lógica pura de Mercado Pago (sin red ni secretos): cuerpo de la preferencia de Checkout Pro,
 * mapeo de estados y validación de la firma del webhook. Testeable sin credenciales.
 */
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { site } from "@/lib/site";
import type { CheckoutOrder, PaymentStatus } from "./types";

/** Minutos que el link de pago queda vigente (coincide con la reserva de stock, docs/03). */
export const PREFERENCE_TTL_MINUTES = 30;

export function buildPreferenceBody(order: CheckoutOrder, opts: { siteUrl: string; now?: Date }) {
  const base = opts.siteUrl.replace(/\/$/, "");
  const now = opts.now ?? new Date();
  const itemsTotal = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const maxInstallments =
    itemsTotal >= site.installments.promoMinAmount
      ? site.installments.promo
      : site.installments.standard;
  const back = (estado: string) =>
    `${base}/checkout/resultado?estado=${estado}&pedido=${order.number}`;

  return {
    items: [
      ...order.items.map((i) => ({
        id: i.sku,
        title: i.name.slice(0, 250),
        quantity: i.qty,
        unit_price: i.unitPrice,
        currency_id: "ARS",
        ...(i.imageUrl ? { picture_url: i.imageUrl } : {}),
      })),
      ...(order.shippingTotal > 0
        ? [
            {
              id: "envio",
              title: "Envío",
              quantity: 1,
              unit_price: order.shippingTotal,
              currency_id: "ARS",
            },
          ]
        : []),
    ],
    payer: {
      name: order.payer.fullName,
      email: order.payer.email,
      ...(order.payer.dni ? { identification: { type: "DNI", number: order.payer.dni } } : {}),
    },
    external_reference: order.id,
    back_urls: {
      success: back("aprobado"),
      pending: back("pendiente"),
      failure: back("rechazado"),
    },
    auto_return: "approved",
    notification_url: `${base}/api/webhooks/mercadopago`,
    statement_descriptor: "BALANCEBEAUTY",
    payment_methods: { installments: maxInstallments },
    expires: true,
    expiration_date_from: now.toISOString(),
    expiration_date_to: new Date(now.getTime() + PREFERENCE_TTL_MINUTES * 60_000).toISOString(),
    metadata: { order_number: order.number },
  };
}

/** Estados de Mercado Pago → estados internos. */
export function mapMercadoPagoStatus(status: string | null | undefined): PaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "in_process":
    case "in_mediation":
      return "in_process";
    default:
      return "pending"; // pending, authorized, desconocidos
  }
}

export type WebhookCheck =
  { ok: true; type: string; dataId: string } | { ok: false; reason: string; status: 400 | 401 };

/**
 * Valida un webhook: firma HMAC (x-signature + x-request-id + data.id) con tolerancia de 5 min.
 * Solo procesamos notificaciones de pagos; el resto se ignora (200).
 */
export function checkMercadoPagoWebhook(input: {
  url: URL;
  headers: Headers;
  secret: string;
  now?: () => number;
}): WebhookCheck {
  const dataId = input.url.searchParams.get("data.id") ?? input.url.searchParams.get("id");
  const type = input.url.searchParams.get("type") ?? input.url.searchParams.get("topic") ?? "";
  if (!dataId) return { ok: false, reason: "falta data.id", status: 400 };
  try {
    WebhookSignatureValidator.validate({
      xSignature: input.headers.get("x-signature"),
      xRequestId: input.headers.get("x-request-id"),
      dataId,
      secret: input.secret,
      toleranceSeconds: 300,
      ...(input.now ? { now: input.now } : {}),
    });
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError)
      return { ok: false, reason: e.reason, status: 401 };
    throw e;
  }
  return { ok: true, type, dataId };
}
