import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { AdminNewOrderEmail } from "@/emails/admin-new-order";
import { OrderReceivedEmail, orderReceivedSubject } from "@/emails/order-received";
import { PaymentApprovedEmail, paymentApprovedSubject } from "@/emails/payment-approved";
import { toEmailOrder, type OrderForEmail } from "@/lib/orders/email-mapping";
import { formatARS } from "@/lib/pricing";

const base: OrderForEmail = {
  id: "0b8f2c6e-1111-4c1a-9a2b-123456789abc",
  number: 1001,
  email: "ana@example.com",
  full_name: "Ana Pérez",
  phone: "1123456789",
  payment_method: "bank_transfer",
  shipping_method: "home_delivery",
  shipping_address: {
    street: "Av. Santa Fe",
    number: "1234",
    floor_apt: "3B",
    city: "CABA",
    province: "Ciudad Autónoma de Buenos Aires",
    postal_code: "C1425ABC",
  },
  subtotal: 82000,
  discount_total: 8200,
  shipping_total: 7500,
  total: 81300,
  order_items: [
    { name: "Agua Micelar", quantity: 2, unit_price: 25000 },
    { name: "ROSATOPIC Serum", quantity: 1, unit_price: 32000 },
  ],
};

const order = toEmailOrder(base, "https://balancebeauty.com.ar/");

describe("toEmailOrder", () => {
  it("arma nombre, dirección en una línea y link de estado", () => {
    expect(order.firstName).toBe("Ana");
    expect(order.deliveryLine).toBe(
      "Av. Santa Fe 1234 · 3B · CABA, Ciudad Autónoma de Buenos Aires, C1425ABC",
    );
    expect(order.statusUrl).toBe(`https://balancebeauty.com.ar/checkout/resultado?ref=${base.id}`);
  });
});

describe("plantillas de email", () => {
  it("pedido por transferencia: total, número y datos bancarios", async () => {
    const text = await render(
      <OrderReceivedEmail
        order={order}
        bank={{ holder: "Balance SRL", alias: "BALANCE.BEAUTY" }}
      />,
      { plainText: true },
    );
    expect(text).toContain(formatARS(81300));
    expect(text).toContain("#1001");
    expect(text).toContain("BALANCE.BEAUTY");
    expect(text).toContain(`Descuento: −${formatARS(8200)}`);
    expect(orderReceivedSubject(order)).toBe("Pedido #1001: datos para transferir");
  });

  it("sin datos bancarios cargados avisa que se envían después", async () => {
    const text = await render(<OrderReceivedEmail order={order} bank={null} />, {
      plainText: true,
    });
    expect(text).toContain("En breve te enviamos los datos bancarios");
  });

  it("pago aprobado", async () => {
    const html = await render(
      <PaymentApprovedEmail order={{ ...order, paymentMethod: "card", discount: 0 }} />,
    );
    expect(html).toContain("Tu pago fue aprobado");
    expect(html).toContain('lang="es-AR"');
    expect(paymentApprovedSubject(order)).toBe("Pago aprobado · pedido #1001");
  });

  it("aviso a la tienda incluye contacto del cliente", async () => {
    const text = await render(
      <AdminNewOrderEmail
        order={order}
        customer={{ name: "Ana Pérez", email: "ana@example.com", phone: "1123456789" }}
      />,
      { plainText: true },
    );
    expect(text).toContain("ana@example.com");
    expect(text).toContain("Transferencia");
  });
});
