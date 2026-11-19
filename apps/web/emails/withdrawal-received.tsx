import { Text } from "@react-email/components";
import { EmailLayout, styles, Title } from "./components/email-layout";

export type WithdrawalEmail = {
  code: string;
  fullName: string;
  email: string;
  orderNumber: number | null;
  reason: string | null;
};

/** Botón de arrepentimiento: constancia para el cliente con el código de identificación. */
export function WithdrawalReceivedEmail({ w }: { w: WithdrawalEmail }) {
  return (
    <EmailLayout preview={`Recibimos tu solicitud de arrepentimiento · código ${w.code}`}>
      <Title>Recibimos tu solicitud de arrepentimiento</Title>
      <Text style={styles.text}>
        Hola {w.fullName.split(" ")[0]}: registramos tu pedido para revocar la compra
        {w.orderNumber ? ` #${w.orderNumber}` : ""}.
      </Text>
      <Text style={styles.text}>
        Tu código de identificación es <strong>{w.code}</strong>. Guardalo: lo vas a necesitar si
        nos consultás por este trámite.
      </Text>
      <Text style={styles.text}>
        Te escribimos dentro de las próximas 24 horas hábiles con los pasos para la devolución. El
        envío de vuelta no tiene costo para vos.
      </Text>
    </EmailLayout>
  );
}

export const withdrawalReceivedSubject = (w: WithdrawalEmail) =>
  `Solicitud de arrepentimiento recibida · código ${w.code}`;

/** Aviso interno a la tienda. */
export function AdminWithdrawalEmail({ w }: { w: WithdrawalEmail }) {
  return (
    <EmailLayout
      preview={`Arrepentimiento ${w.code}${w.orderNumber ? ` · pedido #${w.orderNumber}` : ""}`}
    >
      <Title>Nueva solicitud de arrepentimiento</Title>
      <Text style={styles.text}>
        Código: <strong>{w.code}</strong>
        <br />
        Nombre: {w.fullName}
        <br />
        Email: {w.email}
        <br />
        Pedido: {w.orderNumber ? `#${w.orderNumber}` : "no indicado"}
        <br />
        Motivo: {w.reason ?? "no indicado"}
      </Text>
      <Text style={styles.text}>
        Hay que responder dentro de las 24 h con las instrucciones de devolución (Res. 424/2020).
      </Text>
    </EmailLayout>
  );
}

export const adminWithdrawalSubject = (w: WithdrawalEmail) =>
  `Arrepentimiento ${w.code}${w.orderNumber ? ` · pedido #${w.orderNumber}` : ""}`;
