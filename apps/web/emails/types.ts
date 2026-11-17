/** Datos que reciben las plantillas de email (sin I/O; se arman en lib/orders/notifications.ts). */
export type EmailOrder = {
  number: number;
  firstName: string;
  items: { name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: "card" | "bank_transfer" | "qr" | "cash_pickup";
  shippingMethod: "home_delivery" | "branch_pickup" | "store_pickup";
  /** Dirección de entrega en una línea (o localidad/CP si es retiro en sucursal). */
  deliveryLine: string;
  /** Link a /checkout/resultado?ref=… (estado del pedido). */
  statusUrl: string;
};

/** Datos bancarios (store_settings, clave "bank_transfer"). */
export type BankDetails = {
  holder: string;
  bank?: string;
  cbu?: string;
  alias?: string;
  cuit?: string;
};
