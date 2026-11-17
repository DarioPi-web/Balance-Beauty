import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { formatARS } from "@/lib/pricing";
import type { EmailOrder } from "../types";

// En emails los estilos van inline (los clientes de correo ignoran CSS externo):
// se usan las constantes de marca, no clases de Tailwind.
const c = brand.colors;
export const styles = {
  body: {
    backgroundColor: c.clinical,
    color: c.graphite,
    fontFamily: "Helvetica, Arial, sans-serif",
    margin: 0,
  },
  container: { maxWidth: 560, margin: "0 auto", padding: "32px 24px" },
  brand: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 24,
    color: c.leaf,
    margin: 0,
  },
  h1: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 26,
    lineHeight: "32px",
    color: c.graphite,
    margin: "24px 0 8px",
  },
  text: { fontSize: 16, lineHeight: "24px", margin: "8px 0" },
  muted: { fontSize: 13, lineHeight: "20px", color: "#4b5a52", margin: "4px 0" },
  card: {
    backgroundColor: "#ffffff",
    border: `1px solid ${c.mist}`,
    borderRadius: 12,
    padding: "16px 20px",
    margin: "16px 0",
  },
  row: { fontSize: 15, lineHeight: "22px", margin: "2px 0" },
  total: { fontSize: 17, fontWeight: 700 as const, margin: "8px 0 0" },
  button: {
    backgroundColor: c.leaf,
    color: c.clinical,
    borderRadius: 999,
    padding: "12px 24px",
    textDecoration: "none",
    fontWeight: 600 as const,
    display: "inline-block",
  },
} as const;

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="es-AR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{brand.name}</Text>
          {children}
          <Hr style={{ borderColor: c.mist, margin: "32px 0 16px" }} />
          <Text style={styles.muted}>
            {brand.name} · Dermocosmética · Recibiste este email por una compra en nuestra tienda.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Heading as="h1" style={styles.h1}>
      {children}
    </Heading>
  );
}

/** Detalle del pedido: ítems, descuento, envío y total. */
export function OrderTable({ order }: { order: EmailOrder }) {
  return (
    <Section style={styles.card}>
      <Text style={{ ...styles.row, fontWeight: 700 }}>Pedido #{order.number}</Text>
      {order.items.map((i) => (
        <Text key={i.name} style={styles.row}>
          {i.name} × {i.qty} — {formatARS(i.unitPrice * i.qty)}
        </Text>
      ))}
      <Hr style={{ borderColor: c.mist, margin: "8px 0" }} />
      <Text style={styles.row}>Subtotal: {formatARS(order.subtotal)}</Text>
      {order.discount ? (
        <Text style={styles.row}>Descuento: −{formatARS(order.discount)}</Text>
      ) : null}
      <Text style={styles.row}>Envío: {order.shipping ? formatARS(order.shipping) : "Gratis"}</Text>
      <Text style={styles.total}>Total: {formatARS(order.total)}</Text>
      <Text style={styles.muted}>
        {order.shippingMethod === "home_delivery"
          ? "Envío a domicilio"
          : "Retiro en sucursal del correo"}
        : {order.deliveryLine}
      </Text>
    </Section>
  );
}

export function StatusButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Link href={href} style={styles.button}>
        {children}
      </Link>
    </Section>
  );
}
