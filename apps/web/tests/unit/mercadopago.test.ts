import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildPreferenceBody,
  checkMercadoPagoWebhook,
  mapMercadoPagoStatus,
  PREFERENCE_TTL_MINUTES,
} from "@/lib/payments/mercadopago-core";
import type { CheckoutOrder } from "@/lib/payments/types";

const order: CheckoutOrder = {
  id: "0b8f2c6e-1111-4c1a-9a2b-123456789abc",
  number: 1001,
  items: [
    {
      sku: "128",
      slug: "rosatopis-serum",
      name: "ROSATOPIC Serum",
      unitPrice: 32000,
      qty: 2,
      imageUrl: "https://x/img.jpg",
    },
    { sku: "104", slug: "agua-micelar", name: "Agua Micelar", unitPrice: 25000, qty: 1 },
  ],
  shippingTotal: 5000,
  total: 94000,
  payer: { fullName: "Ana Pérez", email: "ana@example.com", dni: "30123456" },
};

describe("buildPreferenceBody", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const body = buildPreferenceBody(order, { siteUrl: "https://balancebeauty.com.ar/", now });

  it("ítems con precios del servidor en ARS + envío como ítem", () => {
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toMatchObject({
      id: "128",
      quantity: 2,
      unit_price: 32000,
      currency_id: "ARS",
    });
    expect(body.items[2]).toMatchObject({ id: "envio", unit_price: 5000 });
    const total = body.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    expect(total).toBe(order.total);
  });

  it("referencia, URLs de regreso, webhook y vencimiento", () => {
    expect(body.external_reference).toBe(order.id);
    expect(body.back_urls.success).toBe(
      `https://balancebeauty.com.ar/checkout/resultado?estado=aprobado&ref=${order.id}`,
    );
    expect(body.notification_url).toBe("https://balancebeauty.com.ar/api/webhooks/mercadopago");
    expect(body.auto_return).toBe("approved");
    expect(new Date(body.expiration_date_to).getTime() - now.getTime()).toBe(
      PREFERENCE_TTL_MINUTES * 60_000,
    );
    expect(body.payer.identification).toEqual({ type: "DNI", number: "30123456" });
  });

  it("cuotas: 6 por debajo de $150.000 y 12 desde ahí", () => {
    expect(body.payment_methods.installments).toBe(6);
    const big = buildPreferenceBody(
      { ...order, items: [{ ...order.items[0], qty: 5 }] },
      { siteUrl: "https://x", now },
    );
    expect(big.payment_methods.installments).toBe(12);
  });
});

describe("mapMercadoPagoStatus", () => {
  it.each([
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["cancelled", "cancelled"],
    ["refunded", "refunded"],
    ["charged_back", "refunded"],
    ["in_process", "in_process"],
    ["pending", "pending"],
    [undefined, "pending"],
  ])("%s → %s", (mp, ours) => {
    expect(mapMercadoPagoStatus(mp)).toBe(ours);
  });
});

describe("checkMercadoPagoWebhook (firma HMAC)", () => {
  const secret = "secreto-de-prueba-de-webhooks-123";
  const dataId = "123456789";
  const requestId = "req-abc";
  const ts = "1795000000";
  const sign = (s = secret) =>
    createHmac("sha256", s).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const url = new URL(`https://x/api/webhooks/mercadopago?data.id=${dataId}&type=payment`);
  const now = () => Number(ts) * 1000 + 10_000;

  it("acepta una firma válida", () => {
    const headers = new Headers({
      "x-signature": `ts=${ts},v1=${sign()}`,
      "x-request-id": requestId,
    });
    expect(checkMercadoPagoWebhook({ url, headers, secret, now })).toEqual({
      ok: true,
      type: "payment",
      dataId,
    });
  });

  it("rechaza firma con otro secreto, sin firma o vencida", () => {
    const forged = new Headers({
      "x-signature": `ts=${ts},v1=${sign("otro")}`,
      "x-request-id": requestId,
    });
    expect(checkMercadoPagoWebhook({ url, headers: forged, secret, now })).toMatchObject({
      ok: false,
      status: 401,
    });

    const missing = new Headers({ "x-request-id": requestId });
    expect(checkMercadoPagoWebhook({ url, headers: missing, secret, now })).toMatchObject({
      ok: false,
      status: 401,
    });

    const valid = new Headers({
      "x-signature": `ts=${ts},v1=${sign()}`,
      "x-request-id": requestId,
    });
    const late = () => Number(ts) * 1000 + 3600_000;
    expect(checkMercadoPagoWebhook({ url, headers: valid, secret, now: late })).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("sin data.id → 400", () => {
    const headers = new Headers({
      "x-signature": `ts=${ts},v1=${sign()}`,
      "x-request-id": requestId,
    });
    expect(
      checkMercadoPagoWebhook({
        url: new URL("https://x/api/webhooks/mercadopago"),
        headers,
        secret,
        now,
      }),
    ).toMatchObject({ ok: false, status: 400 });
  });
});
