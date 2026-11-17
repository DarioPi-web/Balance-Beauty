/**
 * Cálculo del carrito (puro). Los precios y el stock SIEMPRE salen del catálogo del servidor;
 * del cliente solo llegan slug + cantidad. El cálculo definitivo del pedido se repite en place_order (F4).
 */
import type { Product } from "@/lib/catalog/types";
import { installmentAmount, priceWithPaymentDiscount, remainingToThreshold } from "@/lib/pricing";
import { site } from "@/lib/site";

export type CartLine = { slug: string; qty: number };

export const MAX_QTY_PER_ITEM = 10;
export const MAX_LINES = 30;

export type CartItemView = {
  slug: string;
  name: string;
  brand: string | null;
  image: Product["images"][number] | null;
  unitPrice: number;
  qty: number;
  maxQty: number;
  lineTotal: number;
};

export type CartView = {
  items: CartItemView[];
  count: number;
  subtotal: number;
  transferTotal: number;
  installments: { n: number; amount: number };
  /** Cuánto falta para la promo de 12 cuotas (0 = ya alcanzada). */
  remainingForPromo: number;
  /** Líneas descartadas o ajustadas (producto inexistente, sin stock, cantidad recortada). */
  adjusted: boolean;
};

export const maxQtyFor = (p: Pick<Product, "stock">) =>
  Math.max(0, Math.min(MAX_QTY_PER_ITEM, p.stock ?? MAX_QTY_PER_ITEM));

/** Normaliza las líneas: sin duplicados, cantidades enteras 1..máx, solo productos vendibles. */
export function sanitizeLines(
  lines: CartLine[],
  products: Product[],
): { lines: CartLine[]; adjusted: boolean } {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const merged = new Map<string, number>();
  for (const l of lines.slice(0, MAX_LINES * 2)) {
    if (typeof l?.slug !== "string") continue;
    const q = Math.floor(Number(l.qty));
    if (!Number.isFinite(q) || q <= 0) continue;
    merged.set(l.slug, (merged.get(l.slug) ?? 0) + q);
  }
  let adjusted = merged.size !== lines.length;
  const out: CartLine[] = [];
  for (const [slug, qty] of merged) {
    const p = bySlug.get(slug);
    if (!p || !p.inStock || p.requiresReview) {
      adjusted = true;
      continue;
    }
    const max = maxQtyFor(p);
    if (max === 0) {
      adjusted = true;
      continue;
    }
    if (qty > max) adjusted = true;
    out.push({ slug, qty: Math.min(qty, max) });
    if (out.length >= MAX_LINES) break;
  }
  return { lines: out, adjusted };
}

export function computeCart(rawLines: CartLine[], products: Product[]): CartView {
  const { lines, adjusted } = sanitizeLines(rawLines, products);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const items: CartItemView[] = lines.map(({ slug, qty }) => {
    const p = bySlug.get(slug)!;
    return {
      slug,
      name: p.name,
      brand: p.brand,
      image: p.images[0] ?? null,
      unitPrice: p.price,
      qty,
      maxQty: maxQtyFor(p),
      lineTotal: p.price * qty,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const promo = subtotal >= site.installments.promoMinAmount;
  const n = promo ? site.installments.promo : site.installments.standard;
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal,
    transferTotal: priceWithPaymentDiscount(subtotal, site.transferDiscountPercent),
    installments: { n, amount: subtotal ? installmentAmount(subtotal, n) : 0 },
    remainingForPromo: remainingToThreshold(subtotal, site.installments.promoMinAmount),
    adjusted,
  };
}
