import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { OrderCancelledEmail, orderCancelledSubject } from "@/emails/order-cancelled";
import { OrderShippedEmail, orderShippedSubject } from "@/emails/order-shipped";
import { actionsFor } from "@/lib/orders/labels";
import { toEmailOrder } from "@/lib/orders/email-mapping";

const order = toEmailOrder(
  {
    id: "0b8f2c6e-1111-4c1a-9a2b-123456789abc",
    number: 1001,
    email: "ana@example.com",
    full_name: "Ana Pérez",
    payment_method: "bank_transfer",
    shipping_method: "branch_pickup",
    shipping_address: { city: "Córdoba", province: "Córdoba", postal_code: "5000" },
    subtotal: 25000,
    discount_total: 2500,
    shipping_total: 5500,
    total: 28000,
    order_items: [{ name: "Agua Micelar", quantity: 1, unit_price: 25000 }],
  },
  "https://x",
);

describe("acciones del admin por estado (espejo de admin_order_action)", () => {
  it.each([
    ["pending_payment", ["mark_paid", "cancel"]],
    ["paid", ["prepare", "ship", "cancel"]],
    ["preparing", ["ship", "cancel"]],
    ["shipped", ["deliver"]],
    ["delivered", []],
    ["cancelled", []],
  ] as const)("%s → %j", (status, expected) => {
    expect(actionsFor(status)).toEqual(expected);
  });
});

describe("emails de cambio de estado", () => {
  it("despachado con transportista y seguimiento", async () => {
    const text = await render(
      <OrderShippedEmail order={order} carrier="Correo Argentino" tracking="CA123456789AR" />,
      { plainText: true },
    );
    expect(text).toContain("Correo Argentino");
    expect(text).toContain("CA123456789AR");
    expect(text).toContain("Retiro en sucursal del correo: Córdoba, Córdoba, 5000");
    expect(orderShippedSubject(order)).toBe("Tu pedido #1001 está en camino");
  });

  it("cancelado: distingue si se había pagado", async () => {
    const paid = await render(<OrderCancelledEmail order={order} wasPaid />, { plainText: true });
    const unpaid = await render(<OrderCancelledEmail order={order} wasPaid={false} />, {
      plainText: true,
    });
    expect(paid).toContain("reintegro");
    expect(unpaid).toContain("no se te cobró nada");
    expect(orderCancelledSubject(order)).toBe("Pedido #1001 cancelado");
  });
});
