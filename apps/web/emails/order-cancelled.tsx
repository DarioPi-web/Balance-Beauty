import { Text } from "@react-email/components";
import { EmailLayout, OrderTable, styles, Title } from "./components/email-layout";
import type { EmailOrder } from "./types";

/** Pedido cancelado. Si estaba pagado, se aclara que el reintegro se gestiona aparte. */
export function OrderCancelledEmail({ order, wasPaid }: { order: EmailOrder; wasPaid: boolean }) {
  return (
    <EmailLayout preview={`Cancelamos tu pedido #${order.number}`}>
      <Title>Tu pedido #{order.number} fue cancelado</Title>
      <Text style={styles.text}>
        {wasPaid
          ? "Ya iniciamos el reintegro del pago por el mismo medio que usaste. Te escribimos si necesitamos algún dato."
          : "Como el pago no se acreditó, no se te cobró nada."}
      </Text>
      <Text style={styles.text}>Si tenés dudas, respondé este email y te ayudamos.</Text>
      <OrderTable order={order} />
    </EmailLayout>
  );
}

export const orderCancelledSubject = (o: EmailOrder) => `Pedido #${o.number} cancelado`;
