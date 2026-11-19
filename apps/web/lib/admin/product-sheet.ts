import "server-only";
import ExcelJS from "exceljs";
import { COLUMNS, STATUS_LABEL, type Column, type ProductRow } from "./product-sheet-core";

const SHEET = "Productos";
const MAX_ROWS = 2000;

/** Genera la planilla con todos los productos, validaciones de datos y una hoja de ayuda. */
export async function buildProductWorkbook(products: ProductRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Balance Beauty";
  wb.created = new Date();

  const ws = wb.addWorksheet(SHEET, { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = ws.getRow(1);
  header.height = 34;
  header.eachCell((cell, i) => {
    const col = COLUMNS[i - 1];
    const locked = col.kind === "key" || col.kind === "readonly";
    cell.font = { bold: true, color: { argb: locked ? "FF5B6461" : "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: locked ? "FFE4ECE8" : "FF2F4A3F" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.note = col.note;
  });

  for (const p of products) {
    ws.addRow({
      ...p,
      status: STATUS_LABEL[p.status],
      stock: p.stock ?? "",
      brand: p.brand ?? "",
    });
  }

  const last = Math.max(products.length + 1, 2);
  COLUMNS.forEach((col, i) => {
    const letter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= last; r++) {
      const cell = ws.getCell(`${letter}${r}`);
      if (col.kind === "key" || col.kind === "readonly") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F5F3" } };
        cell.font = { color: { argb: "FF5B6461" } };
      }
      if (col.kind === "status") {
        cell.dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [`"${Object.values(STATUS_LABEL).join(",")}"`],
          showErrorMessage: true,
          errorTitle: "Estado",
          error: "Elegí Publicado, Borrador o Archivado",
        };
      } else if (col.kind === "int" || col.kind === "decimal") {
        cell.dataValidation = {
          type: col.kind === "int" ? "whole" : "decimal",
          operator: "between",
          allowBlank: !col.required,
          formulae: [col.min ?? 0, col.max ?? 100_000_000],
          showErrorMessage: true,
          errorTitle: col.header,
          error: col.note,
        };
        cell.numFmt = col.kind === "int" ? "#,##0" : "0.0";
      }
    }
  });
  ws.autoFilter = { from: "A1", to: { row: 1, column: COLUMNS.length } };

  const help = wb.addWorksheet("Cómo usarla");
  help.columns = [{ width: 30 }, { width: 90 }];
  help.addRows([
    ["Planilla de productos — Balance Beauty"],
    [],
    ["1.", "Editá las columnas verdes. Las grises (código y marca) son solo de referencia."],
    [
      "2.",
      "No agregues ni borres filas para crear o eliminar productos: eso se hace desde el admin.",
    ],
    [
      "3.",
      "Guardá el archivo en formato Excel (.xlsx) y subilo en Admin → Productos → Editar con Excel.",
    ],
    ["4.", "Antes de aplicar vas a ver la lista de cambios. Si algo está mal, no se aplica nada."],
    [],
    ["Columna", "Qué poner"],
    ...COLUMNS.map((c) => [c.header, c.note]),
  ]);
  help.getRow(1).font = { bold: true, size: 14 };
  help.getRow(8).font = { bold: true };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Lee la planilla subida: ubica las columnas por su encabezado (aunque las reordenen). */
export async function readProductWorkbook(
  data: ArrayBuffer,
): Promise<
  | { ok: true; rows: { row: number; cells: Partial<Record<Column["key"], unknown>> }[] }
  | { ok: false; error: string }
> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    return {
      ok: false,
      error: "No se pudo leer el archivo. Guardalo como Excel (.xlsx) y probá de nuevo.",
    };
  }
  const ws = wb.getWorksheet(SHEET) ?? wb.worksheets[0];
  if (!ws) return { ok: false, error: "La planilla no tiene hojas." };

  const norm = (s: unknown) =>
    String(s ?? "")
      .trim()
      .toLowerCase();
  const byHeader = new Map(COLUMNS.map((c) => [norm(c.header), c.key]));
  const colKey = new Map<number, Column["key"]>();
  ws.getRow(1).eachCell((cell, i) => {
    const key = byHeader.get(norm(cell.text));
    if (key) colKey.set(i, key);
  });
  if (![...colKey.values()].includes("sku"))
    return {
      ok: false,
      error:
        "No encontré la columna “Código (no modificar)”. Usá la planilla descargada de esta página.",
    };
  if (ws.rowCount - 1 > MAX_ROWS)
    return { ok: false, error: `Máximo ${MAX_ROWS} productos por planilla.` };

  const rows: { row: number; cells: Partial<Record<Column["key"], unknown>> }[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells: Partial<Record<Column["key"], unknown>> = {};
    for (const [i, key] of colKey) cells[key] = row.getCell(i).value;
    rows.push({ row: r, cells });
  }
  return { ok: true, rows };
}
