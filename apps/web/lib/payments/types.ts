/** Contrato de pagos (ADR‑002). Hoy: Mercado Pago Checkout Pro. */

export type CheckoutItem = {
  sku: string;
  slug: string;
  name: string;
  unitPrice: number; // ARS enteros, recalculado en el servidor
  qty: number;
  imageUrl?: string | null; // absoluta (JPEG para compartir)
};

export type CheckoutOrder = {
  id: string; // uuid del pedido (idempotencia)
  number: number; // número visible (#1001…)
  items: CheckoutItem[];
  shippingTotal: number;
  total: number;
  payer: { fullName: string; email: string; phone?: string; dni?: string };
};

/** Estados internos (enum payment_status de la base). */
export type PaymentStatus =
  "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "in_process";

export type ProviderPayment = {
  providerPaymentId: string;
  status: PaymentStatus;
  externalReference: string | null; // = order.id
  amount: number;
  installments: number | null;
  raw: unknown;
};

export interface PaymentProvider {
  /** Crea el checkout y devuelve la URL a la que se redirige al comprador. */
  createCheckout(order: CheckoutOrder): Promise<{ redirectUrl: string; providerRef: string }>;
  /** Re-consulta el pago en el proveedor (nunca confiar solo en el cuerpo del webhook). */
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
}
