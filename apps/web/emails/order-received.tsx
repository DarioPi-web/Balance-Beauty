import { Section, Text } from "@react-email/components";
import { formatARS } from "@/lib/pricing";
import { site } from "@/lib/site";
import { EmailLayout, OrderTable, StatusButton, styles, Title } from "./components/email-layout";
import type { BankDetails, EmailOrder } from "./types";

/** Pedido registrado. Para transferencia incluye los datos para pagar. */
export function OrderReceivedEmail({
  order,
  bank,
}: {
  order: EmailOrder;
  bank: BankDetails | null;
}) {
  const byTransfer = order.paymentMethod === "bank_transfer";
  return (
    <EmailLayout preview={`Recibimos tu pedido #${order.number}`}>
      <Title>¡Gracias, {order.firstName}! Recibimos tu pedido</Title>
      {byTransfer ? (
        <>
          <Text style={styles.text}>
            Para confirmarlo, transferí <strong>{formatARS(order.total)}</strong> (ya incluye el{" "}
            {site.transferDiscountPercent} % de descuento) e indicá <strong>#{order.number}</strong>{" "}
            en el concepto.
          </Text>
          {bank ? (
            <Section style={styles.card}>
              <Text style={styles.row}>Titular: {bank.holder}</Text>
              {bank.bank ? <Text style={styles.row}>Banco: {bank.bank}</Text> : null}
              {bank.cbu ? <Text style={styles.row}>CBU: {bank.cbu}</Text> : null}
              {bank.alias ? <Text style={styles.row}>Alias: {bank.alias}</Text> : null}
              {bank.cuit ? <Text style={styles.row}>CUIT: {bank.cuit}</Text> : null}
            </Section>
          ) : (
            <Text style={styles.text}>
              En breve te enviamos los datos bancarios para transferir.
            </Text>
          )}
          <Text style={styles.muted}>
            Guardamos el stock 30 minutos. Cuando acreditemos la transferencia te avisamos por
            email.
          </Text>
        </>
      ) : (
        <Text style={styles.text}>
          Estamos esperando la confirmación del pago. Si ya pagaste, en unos minutos te llega la
          aprobación.
        </Text>
      )}
      <OrderTable order={order} />
      <StatusButton href={order.statusUrl}>Ver el estado del pedido</StatusButton>
    </EmailLayout>
  );
}

export const orderReceivedSubject = (o: EmailOrder) =>
  o.paymentMethod === "bank_transfer"
    ? `Pedido #${o.number}: datos para transferir`
    : `Recibimos tu pedido #${o.number}`;
