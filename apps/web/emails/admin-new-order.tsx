import { Text } from "@react-email/components";
import { EmailLayout, OrderTable, StatusButton, styles, Title } from "./components/email-layout";
import type { EmailOrder } from "./types";

const PAGO = {
  card: "Tarjeta (Mercado Pago)",
  bank_transfer: "Transferencia",
  qr: "QR",
  cash_pickup: "Efectivo",
};

/** Aviso interno a la tienda por cada pedido nuevo (EMAIL_ADMIN_NOTIFICATIONS). */
export function AdminNewOrderEmail({
  order,
  customer,
}: {
  order: EmailOrder;
  customer: { name: string; email: string; phone?: string | null };
}) {
  return (
    <EmailLayout preview={`Nuevo pedido #${order.number}`}>
      <Title>Nuevo pedido #{order.number}</Title>
      <Text style={styles.text}>
        {customer.name} · {customer.email}
        {customer.phone ? ` · ${customer.phone}` : ""}
      </Text>
      <Text style={styles.text}>Pago: {PAGO[order.paymentMethod]} · pendiente de acreditación</Text>
      <OrderTable order={order} />
      <StatusButton href={order.statusUrl}>Ver estado</StatusButton>
    </EmailLayout>
  );
}

export const adminNewOrderSubject = (o: EmailOrder) => `Nuevo pedido #${o.number}`;
