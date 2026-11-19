import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { diffSheet, type ProductRow } from "@/lib/admin/product-sheet-core";
import { buildProductWorkbook, readProductWorkbook } from "@/lib/admin/product-sheet";

vi.mock("server-only", () => ({}));

const products: ProductRow[] = [
  {
    sku: "105",
    name: "Espuma de limpieza",
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
  },
  {
    sku: "106",
    name: "Sérum",
    brand: null,
    status: "draft",
    price: 30000,
    compare_at_price: 35000,
    stock: null,
    low_stock_threshold: 3,
    weight_g: 120,
    length_cm: 4,
    width_cm: 4,
    height_cm: 12,
    tagline: null,
    seller_commission_percent: 15,
  },
];

const toArrayBuffer = (b: Buffer) =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

describe("planilla Excel: archivo real", () => {
  it("la planilla descargada, sin tocar, no genera cambios", async () => {
    const file = await buildProductWorkbook(products);
    const read = await readProductWorkbook(toArrayBuffer(file));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const diff = diffSheet(read.rows, products);
    expect(diff.errors).toEqual([]);
    expect(diff.updates).toEqual([]);
    expect(diff.unchanged).toBe(2);
  });

  it("detecta lo editado en Excel (precio, stock, medidas, estado) aunque reordenen columnas", async () => {
    const file = await buildProductWorkbook(products);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(toArrayBuffer(file));
    const ws = wb.getWorksheet("Productos")!;
    const col = (header: string) => {
      let n = 0;
      ws.getRow(1).eachCell((c, i) => {
        if (c.text === header) n = i;
      });
      return n;
    };
    ws.getRow(2).getCell(col("Precio ($)")).value = 26000;
    ws.getRow(2).getCell(col("Stock")).value = 9;
    ws.getRow(2).getCell(col("Peso (g)")).value = 180;
    ws.getRow(2).getCell(col("Largo (cm)")).value = "5,5";
    ws.getRow(3).getCell(col("Estado")).value = "Archivado";
    ws.spliceColumns(col("Marca (solo lectura)"), 1); // borran una columna de referencia
    const edited = Buffer.from(await wb.xlsx.writeBuffer());

    const read = await readProductWorkbook(toArrayBuffer(edited));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const diff = diffSheet(read.rows, products);
    expect(diff.errors).toEqual([]);
    expect(diff.updates).toEqual([
      { sku: "105", price: 26000, stock: 9, weight_g: 180, length_cm: 5.5 },
      { sku: "106", status: "archived" },
    ]);
  });

  it("rechaza un archivo que no es Excel o sin la columna de código", async () => {
    const bad = await readProductWorkbook(new TextEncoder().encode("hola").buffer as ArrayBuffer);
    expect(bad.ok).toBe(false);
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Productos").addRow(["Nombre", "Precio ($)"]);
    const noKey = await readProductWorkbook(
      toArrayBuffer(Buffer.from(await wb.xlsx.writeBuffer())),
    );
    expect(noKey.ok).toBe(false);
  });
});
