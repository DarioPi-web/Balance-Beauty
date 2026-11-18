import "server-only";
import { createHmac } from "node:crypto";

/**
 * Cliente del servicio de integraciones del VPS (docs/13, apps/integrations).
 * - Firma: X-Signature = HMAC_SHA256(secret, timestamp + "." + body), X-Timestamp en ms.
 * - Corte a INTEGRATIONS_TIMEOUT_MS (2,5 s por defecto, regla de docs/11).
 * - Nunca lanza: si el VPS no está configurado, tarda o falla, devuelve null y el checkout
 *   sigue con la tarifa plana de `shipping_rates` (fallback).
 */
export type LiveQuoteRequest = {
  postalCode: string;
  method: "home_delivery" | "branch_pickup";
  packages: { weightG: number; volumeCm3: number; declaredValue: number }[];
};
export type LiveQuote = { carrier: string; method: string; price: number; etaDays?: string };

export const signIntegrationRequest = (secret: string, timestamp: string, body: string) =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

export async function fetchLiveQuote(
  req: LiveQuoteRequest,
  opts: { fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<LiveQuote | null> {
  const url = process.env.INTEGRATIONS_URL;
  const secret = process.env.INTEGRATIONS_HMAC_SECRET;
  if (!url || !secret || secret.length < 32) return null;

  const body = JSON.stringify(req);
  const timestamp = String((opts.now ?? Date.now)());
  const timeout = Number(process.env.INTEGRATIONS_TIMEOUT_MS ?? 2500);
  try {
    const res = await (opts.fetchImpl ?? fetch)(`${url.replace(/\/$/, "")}/shipping/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-timestamp": timestamp,
        "x-signature": signIntegrationRequest(secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(
        JSON.stringify({ event: "shipping.live_quote.unavailable", status: res.status }),
      );
      return null;
    }
    const data = (await res.json()) as { quotes?: LiveQuote[] };
    const q = data.quotes?.[0];
    return q && Number.isInteger(q.price) && q.price > 0 ? q : null;
  } catch (e) {
    console.warn(JSON.stringify({ event: "shipping.live_quote.error", error: String(e) }));
    return null;
  }
}
