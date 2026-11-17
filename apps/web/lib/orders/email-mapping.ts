import type { EmailOrder } from "@/emails/types";

/** Pedido como sale de la base (place_order + datos del checkout, o select con order_items). */
export type OrderForEmail = {
  id: string;
  number: number;
  email: string;
  full_name: string;
  phone?: string | null;
  payment_method: EmailOrder["paymentMethod"];
  shipping_method: EmailOrder["shippingMethod"];
  shipping_address: Record<string, string | null | undefined> | null;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  order_items: { name: string; quantity: number; unit_price: number }[];
};

/** Base → datos de plantilla (puro, testeable). */
export function toEmailOrder(o: OrderForEmail, siteUrl: string): EmailOrder {
  const a = o.shipping_address ?? {};
  const street = [a.street, a.number].filter(Boolean).join(" ");
  const place = [a.city, a.province, a.postal_code].filter(Boolean).join(", ");
  const deliveryLine = [street, a.floor_apt, place].filter(Boolean).join(" · ");
  return {
    number: o.number,
    firstName: o.full_name.trim().split(/\s+/)[0] ?? "",
    items: o.order_items.map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.unit_price })),
    subtotal: o.subtotal,
    discount: o.discount_total,
    shipping: o.shipping_total,
    total: o.total,
    paymentMethod: o.payment_method,
    shippingMethod: o.shipping_method,
    deliveryLine,
    statusUrl: `${siteUrl.replace(/\/$/, "")}/checkout/resultado?ref=${o.id}`,
  };
}
