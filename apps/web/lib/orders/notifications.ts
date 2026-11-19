import "server-only";
import { createElement } from "react";
import { AdminNewOrderEmail, adminNewOrderSubject } from "@/emails/admin-new-order";
import { OrderReceivedEmail, orderReceivedSubject } from "@/emails/order-received";
import { PaymentApprovedEmail, paymentApprovedSubject } from "@/emails/payment-approved";
import { OrderCancelledEmail, orderCancelledSubject } from "@/emails/order-cancelled";
import { OrderShippedEmail, orderShippedSubject } from "@/emails/order-shipped";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendEmail } from "@/lib/email/send";
import { getIntegrationSetting } from "@/lib/settings/integrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toEmailOrder, type OrderForEmail } from "./email-mapping";
import { getBankDetails } from "@/lib/settings/bank";
import { SITE_URL } from "@/lib/site-url";

const siteUrl = () => SITE_URL;

/** Pedido recién creado: email al cliente (+ datos de transferencia) y aviso a la tienda. */
export async function notifyOrderPlaced(order: OrderForEmail) {
  const email = toEmailOrder(order, siteUrl());
  // Con tarjeta el email útil es el de pago aprobado (evita dos emails seguidos).
  const tasks: Promise<unknown>[] = [];
  if (order.payment_method === "bank_transfer") {
    const bank = await getBankDetails();
    tasks.push(
      sendEmail({
        to: order.email,
        subject: orderReceivedSubject(email),
        react: createElement(OrderReceivedEmail, { order: email, bank }),
        tag: "order_received",
      }),
    );
  }
  const admins = ((await getIntegrationSetting("email_admin_notifications")) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (admins.length) {
    tasks.push(
      sendEmail({
        to: admins,
        subject: adminNewOrderSubject(email),
        react: createElement(AdminNewOrderEmail, {
          order: email,
          customer: { name: order.full_name, email: order.email, phone: order.phone },
        }),
        tag: "admin_new_order",
      }),
    );
  }
  await Promise.all(tasks);
}

const ORDER_EMAIL_SELECT =
  "id, number, status, email, full_name, phone, payment_method, shipping_method, shipping_address, subtotal, discount_total, shipping_total, total, order_items(name, quantity, unit_price)";

type DbClient = Pick<SupabaseClient<Database>, "from">;

/**
 * Lee el pedido con lo que necesitan los emails. Recibe el cliente: con la sesión de un admin
 * (RLS "admin all") desde /admin, o con service role desde el webhook.
 */
export async function loadOrderForEmail(client: DbClient, orderId: string) {
  const { data, error } = await client
    .from("orders")
    .select(ORDER_EMAIL_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) {
    console.error(JSON.stringify({ event: "email.order.lookup", orderId, error: error?.message }));
    return null;
  }
  return data as unknown as OrderForEmail & { status: string };
}

/** Cambio de estado → email al cliente (pago acreditado, despachado o cancelado). */
export async function notifyOrderStatus(
  kind: "paid" | "shipped" | "cancelled",
  order: OrderForEmail & { status?: string },
  extra: { carrier?: string; tracking?: string; wasPaid?: boolean } = {},
) {
  const email = toEmailOrder(order, siteUrl());
  if (kind === "paid") {
    await sendEmail({
      to: order.email,
      subject: paymentApprovedSubject(email),
      react: createElement(PaymentApprovedEmail, { order: email }),
      tag: "payment_approved",
    });
  } else if (kind === "shipped") {
    await sendEmail({
      to: order.email,
      subject: orderShippedSubject(email),
      react: createElement(OrderShippedEmail, {
        order: email,
        carrier: extra.carrier || "correo",
        tracking: extra.tracking || undefined,
      }),
      tag: "order_shipped",
    });
  } else {
    await sendEmail({
      to: order.email,
      subject: orderCancelledSubject(email),
      react: createElement(OrderCancelledEmail, { order: email, wasPaid: Boolean(extra.wasPaid) }),
      tag: "order_cancelled",
    });
  }
}

/** Pago acreditado por Mercado Pago (webhook): lee el pedido con service role. */
export async function notifyPaymentApproved(orderId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const order = await loadOrderForEmail(createSupabaseAdminClient(), orderId);
  if (order) await notifyOrderStatus("paid", order);
}
