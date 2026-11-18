import { Text } from "@react-email/components";
import { EmailLayout, OrderTable, StatusButton, styles, Title } from "./components/email-layout";
import type { EmailOrder } from "./types";

/** Pedido despachado con transportista y código de seguimiento. */
export function OrderShippedEmail({
  order,
  carrier,
  tracking,
}: {
  order: EmailOrder;
  carrier: string;
  tracking?: string;
}) {
  return (
    <EmailLayout preview={`Tu pedido #${order.number} está en camino`}>
      <Title>¡{order.firstName}, tu pedido está en camino!</Title>
      <Text style={styles.text}>
        Lo despachamos por <strong>{carrier}</strong>.
        {tracking ? (
          <>
            {" "}
            Código de seguimiento: <strong>{tracking}</strong>.
          </>
        ) : null}
      </Text>
      <OrderTable order={order} />
      <StatusButton href={order.statusUrl}>Ver el pedido</StatusButton>
    </EmailLayout>
  );
}

export const orderShippedSubject = (o: EmailOrder) => `Tu pedido #${o.number} está en camino`;
