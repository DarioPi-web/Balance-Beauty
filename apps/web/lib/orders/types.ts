/** Formas de las respuestas de las RPC de pedidos (supabase/migrations/…_orders_rpc.sql). */

export type OrderLine = {
  sku: string;
  slug?: string;
  name: string;
  unit_price: number;
  qty: number;
};

/** place_order → pedido creado con totales calculados en la base. */
export type PlacedOrder = {
  id: string;
  number: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  payment_method: "card" | "bank_transfer" | "qr" | "cash_pickup";
  items: OrderLine[];
};

/** get_order_summary → datos no sensibles para la página de resultado. */
export type OrderSummary = {
  number: number;
  status:
    "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";
  payment_method: PlacedOrder["payment_method"];
  shipping_method: "home_delivery" | "branch_pickup" | "store_pickup";
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  first_name: string;
  created_at: string;
  reserved_until: string | null;
  items: OrderLine[];
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
