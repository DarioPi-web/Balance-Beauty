"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { readProductWorkbook } from "@/lib/admin/product-sheet";
import {
  diffSheet,
  type RowChange,
  type RowError,
  type Update,
} from "@/lib/admin/product-sheet-core";
import { loadSheetProducts } from "@/lib/admin/sheet-data";
import { CATALOG_TAG } from "@/lib/catalog";

export type PreviewState =
  | { step: "idle" }
  | { step: "error"; message: string }
  | {
      step: "preview";
      fileName: string;
      changes: RowChange[];
      errors: RowError[];
      unchanged: number;
      payload: string; // JSON de los cambios a aplicar (se re-valida al aplicar)
    }
  | {
      step: "done";
      updated: number;
      stockChanges: number;
      notPublished: string[];
    };

const MAX_BYTES = 4 * 1024 * 1024;

/** Paso 1: lee la planilla, la compara con la base y devuelve la vista previa. No guarda nada. */
export async function previewProductSheet(
  _prev: PreviewState,
  fd: FormData,
): Promise<PreviewState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { step: "error", message: "Elegí la planilla (.xlsx)." };
  if (!/\.xlsx$/i.test(file.name))
    return {
      step: "error",
      message:
        "El archivo tiene que ser Excel (.xlsx). Si lo editaste en otro programa, guardalo como .xlsx.",
    };
  if (file.size > MAX_BYTES) return { step: "error", message: "El archivo supera los 4 MB." };

  const { supabase } = await requireAdmin("/admin/productos/planilla");
  const read = await readProductWorkbook(await file.arrayBuffer());
  if (!read.ok) return { step: "error", message: read.error };
  const current = await loadSheetProducts(supabase);
  const diff = diffSheet(read.rows, current);
  return {
    step: "preview",
    fileName: file.name.slice(0, 120),
    changes: diff.changes,
    errors: diff.errors.slice(0, 200),
    unchanged: diff.unchanged,
    payload: JSON.stringify(diff.updates),
  };
}

const value = z.union([z.string().max(200), z.number().finite(), z.null()]);
const updateSchema = z
  .object({
    sku: z.string().min(1).max(40),
    name: value.optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
    price: z.number().int().min(0).max(100_000_000).optional(),
    compare_at_price: z.number().int().positive().max(100_000_000).nullable().optional(),
    stock: z.number().int().min(0).max(100_000).optional(),
    low_stock_threshold: z.number().int().min(0).max(1000).optional(),
    weight_g: z.number().int().positive().max(50_000).nullable().optional(),
    length_cm: z.number().positive().max(200).nullable().optional(),
    width_cm: z.number().positive().max(200).nullable().optional(),
    height_cm: z.number().positive().max(200).nullable().optional(),
    tagline: z.string().max(160).nullable().optional(),
    seller_commission_percent: z.number().min(0).max(60).nullable().optional(),
  })
  .strict();

/** Paso 2: aplica los cambios confirmados. Re-valida todo; la base vuelve a validar. */
export async function applyProductSheet(_prev: PreviewState, fd: FormData): Promise<PreviewState> {
  let rows: Update[];
  try {
    rows = z
      .array(updateSchema)
      .min(1)
      .max(2000)
      .parse(JSON.parse(String(fd.get("payload") ?? "[]"))) as Update[];
  } catch {
    return { step: "error", message: "Los cambios no son válidos. Volvé a subir la planilla." };
  }
  const { supabase } = await requireAdmin("/admin/productos/planilla");
  const { data, error } = await supabase.rpc("admin_bulk_update_products", { p_rows: rows });
  if (error) {
    if (error.hint !== "admin")
      console.error(
        JSON.stringify({ event: "admin.sheet.apply", code: error.code, message: error.message }),
      );
    return {
      step: "error",
      message:
        error.hint === "admin"
          ? `No se aplicó ningún cambio: ${error.message}`
          : "No se pudieron aplicar los cambios. No se modificó nada.",
    };
  }
  updateTag(CATALOG_TAG);
  const r = data as { updated: number; stock_changes: number; not_published: string[] };
  return {
    step: "done",
    updated: r.updated,
    stockChanges: r.stock_changes,
    notPublished: r.not_published ?? [],
  };
}
