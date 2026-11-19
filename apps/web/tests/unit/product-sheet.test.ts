import { describe, expect, it } from "vitest";
import { COLUMNS, diffSheet, parseCell, type ProductRow } from "@/lib/admin/product-sheet-core";

const col = (k: string) => COLUMNS.find((c) => c.key === k)!;

const base: ProductRow = {
  sku: "105",
  name: "Agua Micelar",
  brand: "Sulderm",
  status: "active",
  price: 25000,
  compare_at_price: null,
  stock: 7,
  low_stock_threshold: 3,
  weight_g: null,
  length_cm: null,
  width_cm: null,
  height_cm: null,
  tagline: "Limpia",
  seller_commission_percent: null,
};

describe("planilla Excel: lectura de celdas", () => {
  it("entiende números en formato argentino", () => {
    expect(parseCell(col("price"), "$ 12.100")).toEqual({ value: 12100 });
    expect(parseCell(col("price"), "1.234.567")).toEqual({ value: 1234567 });
    expect(parseCell(col("price"), 12100)).toEqual({ value: 12100 });
    expect(parseCell(col("length_cm"), "5,5")).toEqual({ value: 5.5 });
    expect(parseCell(col("price"), { formula: "A1*2", result: 3000 })).toEqual({ value: 3000 });
  });

  it("rechaza datos inválidos con un mensaje claro", () => {
    expect(parseCell(col("price"), "12,5")).toHaveProperty("error");
    expect(parseCell(col("price"), "abc")).toHaveProperty("error");
    expect(parseCell(col("stock"), -1)).toHaveProperty("error");
    expect(parseCell(col("price"), null)).toHaveProperty("error"); // obligatorio
    expect(parseCell(col("weight_g"), null)).toEqual({ value: null }); // opcional
  });

  it("estados en español, con o sin tildes", () => {
    expect(parseCell(col("status"), "publicado")).toEqual({ value: "active" });
    expect(parseCell(col("status"), "BORRADOR")).toEqual({ value: "draft" });
    expect(parseCell(col("status"), "vendido")).toHaveProperty("error");
  });
});

describe("planilla Excel: detección de cambios", () => {
  const cells = (over: Record<string, unknown> = {}) => ({
    sku: "105",
    name: "Agua Micelar",
    status: "Publicado",
    price: 25000,
    compare_at_price: null,
    stock: 7,
    low_stock_threshold: 3,
    weight_g: null,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    tagline: "Limpia",
    seller_commission_percent: null,
    ...over,
  });

  it("solo devuelve lo que cambió", () => {
    const r = diffSheet(
      [{ row: 2, cells: cells({ price: "26.000", weight_g: 180, length_cm: "5,5" }) }],
      [base],
    );
    expect(r.errors).toEqual([]);
    expect(r.updates).toEqual([{ sku: "105", price: 26000, weight_g: 180, length_cm: 5.5 }]);
    expect(r.changes[0].changes.map((c) => c.field)).toEqual(["price", "weight_g", "length_cm"]);
  });

  it("filas sin cambios no se envían", () => {
    const r = diffSheet([{ row: 2, cells: cells() }], [base]);
    expect(r.updates).toEqual([]);
    expect(r.unchanged).toBe(1);
  });

  it("errores: código inexistente, repetido y tachado menor al precio", () => {
    const r = diffSheet(
      [
        { row: 2, cells: cells({ sku: "999" }) },
        { row: 3, cells: cells({ compare_at_price: 20000 }) },
        { row: 4, cells: cells() },
        { row: 5, cells: cells() },
      ],
      [base],
    );
    // La fila 3 ya cuenta como primera aparición del 105 (aunque tenga error): 4 y 5 son repetidas.
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5]);
    expect(r.errors[0].message).toMatch(/no existe/);
    expect(r.errors[1].message).toMatch(/precio anterior/);
    expect(r.errors[2].message).toMatch(/repetido/);
    expect(r.updates).toEqual([]);
  });

  it("no toca el stock de productos que no lo controlan ni columnas ausentes", () => {
    const r = diffSheet([{ row: 2, cells: { sku: "105", stock: 99 } }], [{ ...base, stock: null }]);
    expect(r.updates).toEqual([]);
    expect(r.errors).toEqual([]);
  });
});
