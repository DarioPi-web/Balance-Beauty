import "server-only";
import { cookies } from "next/headers";
import { listProducts } from "@/lib/catalog";
import { decodeCart, encodeCart } from "./codec";
import { computeCart, sanitizeLines, type CartLine } from "./compute";

export const CART_COOKIE = "bb_cart";
/** Cookie legible por el cliente SOLO con la cantidad, para el contador del header sin ir al servidor. */
export const CART_COUNT_COOKIE = "bb_cart_count";

function secret() {
  const s = process.env.CART_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("CART_SECRET (>= 32 caracteres) es obligatorio en producción");
  }
  return "dev-only-cart-secret-not-for-production-use";
}

export async function readCartLines(): Promise<CartLine[]> {
  const store = await cookies();
  return decodeCart(store.get(CART_COOKIE)?.value, secret());
}

export async function readCart() {
  const [lines, products] = await Promise.all([readCartLines(), listProducts()]);
  return computeCart(lines, products);
}

/** Solo desde Server Actions / Route Handlers. Persiste líneas ya saneadas contra el catálogo. */
export async function writeCartLines(lines: CartLine[]) {
  const products = await listProducts();
  const clean = sanitizeLines(lines, products).lines;
  const store = await cookies();
  const common = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== undefined,
    maxAge: 60 * 60 * 24 * 30,
  };
  if (clean.length === 0) {
    store.delete(CART_COOKIE);
    store.delete(CART_COUNT_COOKIE);
  } else {
    store.set(CART_COOKIE, encodeCart(clean, secret()), { ...common, httpOnly: true });
    store.set(CART_COUNT_COOKIE, String(clean.reduce((s, l) => s + l.qty, 0)), {
      ...common,
      httpOnly: false,
    });
  }
  return computeCart(clean, products);
}
