import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { buildPreferenceBody, mapMercadoPagoStatus } from "./mercadopago-core";
import type { CheckoutOrder, PaymentProvider, ProviderPayment } from "./types";

/** Adaptador de Mercado Pago (Checkout Pro) sobre el SDK oficial. Solo servidor. */
function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
}

export const isMercadoPagoConfigured = () =>
  Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_WEBHOOK_SECRET);

export const mercadoPago: PaymentProvider = {
  async createCheckout(order: CheckoutOrder) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const pref = await new Preference(client()).create({
      body: buildPreferenceBody(order, { siteUrl }),
      requestOptions: { idempotencyKey: `pref-${order.id}` },
    });
    const redirectUrl = pref.init_point;
    if (!redirectUrl || !pref.id) throw new Error("Mercado Pago no devolvió init_point");
    return { redirectUrl, providerRef: pref.id };
  },

  async getPayment(id: string): Promise<ProviderPayment> {
    const p = await new Payment(client()).get({ id });
    return {
      providerPaymentId: String(p.id),
      status: mapMercadoPagoStatus(p.status),
      externalReference: p.external_reference ?? null,
      amount: Math.round(Number(p.transaction_amount ?? 0)),
      installments: p.installments ?? null,
      raw: p,
    };
  },
};
