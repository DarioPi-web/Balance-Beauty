import { describe, expect, it } from "vitest";
import { toCheckoutOrder } from "@/lib/orders/mapping";
import { buildPreferenceBody } from "@/lib/payments/mercadopago-core";
import {
  checkoutFieldErrors,
  checkoutFromFormData,
  checkoutSchema,
  toPlaceOrderPayload,
} from "@/lib/validation/checkout";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const valid = {
  email: "ana@example.com",
  fullName: "Ana Pérez",
  phone: "11 2345 6789",
  dni: "30.123.456",
  shippingMethod: "home_delivery",
  street: "Av. Santa Fe",
  number: "1234",
  floorApt: "",
  city: "CABA",
  province: "Ciudad Autónoma de Buenos Aires",
  postalCode: "c1425abc",
  notes: "",
  paymentMethod: "bank_transfer",
  acceptTerms: "on",
};

describe("checkoutFromFormData + toPlaceOrderPayload", () => {
  it("arma el JSON de place_order con datos normalizados", () => {
    const parsed = checkoutSchema.parse(checkoutFromFormData(form(valid)));
    const payload = toPlaceOrderPayload(parsed, [{ slug: "agua-micelar", qty: 2 }]);
    expect(payload).toMatchObject({
      email: "ana@example.com",
      dni: "30123456",
      shipping_method: "home_delivery",
      payment_method: "bank_transfer",
      address: { street: "Av. Santa Fe", postal_code: "C1425ABC", floor_apt: null },
      items: [{ slug: "agua-micelar", qty: 2 }],
    });
  });

  it("tarjeta (Mercado Pago) se guarda como 'card'", () => {
    const parsed = checkoutSchema.parse(
      checkoutFromFormData(form({ ...valid, paymentMethod: "mercadopago" })),
    );
    expect(toPlaceOrderPayload(parsed, []).payment_method).toBe("card");
  });

  it("retiro en sucursal no pide calle", () => {
    const rest: Record<string, string> = { ...valid, shippingMethod: "branch_pickup" };
    delete rest.street;
    delete rest.number;
    const r = checkoutSchema.safeParse(checkoutFromFormData(form(rest)));
    expect(r.success).toBe(true);
  });

  it("errores por campo con el nombre del input", () => {
    const r = checkoutSchema.safeParse(
      checkoutFromFormData(form({ ...valid, email: "x", postalCode: "12", acceptTerms: "" })),
    );
    expect(r.success).toBe(false);
    if (r.success) return;
    const errors = checkoutFieldErrors(r.error);
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["email", "postalCode", "acceptTerms"]),
    );
  });
});

describe("toCheckoutOrder", () => {
  const order = {
    number: 1001,
    items: [
      { sku: "104", slug: "agua-micelar", name: "Agua Micelar", unit_price: 25000, qty: 2 },
      { sku: "128", slug: "rosatopis-serum", name: "ROSATOPIC Serum", unit_price: 32000, qty: 1 },
    ],
    shipping_total: 7500,
    discount_total: 0,
    total: 89500,
  };

  it("ítems + envío de la preferencia suman el total cobrado por la base", () => {
    const co = toCheckoutOrder("0b8f2c6e-1111-4c1a-9a2b-123456789abc", order, {
      fullName: "Ana",
      email: "",
    });
    const body = buildPreferenceBody(co, { siteUrl: "https://x" });
    expect(body.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)).toBe(order.total);
    expect(body.payer).not.toHaveProperty("email");
  });

  it("prorratea un descuento y ajusta el redondeo", () => {
    const co = toCheckoutOrder(
      "id",
      { ...order, discount_total: 8201, total: 81299 },
      { fullName: "Ana", email: "a@b.co" },
    );
    const sum = co.items.reduce((s, i) => s + i.unitPrice * i.qty, 0) + co.shippingTotal;
    expect(sum).toBe(81299);
  });
});
