import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Defensas livianas del checkout contra bots (sin servicios externos):
 * - token de tiempo firmado: el formulario debe enviarse entre MIN_MS y MAX_MS después de cargarse;
 * - honeypot: campo oculto que una persona nunca completa (ver HONEYPOT_FIELD);
 * - hash de la IP para limitar pedidos por hora en la base sin guardar la IP en claro.
 * Puro (solo node:crypto): se testea sin red.
 */
export const HONEYPOT_FIELD = "website";
export const MIN_MS = 2_500;
export const MAX_MS = 2 * 60 * 60 * 1000;

const sign = (ts: number, secret: string) =>
  createHmac("sha256", secret).update(`checkout:${ts}`).digest("base64url");

export function createFormToken(secret: string, now = Date.now()): string {
  return `${now}.${sign(now, secret)}`;
}

export type FormTokenCheck = "ok" | "invalid" | "too_fast" | "expired";

export function checkFormToken(token: unknown, secret: string, now = Date.now()): FormTokenCheck {
  if (typeof token !== "string") return "invalid";
  const [tsRaw, mac] = token.split(".");
  const ts = Number(tsRaw);
  if (!Number.isSafeInteger(ts) || !mac) return "invalid";
  const expected = Buffer.from(sign(ts, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - ts;
  if (age < MIN_MS) return "too_fast";
  if (age > MAX_MS) return "expired";
  return "ok";
}

/** IP del primer salto (x-forwarded-for en Vercel) → hash con sal; null si no hay IP. */
export function hashClientIp(headers: Headers, secret: string): string | null {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "";
  if (!ip) return null;
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex").slice(0, 32);
}
