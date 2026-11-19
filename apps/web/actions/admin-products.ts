"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import {
  BUCKET,
  imageKeys,
  keysFromStoragePath,
  MASTER_WIDTH,
  SHARE_WIDTH,
} from "@/lib/admin/image-paths";
import { CATALOG_TAG } from "@/lib/catalog";

const uuid = z.string().uuid();
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : undefined;
};
const back = (id: string, { anchor, ...q }: Record<string, string>) =>
  redirect(`/admin/productos/${id}?${new URLSearchParams(q)}${anchor ? `#${anchor}` : ""}`);

/** Error de la base con hint 'admin' = mensaje para mostrar; si no, genérico y al log. */
function dbMessage(error: { hint?: string | null; message: string; code?: string }, event: string) {
  if (error.hint === "admin") return error.message;
  console.error(JSON.stringify({ event, code: error.code, message: error.message }));
  return "No se pudo guardar. Probá de nuevo.";
}

// ── Alta ─────────────────────────────────────────────────────────────────────────────────
export async function createProduct(fd: FormData): Promise<void> {
  const name = z.string().trim().min(3).max(120).safeParse(str(fd, "name"));
  if (!name.success)
    redirect(
      `/admin/productos?error=${encodeURIComponent("El nombre tiene que tener entre 3 y 120 caracteres")}`,
    );
  const { supabase } = await requireAdmin("/admin/productos");
  const { data, error } = await supabase.rpc("admin_create_product", { p_name: name.data });
  if (error || !data)
    redirect(
      `/admin/productos?error=${encodeURIComponent(error ? dbMessage(error, "admin.product.create") : "No se pudo crear")}`,
    );
  redirect(`/admin/productos/${data}?ok=creado`);
}

// ── Guardar ──────────────────────────────────────────────────────────────────────────────
const money = z.coerce.number().int().min(0).max(100_000_000);
const optInt = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(max).nullable());
const optCm = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
  .pipe(z.number().positive().max(200).nullable());
const text = (max: number) => z.string().trim().max(max);

const productSchema = z.object({
  name: text(120).min(3, "El nombre es obligatorio"),
  tagline: text(160),
  description: text(5000),
  how_to_use: text(2000),
  price: money,
  compare_at_price: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().positive().max(100_000_000).nullable()),
  stock: z.coerce.number().int().min(0).max(100_000),
  track_stock: z.boolean(),
  status: z.enum(["draft", "active", "archived"]),
  is_featured: z.boolean(),
  requires_prescription: z.boolean(),
  brand_id: z.union([uuid, z.literal("")]),
  weight_g: optInt(50_000),
  length_cm: optCm,
  width_cm: optCm,
  height_cm: optCm,
  seo_title: text(70),
  seo_description: text(170),
});

export async function saveProduct(fd: FormData): Promise<void> {
  const id = str(fd, "id") ?? "";
  if (!uuid.safeParse(id).success) redirect("/admin/productos");
  const parsed = productSchema.safeParse({
    name: str(fd, "name") ?? "",
    tagline: str(fd, "tagline") ?? "",
    description: str(fd, "description") ?? "",
    how_to_use: str(fd, "how_to_use") ?? "",
    price: str(fd, "price") ?? "",
    compare_at_price: str(fd, "compare_at_price") ?? "",
    stock: str(fd, "stock") ?? "",
    track_stock: fd.get("track_stock") === "on",
    status: str(fd, "status"),
    is_featured: fd.get("is_featured") === "on",
    requires_prescription: fd.get("requires_prescription") === "on",
    brand_id: str(fd, "brand_id") ?? "",
    weight_g: str(fd, "weight_g") ?? "",
    length_cm: str(fd, "length_cm") ?? "",
    width_cm: str(fd, "width_cm") ?? "",
    height_cm: str(fd, "height_cm") ?? "",
    seo_title: str(fd, "seo_title") ?? "",
    seo_description: str(fd, "seo_description") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    back(id, {
      error: `Revisá el campo "${String(issue?.path[0] ?? "")}": ${issue?.message ?? "dato inválido"}`,
    });
  }
  const ids = (k: string) => fd.getAll(k).filter((v): v is string => uuid.safeParse(v).success);
  const concerns = ids("concern_ids");
  const primary = str(fd, "primary_concern");

  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { error } = await supabase.rpc("admin_save_product", {
    p_id: id,
    p_data: parsed.data!,
    p_category_ids: ids("category_ids"),
    p_concern_ids: concerns,
    p_primary_concern: primary && concerns.includes(primary) ? primary : undefined,
  });
  if (error) back(id, { error: dbMessage(error, "admin.product.save") });
  updateTag(CATALOG_TAG);
  back(id, { ok: "guardado" });
}

// ── Fotos ────────────────────────────────────────────────────────────────────────────────
const MAX_BYTES = 4 * 1024 * 1024; // límite de Vercel 4,5 MB: el navegador achica antes de subir
const MIN_SIDE = 600;
export type UploadResult = { ok: true } | { ok: false; error: string };

/**
 * Sube UNA foto (el panel las manda de a una, ya achicadas a 2000 px en el navegador).
 * Normaliza (rotación EXIF, sRGB, sin metadatos) y guarda la maestra AVIF de 1600 px, las 5
 * variantes del loader y un JPEG para compartir. Devuelve el resultado (no redirige).
 */
export async function uploadProductImage(fd: FormData): Promise<UploadResult> {
  const id = str(fd, "id") ?? "";
  const file = fd.get("file");
  const name = str(fd, "name") ?? "foto";
  if (!uuid.safeParse(id).success || !(file instanceof File) || file.size === 0)
    return { ok: false, error: "Foto inválida" };
  if (file.size > MAX_BYTES || !/^image\/(jpeg|png|webp|avif)$/.test(file.type))
    return { ok: false, error: `${name}: formato o tamaño no admitido` };

  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { data: product } = await supabase
    .from("products")
    .select("slug, name, product_images(sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (!product) return { ok: false, error: "Producto inexistente" };

  const keys = imageKeys(product.slug, randomUUID().slice(0, 12));
  const store = supabase.storage.from(BUCKET);
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .toColourspace("srgb");
    const meta = await input.clone().metadata();
    const side = Math.min(meta.width ?? 0, meta.height ?? 0);
    if (side < MIN_SIDE)
      return { ok: false, error: `${name}: muy chica (${side} px); mínimo ${MIN_SIDE} px de lado` };

    const resize = (w: number) =>
      input.clone().resize({ width: w, height: w, fit: "inside", withoutEnlargement: true });
    const master = await resize(MASTER_WIDTH)
      .avif({ quality: 60, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const outputs: { key: string; body: Buffer; type: string }[] = [
      { key: keys.master, body: master.data, type: "image/avif" },
      {
        key: keys.share,
        body: await resize(SHARE_WIDTH).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
        type: "image/jpeg",
      },
    ];
    for (const v of keys.variants) {
      outputs.push({
        key: v.key,
        body: await resize(v.width).avif({ quality: 55, effort: 4 }).toBuffer(),
        type: "image/avif",
      });
    }
    for (const o of outputs) {
      const { error } = await store.upload(o.key, o.body, {
        contentType: o.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw new Error(error.message);
    }
    const order = Math.max(-1, ...(product.product_images ?? []).map((i) => i.sort_order)) + 1;
    const { error } = await supabase.from("product_images").insert({
      product_id: id,
      storage_path: keys.master,
      alt: product.name,
      width: master.info.width,
      height: master.info.height,
      sort_order: order,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error(JSON.stringify({ event: "admin.product.image_upload", error: String(e) }));
    await store.remove([keys.master, keys.share, ...keys.variants.map((v) => v.key)]);
    return { ok: false, error: `${name}: no se pudo procesar` };
  }
  updateTag(CATALOG_TAG);
  return { ok: true };
}

const imageAction = z.object({
  id: uuid,
  image_id: uuid,
  op: z.enum(["up", "down", "delete", "alt"]),
  alt: z.string().trim().max(160).optional(),
});

/** Ordenar, describir (alt) o borrar una foto. */
export async function editProductImage(fd: FormData): Promise<void> {
  const parsed = imageAction.safeParse({
    id: str(fd, "id"),
    image_id: str(fd, "image_id"),
    op: str(fd, "op"),
    alt: str(fd, "alt"),
  });
  if (!parsed.success) redirect("/admin/productos");
  const { id, image_id, op, alt } = parsed.data;
  const anchor = "fotos";
  const { supabase } = await requireAdmin(`/admin/productos/${id}`);
  const { data: images } = await supabase
    .from("product_images")
    .select("id, storage_path, sort_order")
    .eq("product_id", id)
    .order("sort_order");
  const list = images ?? [];
  const idx = list.findIndex((i) => i.id === image_id);
  if (idx < 0) back(id, { error: "La foto ya no existe", anchor });

  if (op === "alt") {
    if (!alt || alt.length < 3) back(id, { error: "Describí la foto (mínimo 3 letras)", anchor });
    await supabase.from("product_images").update({ alt }).eq("id", image_id);
  } else if (op === "delete") {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("id", id)
      .eq("status", "active");
    if (count && list.length === 1)
      back(id, { error: "Un producto publicado necesita al menos una foto", anchor });
    const { error } = await supabase.from("product_images").delete().eq("id", image_id);
    if (error) back(id, { error: dbMessage(error, "admin.product.image_delete"), anchor });
    const keys = keysFromStoragePath(list[idx].storage_path);
    // Las fotos heredadas (/products/...) son archivos del sitio: solo se quita la fila.
    if (keys) await supabase.storage.from(BUCKET).remove(keys);
  } else {
    const swap = op === "up" ? idx - 1 : idx + 1;
    if (swap >= 0 && swap < list.length) {
      // Reasigna 0..n-1 con el intercambio aplicado (los órdenes heredados pueden repetirse).
      const ordered = [...list];
      [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
      await Promise.all(
        ordered.map((img, i) =>
          img.sort_order === i
            ? null
            : supabase.from("product_images").update({ sort_order: i }).eq("id", img.id),
        ),
      );
    }
  }

  updateTag(CATALOG_TAG);
  back(id, { ok: op === "delete" ? "foto_borrada" : "foto", anchor });
}
