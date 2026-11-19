/**
 * Planilla Excel de productos: columnas, lectura de celdas y detección de cambios.
 * Puro (sin exceljs ni base) para poder testearlo. La escritura/lectura del archivo está en
 * product-sheet.ts y la aplicación en la RPC admin_bulk_update_products (migración 17).
 */

export type SheetField =
  | "name"
  | "status"
  | "price"
  | "compare_at_price"
  | "stock"
  | "low_stock_threshold"
  | "weight_g"
  | "length_cm"
  | "width_cm"
  | "height_cm"
  | "tagline"
  | "seller_commission_percent";

type Kind = "text" | "int" | "decimal" | "status";

export type Column = {
  key: "sku" | "brand" | SheetField;
  header: string;
  kind: Kind | "key" | "readonly";
  width: number;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  note: string;
};

/** Orden de las columnas en la hoja "Productos" (no cambiar sin migrar plantillas viejas). */
export const COLUMNS: Column[] = [
  {
    key: "sku",
    header: "Código (no modificar)",
    kind: "key",
    width: 14,
    note: "Identifica el producto. No lo cambies.",
  },
  {
    key: "name",
    header: "Nombre",
    kind: "text",
    width: 42,
    required: true,
    maxLength: 120,
    note: "Entre 3 y 120 caracteres.",
  },
  {
    key: "brand",
    header: "Marca (solo lectura)",
    kind: "readonly",
    width: 16,
    note: "Se cambia desde el admin.",
  },
  {
    key: "status",
    header: "Estado",
    kind: "status",
    width: 13,
    required: true,
    note: "Publicado, Borrador o Archivado. Para publicar hace falta foto, precio y categoría.",
  },
  {
    key: "price",
    header: "Precio ($)",
    kind: "int",
    width: 12,
    required: true,
    min: 0,
    max: 100_000_000,
    note: "Pesos, sin decimales. Incluye IVA.",
  },
  {
    key: "compare_at_price",
    header: "Precio anterior / tachado ($)",
    kind: "int",
    width: 16,
    min: 1,
    max: 100_000_000,
    note: "Opcional. Tiene que ser mayor al precio. Vacío = sin tachado.",
  },
  {
    key: "stock",
    header: "Stock",
    kind: "int",
    width: 9,
    required: true,
    min: 0,
    max: 100_000,
    note: "Unidades para vender. Si sube, se suma al lote PLANILLA; si baja, sale del lote que vence primero.",
  },
  {
    key: "low_stock_threshold",
    header: "Avisar con stock bajo",
    kind: "int",
    width: 12,
    required: true,
    min: 0,
    max: 1000,
    note: "Aparece en el inicio “Hoy” cuando quedan estas unidades o menos.",
  },
  {
    key: "weight_g",
    header: "Peso (g)",
    kind: "int",
    width: 10,
    min: 1,
    max: 50_000,
    note: "Producto embalado, en gramos.",
  },
  {
    key: "length_cm",
    header: "Largo (cm)",
    kind: "decimal",
    width: 10,
    min: 0.1,
    max: 200,
    note: "Admite decimales (5,5).",
  },
  {
    key: "width_cm",
    header: "Ancho (cm)",
    kind: "decimal",
    width: 10,
    min: 0.1,
    max: 200,
    note: "Admite decimales.",
  },
  {
    key: "height_cm",
    header: "Alto (cm)",
    kind: "decimal",
    width: 10,
    min: 0.1,
    max: 200,
    note: "Admite decimales.",
  },
  {
    key: "tagline",
    header: "Para qué sirve",
    kind: "text",
    width: 40,
    maxLength: 160,
    note: "Una línea. Sin promesas terapéuticas (ANMAT).",
  },
  {
    key: "seller_commission_percent",
    header: "Comisión vendedora (%)",
    kind: "decimal",
    width: 14,
    min: 0,
    max: 60,
    note: "Opcional. Vacío = usa el % de cada vendedora.",
  },
];

export const STATUS_LABEL = {
  active: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
} as const;
export type ProductStatus = keyof typeof STATUS_LABEL;

export type ProductRow = {
  sku: string;
  name: string;
  brand: string | null;
  status: ProductStatus;
  price: number;
  compare_at_price: number | null;
  stock: number | null; // null = no controla stock
  low_stock_threshold: number;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  tagline: string | null;
  seller_commission_percent: number | null;
};

export type Value = string | number | null;

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Valor de una celda de exceljs a texto/número plano (fórmulas, texto enriquecido, links). */
export function plainCell(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return null;
  if (typeof v === "object") {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if ("result" in o) return plainCell(o.result);
    if (Array.isArray(o.richText)) return plainCell(o.richText.map((r) => r.text).join(""));
    if ("text" in o) return plainCell(o.text);
  }
  return null;
}

/**
 * Interpreta una celda según el tipo de columna. Devuelve el valor normalizado o un error
 * para mostrar. Números argentinos: "12.100" y "$ 12.100" = 12100; "5,5" = 5.5.
 */
export function parseCell(col: Column, raw: unknown): { value: Value } | { error: string } {
  const v = plainCell(raw);
  if (v === null) {
    return col.required ? { error: `${col.header}: no puede quedar vacío` } : { value: null };
  }
  if (col.kind === "text") {
    const s = String(v).replace(/\s+/g, " ").trim();
    if (col.required && s.length < 3) return { error: `${col.header}: muy corto` };
    if (col.maxLength && s.length > col.maxLength)
      return { error: `${col.header}: máximo ${col.maxLength} caracteres` };
    return { value: s };
  }
  if (col.kind === "status") {
    const s = strip(String(v));
    const found = (Object.entries(STATUS_LABEL) as [ProductStatus, string][]).find(
      ([k, label]) => strip(label) === s || k === s,
    );
    return found ? { value: found[0] } : { error: `Estado: usá Publicado, Borrador o Archivado` };
  }
  let n: number;
  if (typeof v === "number") n = v;
  else {
    let s = String(v).replace(/[$\s]/g, "");
    if (col.kind === "int") {
      // En pesos/unidades no hay decimales: los puntos y comas son separadores de miles.
      if (!/^-?[\d.,]+$/.test(s)) return { error: `${col.header}: tiene que ser un número` };
      s = s.replace(/[.,](?=\d{3}(\D|$))/g, "");
      if (/[.,]/.test(s)) return { error: `${col.header}: sin decimales` };
    } else {
      s = s.replace(",", ".");
      if (!/^-?\d+(\.\d+)?$/.test(s)) return { error: `${col.header}: tiene que ser un número` };
    }
    n = Number(s);
  }
  if (col.kind === "int" && !Number.isInteger(n)) {
    if (Math.abs(n - Math.round(n)) < 1e-9) n = Math.round(n);
    else return { error: `${col.header}: sin decimales` };
  }
  if (col.kind === "decimal") n = Math.round(n * 10) / 10;
  if (col.min !== undefined && n < col.min) return { error: `${col.header}: mínimo ${col.min}` };
  if (col.max !== undefined && n > col.max) return { error: `${col.header}: máximo ${col.max}` };
  return { value: n };
}

export type FieldChange = { field: SheetField; label: string; from: Value; to: Value };
export type RowChange = { sku: string; name: string; changes: FieldChange[] };
export type RowError = { row: number; sku: string | null; message: string };
export type Update = { sku: string } & Partial<Record<SheetField, Value>>;

const EDITABLE = COLUMNS.filter(
  (c): c is Column & { key: SheetField } => c.kind !== "key" && c.kind !== "readonly",
);

/**
 * Compara las filas de la planilla con los productos actuales. Solo devuelve lo que cambió.
 * `rows`: [número de fila, celdas por clave de columna].
 */
export function diffSheet(
  rows: { row: number; cells: Partial<Record<Column["key"], unknown>> }[],
  current: ProductRow[],
): { changes: RowChange[]; updates: Update[]; errors: RowError[]; unchanged: number } {
  const bySku = new Map(current.map((p) => [p.sku, p]));
  const seen = new Set<string>();
  const changes: RowChange[] = [];
  const updates: Update[] = [];
  const errors: RowError[] = [];
  let unchanged = 0;

  for (const { row, cells } of rows) {
    const sku = plainCell(cells.sku);
    if (sku === null) {
      // Fila totalmente vacía: se ignora. Con datos pero sin código: error.
      const hasData = EDITABLE.some((c) => plainCell(cells[c.key]) !== null);
      if (hasData) errors.push({ row, sku: null, message: "Falta el código del producto" });
      continue;
    }
    const code = String(sku).trim();
    const product = bySku.get(code);
    if (!product) {
      errors.push({
        row,
        sku: code,
        message: "Ese código no existe (los productos nuevos se crean desde el admin)",
      });
      continue;
    }
    if (seen.has(code)) {
      errors.push({ row, sku: code, message: "Código repetido en la planilla" });
      continue;
    }
    seen.add(code);

    const rowChanges: FieldChange[] = [];
    const update: Update = { sku: code };
    let rowError = false;
    for (const col of EDITABLE) {
      if (!(col.key in cells)) continue; // columna ausente: no se toca
      if (col.key === "stock" && product.stock === null) continue; // no controla stock
      const parsed = parseCell(col, cells[col.key]);
      if ("error" in parsed) {
        errors.push({ row, sku: code, message: parsed.error });
        rowError = true;
        continue;
      }
      const before = product[col.key] as Value;
      const after = parsed.value;
      if ((before ?? null) !== (after ?? null)) {
        rowChanges.push({ field: col.key, label: col.header, from: before ?? null, to: after });
        update[col.key] = after;
      }
    }
    if (rowError) continue;
    // Regla cruzada: el tachado tiene que superar al precio.
    const price = (update.price ?? product.price) as number;
    const compare = (
      "compare_at_price" in update ? update.compare_at_price : product.compare_at_price
    ) as number | null;
    if (compare !== null && compare !== undefined && compare <= price) {
      errors.push({ row, sku: code, message: "El precio anterior tiene que ser mayor al precio" });
      continue;
    }
    if (rowChanges.length) {
      changes.push({
        sku: code,
        name: (update.name as string) ?? product.name,
        changes: rowChanges,
      });
      updates.push(update);
    } else unchanged++;
  }
  return { changes, updates, errors, unchanged };
}
