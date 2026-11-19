"use server";

import { createElement } from "react";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import {
  AdminWithdrawalEmail,
  adminWithdrawalSubject,
  WithdrawalReceivedEmail,
  withdrawalReceivedSubject,
  type WithdrawalEmail,
} from "@/emails/withdrawal-received";
import { sendEmail } from "@/lib/email/send";
import { getIntegrationSetting } from "@/lib/settings/integrations";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const schema = z.object({
  full_name: z.string().trim().min(3, "Ingresá tu nombre y apellido").max(120),
  email: z.string().trim().toLowerCase().email("Revisá el email").max(254),
  order_number: z
    .string()
    .trim()
    .transform((v) => v.replace(/^#/, ""))
    .refine((v) => v === "" || /^\d{1,9}$/.test(v), "Revisá el número de pedido")
    .transform((v) => (v === "" ? null : Number(v))),
  reason: z.string().trim().max(2000),
});

const back = (q: Record<string, string>) => redirect(`/arrepentimiento?${new URLSearchParams(q)}`);

/**
 * Botón de arrepentimiento (Res. 424/2020): registra la solicitud por RPC (valida y limita
 * repeticiones), muestra el código de identificación y lo envía por email; avisa a la tienda.
 */
export async function requestWithdrawal(fd: FormData): Promise<void> {
  // Honeypot: un humano no ve ni completa este campo.
  if (String(fd.get("website") ?? "") !== "") back({ ok: "1" });
  const parsed = schema.safeParse({
    full_name: String(fd.get("full_name") ?? ""),
    email: String(fd.get("email") ?? ""),
    order_number: String(fd.get("order_number") ?? ""),
    reason: String(fd.get("reason") ?? ""),
  });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;

  const { data, error } = await createSupabasePublicClient().rpc("request_withdrawal", {
    p_full_name: d.full_name,
    p_email: d.email,
    p_order_number: d.order_number ?? undefined,
    p_reason: d.reason || undefined,
  });
  if (error || !data) {
    if (error?.hint !== "withdrawal")
      console.error(JSON.stringify({ event: "withdrawal.error", code: error?.code }));
    back({
      error:
        error?.hint === "withdrawal"
          ? error.message
          : "No pudimos registrar tu pedido. Probá de nuevo o escribinos por WhatsApp.",
    });
  }
  const code = (data as { code: string }).code;
  const w: WithdrawalEmail = {
    code,
    fullName: d.full_name,
    email: d.email,
    orderNumber: d.order_number,
    reason: d.reason || null,
  };

  after(async () => {
    const admins = ((await getIntegrationSetting("email_admin_notifications")) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await Promise.allSettled([
      sendEmail({
        to: d.email,
        subject: withdrawalReceivedSubject(w),
        react: createElement(WithdrawalReceivedEmail, { w }),
        tag: "withdrawal_received",
      }),
      admins.length
        ? sendEmail({
            to: admins,
            subject: adminWithdrawalSubject(w),
            react: createElement(AdminWithdrawalEmail, { w }),
            tag: "admin_withdrawal",
          })
        : null,
    ]);
  });

  back({ codigo: code });
}
