import { timingSafeEqual } from "node:crypto";

/** Tags de caché que se pueden invalidar desde afuera (F3-07). */
export const REVALIDATABLE_TAGS = ["catalog", "shipping"] as const;
export type RevalidatableTag = (typeof REVALIDATABLE_TAGS)[number];

/** Compara el token Bearer contra el secreto en tiempo constante. */
export function isAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authorization?.startsWith("Bearer ")) return false;
  const given = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Cuerpo { tags: [...] } → tags válidos (sin duplicados); por defecto, el catálogo. */
export function parseTags(body: unknown): RevalidatableTag[] | null {
  const raw = (body as { tags?: unknown } | null)?.tags ?? ["catalog"];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 5) return null;
  const valid = raw.filter((t): t is RevalidatableTag => REVALIDATABLE_TAGS.includes(t));
  return valid.length === raw.length ? [...new Set(valid)] : null;
}
