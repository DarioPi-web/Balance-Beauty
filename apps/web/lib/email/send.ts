import "server-only";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { getIntegrationSetting } from "@/lib/settings/integrations";

/**
 * Envío de emails transaccionales con Resend (docs/02, ADR de emails).
 * - Sin RESEND_API_KEY no envía: registra el intento (útil en local y staging sin dominio verificado).
 * - Corta a los 2,5 s (regla de docs/11: nada espera a un tercero más que eso en Vercel).
 * - Nunca lanza: un email que falla no debe romper el pedido ni el webhook.
 */
export type SendResult = { sent: boolean; id?: string; reason?: string };

const TIMEOUT_MS = 2_500;
const DEFAULT_FROM = "Balance Beauty <pedidos@balancebeauty.com.ar>";

const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  tag: string;
}): Promise<SendResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const log = { event: "email", tag: input.tag, to: to.map(mask), subject: input.subject };

  const key = await getIntegrationSetting("resend_api_key");
  if (!key) {
    console.info(JSON.stringify({ ...log, sent: false, reason: "sin RESEND_API_KEY" }));
    return { sent: false, reason: "not_configured" };
  }

  try {
    const [html, text] = await Promise.all([
      render(input.react),
      render(input.react, { plainText: true }),
    ]);
    const resend = new Resend(key);
    const res = await Promise.race([
      resend.emails.send({
        from: (await getIntegrationSetting("email_from")) || DEFAULT_FROM,
        to,
        subject: input.subject,
        html,
        text,
        tags: [{ name: "kind", value: input.tag }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
    if (res.error) {
      console.error(JSON.stringify({ ...log, sent: false, error: res.error.message }));
      return { sent: false, reason: res.error.message };
    }
    console.info(JSON.stringify({ ...log, sent: true, id: res.data?.id }));
    return { sent: true, id: res.data?.id };
  } catch (e) {
    console.error(JSON.stringify({ ...log, sent: false, error: String(e) }));
    return { sent: false, reason: String(e) };
  }
}
