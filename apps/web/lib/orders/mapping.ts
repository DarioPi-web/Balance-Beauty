import type { CheckoutOrder } from "@/lib/payments/types";
import type { PlacedOrder } from "./types";

/**
 * Pedido de la base → contrato del proveedor de pagos (puro, testeable).
 * Si hubiera descuento se prorratea en los ítems y el redondeo se ajusta en el primero,
 * para que ítems + envío sumen exactamente el total que cobró la base.
 */
export function toCheckoutOrder(
  id: string,
  order: Pick<PlacedOrder, "number" | "items" | "shipping_total" | "total" | "discount_total">,
  payer: CheckoutOrder["payer"],
): CheckoutOrder {
  const itemsTotal = order.items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const factor = itemsTotal > 0 ? (itemsTotal - order.discount_total) / itemsTotal : 1;
  const items = order.items.map((i) => ({
    sku: i.sku,
    slug: i.slug ?? i.sku,
    name: i.name,
    unitPrice: Math.round(i.unit_price * factor),
    qty: i.qty,
  }));
  const diff =
    order.total - order.shipping_total - items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  if (diff !== 0 && items.length) {
    const first = items[0];
    if (first.qty === 1) first.unitPrice += diff;
    else
      items.push({
        ...first,
        sku: `${first.sku}-ajuste`,
        name: "Ajuste de redondeo",
        unitPrice: diff,
        qty: 1,
      });
  }
  return {
    id,
    number: order.number,
    items,
    shippingTotal: order.shipping_total,
    total: order.total,
    payer,
  };
}
