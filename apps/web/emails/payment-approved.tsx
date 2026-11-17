import { Text } from "@react-email/components";
import { EmailLayout, OrderTable, StatusButton, styles, Title } from "./components/email-layout";
import type { EmailOrder } from "./types";

/** Pago acreditado: el pedido pasa a preparación. */
export function PaymentApprovedEmail({ order }: { order: EmailOrder }) {
  return (
    <EmailLayout preview={`Pago aprobado · pedido #${order.number}`}>
      <Title>¡Listo, {order.firstName}! Tu pago fue aprobado</Title>
      <Text style={styles.text}>
        Ya estamos preparando tu pedido. Te avisamos por email cuando lo despachemos, con el código
        de seguimiento.
      </Text>
      <OrderTable order={order} />
      <StatusButton href={order.statusUrl}>Ver el pedido</StatusButton>
    </EmailLayout>
  );
}

export const paymentApprovedSubject = (o: EmailOrder) => `Pago aprobado · pedido #${o.number}`;
