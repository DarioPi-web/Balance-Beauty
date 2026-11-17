/**
 * Cookie del carrito firmada con HMAC-SHA256 (ADR‑019, interino hasta la tabla carts).
 * Formato: base64url(json) + "." + base64url(firma). Si la firma no coincide → carrito vacío.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CartLine } from "./compute";

const b64url = (b: Buffer) => b.toString("base64url");

function sign(payload: string, secret: string) {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function encodeCart(lines: CartLine[], secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(lines.map((l) => [l.slug, l.qty]))));
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeCart(value: string | undefined, secret: string): CartLine[] {
  if (!value || value.length > 3500) return [];
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return [];
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return [];
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is [string, number] =>
          Array.isArray(r) && typeof r[0] === "string" && typeof r[1] === "number",
      )
      .map(([slug, qty]) => ({ slug, qty }));
  } catch {
    return [];
  }
}
