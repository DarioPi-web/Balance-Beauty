import { describe, expect, it } from "vitest";
import { decodeCart, encodeCart } from "@/lib/cart/codec";
import { computeCart, MAX_QTY_PER_ITEM, sanitizeLines } from "@/lib/cart/compute";
import type { Product } from "@/lib/catalog/types";

const product = (o: Partial<Product> & { slug: string; price: number }): Product => ({
  id: o.slug,
  sku: o.slug,
  name: o.slug,
  brand: null,
  tagline: null,
  description: "",
  compareAtPrice: null,
  stock: null,
  inStock: true,
  categories: [],
  concerns: [],
  images: [],
  requiresReview: false,
  ...o,
});

const catalog = [
  product({ slug: "a", price: 25000 }),
  product({ slug: "b", price: 70000, stock: 3 }),
  product({ slug: "agotado", price: 1000, inStock: false }),
  product({ slug: "magistral", price: 32000, requiresReview: true }),
];

const SECRET = "x".repeat(40);

describe("codec de la cookie", () => {
  it("ida y vuelta", () => {
    const lines = [
      { slug: "a", qty: 2 },
      { slug: "b", qty: 1 },
    ];
    expect(decodeCart(encodeCart(lines, SECRET), SECRET)).toEqual(lines);
  });
  it("una cookie manipulada se descarta", () => {
    const v = encodeCart([{ slug: "a", qty: 1 }], SECRET);
    const [payload, sig] = v.split(".");
    const forged = Buffer.from(JSON.stringify([["a", 99]])).toString("base64url");
    expect(decodeCart(`${forged}.${sig}`, SECRET)).toEqual([]);
    expect(decodeCart(`${payload}.${sig}x`, SECRET)).toEqual([]);
    expect(decodeCart(v, "otro-secreto-".repeat(4))).toEqual([]);
    expect(decodeCart("basura", SECRET)).toEqual([]);
    expect(decodeCart(undefined, SECRET)).toEqual([]);
  });
});

describe("sanitizeLines", () => {
  it("une duplicados, descarta inválidos, agotados y magistrales", () => {
    const { lines, adjusted } = sanitizeLines(
      [
        { slug: "a", qty: 1 },
        { slug: "a", qty: 2 },
        { slug: "agotado", qty: 1 },
        { slug: "magistral", qty: 1 },
        { slug: "no-existe", qty: 1 },
        { slug: "a", qty: -5 },
      ],
      catalog,
    );
    expect(lines).toEqual([{ slug: "a", qty: 3 }]);
    expect(adjusted).toBe(true);
  });
  it("recorta al stock disponible y al máximo por producto", () => {
    expect(sanitizeLines([{ slug: "b", qty: 9 }], catalog).lines).toEqual([{ slug: "b", qty: 3 }]);
    expect(sanitizeLines([{ slug: "a", qty: 99 }], catalog).lines).toEqual([
      { slug: "a", qty: MAX_QTY_PER_ITEM },
    ]);
  });
});

describe("computeCart", () => {
  it("totales, transferencia y cuotas con precios del catálogo", () => {
    const v = computeCart([{ slug: "a", qty: 2 }], catalog);
    expect(v.subtotal).toBe(50000);
    expect(v.transferTotal).toBe(45000);
    expect(v.installments.n).toBe(6);
    expect(v.remainingForPromo).toBe(100000);
    expect(v.count).toBe(2);
  });
  it("desde $150.000 habilita 12 cuotas", () => {
    const v = computeCart(
      [
        { slug: "a", qty: 2 },
        { slug: "b", qty: 2 },
      ],
      catalog,
    );
    expect(v.subtotal).toBe(190000);
    expect(v.installments.n).toBe(12);
    expect(v.remainingForPromo).toBe(0);
  });
  it("carrito vacío", () => {
    const v = computeCart([], catalog);
    expect(v).toMatchObject({ items: [], count: 0, subtotal: 0, installments: { amount: 0 } });
  });
});
