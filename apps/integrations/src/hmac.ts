import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Contrato Vercel ↔ VPS (docs/13): X-Signature = HMAC_SHA256(secret, timestamp + "." + body),
 * X-Timestamp en ms; ventana de 5 minutos para evitar replays.
 * El mismo algoritmo vive en apps/web/lib/shipping/integrations-client.ts.
 */
export const WINDOW_MS = 5 * 60 * 1000;

export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verify(input: {
  secret: string;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  body: string;
  now?: number;
}): "ok" | "missing" | "expired" | "invalid" {
  const { signature, timestamp } = input;
  if (!signature || !timestamp) return "missing";
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs((input.now ?? Date.now()) - ts) > WINDOW_MS)
    return "expired";
  const expected = Buffer.from(sign(input.secret, timestamp, input.body), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given) ? "ok" : "invalid";
}
