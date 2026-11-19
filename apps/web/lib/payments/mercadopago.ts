import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { buildPreferenceBody, mapMercadoPagoStatus } from "./mercadopago-core";
import { getIntegrationSetting } from "@/lib/settings/integrations";
import type { CheckoutOrder, PaymentProvider, ProviderPayment } from "./types";
import { SITE_URL } from "@/lib/site-url";

/**
 * Adaptador de Mercado Pago (Checkout Pro) sobre el SDK oficial. Solo servidor.
 * Credenciales desde /admin/integraciones (respaldo: variables de entorno).
 */
async function client() {
  const accessToken = await getIntegrationSetting("mercadopago_access_token");
  if (!accessToken) throw new Error("Mercado Pago: falta el Access Token");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
}

export async function isMercadoPagoConfigured() {
  const [token, secret] = await Promise.all([
    getIntegrationSetting("mercadopago_access_token"),
    getIntegrationSetting("mercadopago_webhook_secret"),
  ]);
  return Boolean(token && secret);
}

export const mercadoPago: PaymentProvider = {
  async createCheckout(order: CheckoutOrder) {
    const siteUrl = SITE_URL;
    const pref = await new Preference(await client()).create({
      body: buildPreferenceBody(order, { siteUrl }),
      requestOptions: { idempotencyKey: `pref-${order.id}` },
    });
    const redirectUrl = pref.init_point;
    if (!redirectUrl || !pref.id) throw new Error("Mercado Pago no devolvió init_point");
    return { redirectUrl, providerRef: pref.id };
  },

  async getPayment(id: string): Promise<ProviderPayment> {
    const p = await new Payment(await client()).get({ id });
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
