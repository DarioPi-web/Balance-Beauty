/** Etiquetas en español para estados y medios (admin, emails, resultado). */
export const ORDER_STATUS_LABEL = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "En preparación",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
} as const;

export const PAYMENT_METHOD_LABEL = {
  card: "Tarjeta (Mercado Pago)",
  bank_transfer: "Transferencia",
  qr: "QR",
  cash_pickup: "Efectivo",
} as const;

export const SHIPPING_METHOD_LABEL = {
  home_delivery: "Envío a domicilio",
  branch_pickup: "Retiro en sucursal del correo",
  store_pickup: "Retiro en el local",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABEL;
export type AdminAction = "mark_paid" | "prepare" | "ship" | "deliver" | "cancel";

/** Acciones válidas según el estado (espejo de admin_order_action en la base). */
export function actionsFor(status: OrderStatus): AdminAction[] {
  switch (status) {
    case "pending_payment":
      return ["mark_paid", "cancel"];
    case "paid":
      return ["prepare", "ship", "cancel"];
    case "preparing":
      return ["ship", "cancel"];
    case "shipped":
      return ["deliver"];
    default:
      return [];
  }
}

export const CARRIERS = ["Correo Argentino", "Andreani", "OCA", "Moto / mensajería"] as const;
