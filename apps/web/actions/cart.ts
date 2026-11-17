"use server";

import { z } from "zod";
import { MAX_QTY_PER_ITEM, type CartView } from "@/lib/cart/compute";
import { readCartLines, writeCartLines } from "@/lib/cart/server";

/**
 * Server Actions del carrito. Del cliente llegan solo slug + cantidad (validados con Zod);
 * precios, stock y totales se recalculan en el servidor contra el catálogo.
 */
const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);
const qty = z.number().int().min(0).max(MAX_QTY_PER_ITEM);

export type CartActionResult = { ok: true; cart: CartView } | { ok: false; error: string };

async function run(fn: () => Promise<CartView>): Promise<CartActionResult> {
  try {
    return { ok: true, cart: await fn() };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: "Datos inválidos" };
    console.error("[cart]", e);
    return { ok: false, error: "No pudimos actualizar el carrito. Probá de nuevo." };
  }
}

export async function addToCart(input: { slug: string; qty?: number }) {
  return run(async () => {
    const s = slug.parse(input.slug);
    const q = qty.min(1).parse(input.qty ?? 1);
    const lines = await readCartLines();
    return writeCartLines([...lines, { slug: s, qty: q }]);
  });
}

export async function addManyToCart(input: { slugs: string[] }) {
  return run(async () => {
    const slugs = z.array(slug).min(1).max(10).parse(input.slugs);
    const lines = await readCartLines();
    const have = new Set(lines.map((l) => l.slug));
    return writeCartLines([
      ...lines,
      ...slugs.filter((s) => !have.has(s)).map((s) => ({ slug: s, qty: 1 })),
    ]);
  });
}

export async function setCartQty(input: { slug: string; qty: number }) {
  return run(async () => {
    const s = slug.parse(input.slug);
    const q = qty.parse(input.qty);
    const lines = (await readCartLines()).filter((l) => l.slug !== s);
    return writeCartLines(q > 0 ? [...lines, { slug: s, qty: q }] : lines);
  });
}

export async function removeFromCart(input: { slug: string }) {
  return setCartQty({ slug: input.slug, qty: 0 });
}
