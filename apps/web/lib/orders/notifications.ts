import "server-only";
import { createElement } from "react";
import { AdminNewOrderEmail, adminNewOrderSubject } from "@/emails/admin-new-order";
import { OrderReceivedEmail, orderReceivedSubject } from "@/emails/order-received";
import { PaymentApprovedEmail, paymentApprovedSubject } from "@/emails/payment-approved";
import type { BankDetails } from "@/emails/types";
import { sendEmail } from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { toEmailOrder, type OrderForEmail } from "./email-mapping";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Datos bancarios públicos (store_settings "bank_transfer"); null si todavía no se cargaron. */
async function bankDetails(): Promise<BankDetails | null> {
  const { data } = await createSupabasePublicClient()
    .from("store_settings")
    .select("value")
    .eq("key", "bank_transfer")
    .maybeSingle();
  const v = data?.value as Partial<BankDetails> | undefined;
  return v?.holder ? (v as BankDetails) : null;
}

/** Pedido recién creado: email al cliente (+ datos de transferencia) y aviso a la tienda. */
export async function notifyOrderPlaced(order: OrderForEmail) {
  const email = toEmailOrder(order, siteUrl());
  // Con tarjeta el email útil es el de pago aprobado (evita dos emails seguidos).
  const tasks: Promise<unknown>[] = [];
  if (order.payment_method === "bank_transfer") {
    const bank = await bankDetails().catch(() => null);
    tasks.push(
      sendEmail({
        to: order.email,
        subject: orderReceivedSubject(email),
        react: createElement(OrderReceivedEmail, { order: email, bank }),
        tag: "order_received",
      }),
    );
  }
  const admins = (process.env.EMAIL_ADMIN_NOTIFICATIONS ?? "")
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

/** Pago acreditado (webhook). Lee el pedido con service role: solo corre en el servidor. */
export async function notifyPaymentApproved(orderId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { data, error } = await createSupabaseAdminClient()
    .from("orders")
    .select(
      "id, number, email, full_name, phone, payment_method, shipping_method, shipping_address, subtotal, discount_total, shipping_total, total, order_items(name, quantity, unit_price)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) {
    console.error(
      JSON.stringify({ event: "email.payment_approved.lookup", orderId, error: error?.message }),
    );
    return;
  }
  const order = data as unknown as OrderForEmail;
  const email = toEmailOrder(order, siteUrl());
  await sendEmail({
    to: order.email,
    subject: paymentApprovedSubject(email),
    react: createElement(PaymentApprovedEmail, { order: email }),
    tag: "payment_approved",
  });
}
