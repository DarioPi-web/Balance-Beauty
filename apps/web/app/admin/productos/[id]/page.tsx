import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editProductImage, saveProduct, uploadProductImage } from "@/actions/admin-products";
import { ImageUploader } from "@/components/admin/image-uploader";
import { InventorySection, type Lot, type Movement } from "@/components/admin/inventory-section";
import { imageSrc } from "@/lib/admin/image-paths";
import { requireAdmin } from "@/lib/admin/server";
import imageLoader from "@/lib/image-loader";
import { UUID_RE } from "@/lib/orders/types";
import { formatARS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Producto" };

const field = "mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base";
const area = "mt-1 block w-full rounded-xl border bg-background px-3 py-2 text-base";
const label = "block text-sm font-medium";
const hint = "mt-1 block text-sm font-normal text-muted-foreground";
const section = "grid gap-4 rounded-2xl border bg-card p-5";
const h2 = "font-display text-2xl font-semibold";
const check = "flex min-h-11 items-center gap-3";
const smallBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm hover:bg-mist disabled:opacity-40";

const OK: Record<string, string> = {
  creado: "Borrador creado. Completá los datos, subí fotos y publicalo cuando esté listo.",
  guardado: "Cambios guardados. La tienda se actualiza al instante.",
  foto: "Fotos actualizadas.",
  fotos: "Fotos subidas.",
  foto_borrada: "Foto borrada.",
  recibido: "Mercadería recibida: se sumó al stock y al lote.",
  ajustado: "Ajuste registrado en el historial.",
  lote: "Estado del lote actualizado.",
};

async function ProductEditor({
  params,
  search,
}: {
  params: Promise<{ id: string }>;
  search: Promise<{ ok?: string; error?: string; falta?: string }>;
}) {
  const [{ id }, { ok, error: errMsg, falta }] = await Promise.all([params, search]);
  if (!UUID_RE.test(id)) notFound();
  const { supabase } = await requireAdmin(`/admin/productos/${id}`);

  const [prod, brands, cats, cons, lots, moves] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, slug, name, tagline, description, how_to_use, price, compare_at_price, price_without_national_taxes, stock, reserved_stock, low_stock_threshold, unit_cost, track_stock, status, is_featured, requires_prescription, brand_id, weight_g, length_cm, width_cm, height_cm, seo_title, seo_description, product_categories(category_id), product_concerns(concern_id, is_primary), product_images(id, storage_path, alt, sort_order)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("concerns").select("id, name").order("sort_order"),
    supabase
      .from("inventory_lots")
      .select("id, lot_code, expires_on, qty_on_hand, status, received_on, unit_cost")
      .eq("product_id", id)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("stock_movements")
      .select("id, qty, kind, reason, created_at, lot_id")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  if (prod.error) throw prod.error;
  const p = prod.data;
  if (!p) notFound();

  const catIds = new Set((p.product_categories ?? []).map((c) => c.category_id));
  const conIds = new Set((p.product_concerns ?? []).map((c) => c.concern_id));
  const primary = (p.product_concerns ?? []).find((c) => c.is_primary)?.concern_id ?? "";
  const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <article className="grid gap-6">
      <p>
        <Link
          href="/admin/productos"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          ← Productos
        </Link>
      </p>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-semibold">{p.name}</h1>
        <span className="text-sm text-muted-foreground">Código {p.sku}</span>
        {p.status === "active" ? (
          <Link
            href={`/producto/${p.slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
          >
            Ver en la tienda (se abre en otra pestaña)
          </Link>
        ) : null}
      </header>

      {falta ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          Se guardaron los cambios, pero <strong>todavía no se publicó</strong>: falta{" "}
          {falta.slice(0, 120)}. Completalo y elegí “Publicado” de nuevo.
        </p>
      ) : null}
      {ok && OK[ok] && !falta ? (
        <p role="status" className="rounded-xl border border-leaf/40 bg-mist px-4 py-3">
          {OK[ok]}
        </p>
      ) : null}
      {errMsg ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {errMsg}
        </p>
      ) : null}

      {/* Fotos: formularios propios (no se pueden anidar dentro del formulario del producto). */}
      <section id="fotos" className={section} aria-labelledby="fotos-t">
        <h2 id="fotos-t" className={h2}>
          Fotos
        </h2>
        <p className="text-sm text-muted-foreground">
          La primera es la principal (listados, Google y redes). Para publicar hace falta al menos
          una.
        </p>
        {images.length ? (
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <li key={img.id} className="grid gap-2 rounded-xl border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del admin */}
                <img
                  src={imageLoader({ src: imageSrc(img.storage_path), width: 384 })}
                  alt={img.alt ?? ""}
                  width={384}
                  height={384}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg bg-mist object-cover"
                />
                <form action={editProductImage} className="grid gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <label className={label}>
                    Descripción para lectores de pantalla
                    <input
                      name="alt"
                      defaultValue={img.alt ?? ""}
                      maxLength={160}
                      className={field}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button name="op" value="alt" className={smallBtn}>
                      Guardar texto
                    </button>
                    <button
                      name="op"
                      value="up"
                      disabled={i === 0}
                      className={smallBtn}
                      aria-label={`Mover la foto ${i + 1} antes`}
                    >
                      ↑
                    </button>
                    <button
                      name="op"
                      value="down"
                      disabled={i === images.length - 1}
                      className={smallBtn}
                      aria-label={`Mover la foto ${i + 1} después`}
                    >
                      ↓
                    </button>
                    <button
                      name="op"
                      value="delete"
                      className={`${smallBtn} border-alert text-alert`}
                      aria-label={`Borrar la foto ${i + 1}`}
                    >
                      Borrar
                    </button>
                  </div>
                  {i === 0 ? <p className="text-xs text-muted-foreground">Principal</p> : null}
                </form>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl bg-rose-soft px-4 py-3 text-sm">Todavía no tiene fotos.</p>
        )}
        <ImageUploader productId={p.id} upload={uploadProductImage} />
      </section>

      <InventorySection
        productId={p.id}
        trackStock={p.track_stock}
        stock={p.stock}
        reserved={p.reserved_stock}
        lots={(lots.data ?? []) as Lot[]}
        movements={(moves.data ?? []) as Movement[]}
      />

      <form action={saveProduct} className="grid gap-6">
        <input type="hidden" name="id" value={p.id} />

        <section className={section} aria-labelledby="estado-t">
          <h2 id="estado-t" className={h2}>
            Publicación
          </h2>
          <label className={label}>
            Estado
            <select name="status" defaultValue={p.status} className={field}>
              <option value="draft">Borrador (no se ve en la tienda)</option>
              <option value="active">Publicado</option>
              <option value="archived">Archivado (oculto, se conserva)</option>
            </select>
            <span className={hint}>
              Para publicar hacen falta precio, al menos una foto y una categoría.
            </span>
          </label>
          <label className={check}>
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={p.is_featured}
              className="size-5"
            />
            Destacado en la página de inicio
          </label>
          <label className={check}>
            <input
              type="checkbox"
              name="requires_prescription"
              defaultChecked={p.requires_prescription}
              className="size-5"
            />
            Requiere asesoramiento (sin botón de compra; consulta por WhatsApp)
          </label>
        </section>

        <section className={section} aria-labelledby="datos-t">
          <h2 id="datos-t" className={h2}>
            Datos
          </h2>
          <label className={label}>
            Nombre
            <input
              name="name"
              defaultValue={p.name}
              required
              minLength={3}
              maxLength={120}
              className={field}
            />
          </label>
          <label className={label}>
            Marca
            <select name="brand_id" defaultValue={p.brand_id ?? ""} className={field}>
              <option value="">Sin marca</option>
              {(brands.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Para qué sirve (una línea)
            <input
              name="tagline"
              defaultValue={p.tagline ?? ""}
              maxLength={160}
              className={field}
            />
            <span className={hint}>
              Ej.: “Limpia sin resecar y ayuda a controlar el brillo”. Evitá “cura”, “trata” o
              “elimina”: un cosmético no puede prometer efectos terapéuticos (ANMAT).
            </span>
          </label>
          <label className={label}>
            Descripción
            <textarea
              name="description"
              defaultValue={p.description ?? ""}
              rows={8}
              maxLength={5000}
              className={area}
            />
          </label>
          <label className={label}>
            Modo de uso
            <textarea
              name="how_to_use"
              defaultValue={p.how_to_use ?? ""}
              rows={4}
              maxLength={2000}
              className={area}
            />
          </label>
        </section>

        <section className={section} aria-labelledby="precio-t">
          <h2 id="precio-t" className={h2}>
            Precio y stock
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Precio (ARS, sin decimales)
              <input
                name="price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={p.price}
                required
                className={field}
              />
              <span className={hint}>
                Sin impuestos nacionales:{" "}
                {p.price_without_national_taxes != null
                  ? formatARS(p.price_without_national_taxes)
                  : "—"}{" "}
                (se recalcula solo al guardar).
              </span>
            </label>
            <label className={label}>
              Precio anterior (tachado, opcional)
              <input
                name="compare_at_price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={p.compare_at_price ?? ""}
                className={field}
              />
            </label>
            <div className={label}>
              Stock para vender
              <p className="mt-1 flex min-h-11 items-center rounded-xl border bg-mist/50 px-3 text-base tabular-nums">
                {p.stock - p.reserved_stock} disponibles
                {p.reserved_stock > 0 ? ` · ${p.reserved_stock} reservadas` : ""}
              </p>
              <span className={hint}>
                Se cambia en{" "}
                <a href="#inventario" className="underline underline-offset-2">
                  Inventario
                </a>{" "}
                (recibir mercadería o ajustar), con lote y motivo.
              </span>
            </div>
            <label className={label}>
              Avisar con stock bajo cuando queden
              <input
                name="low_stock_threshold"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                defaultValue={p.low_stock_threshold}
                className={field}
              />
              <span className={hint}>unidades o menos (aparece en el inicio “Hoy”).</span>
            </label>
            <label className={`${check} self-center`}>
              <input
                type="checkbox"
                name="track_stock"
                defaultChecked={p.track_stock}
                className="size-5"
              />
              Controlar stock (si se destilda, se vende siempre)
            </label>
          </div>
        </section>

        <section className={section} aria-labelledby="clasif-t">
          <h2 id="clasif-t" className={h2}>
            Categorías y preocupaciones
          </h2>
          <fieldset>
            <legend className={label}>Categorías</legend>
            <div className="mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {(cats.data ?? []).map((c) => (
                <label key={c.id} className={check}>
                  <input
                    type="checkbox"
                    name="category_ids"
                    value={c.id}
                    defaultChecked={catIds.has(c.id)}
                    className="size-5"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={label}>Preocupaciones que ayuda a mejorar</legend>
            <div className="mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {(cons.data ?? []).map((c) => (
                <label key={c.id} className={check}>
                  <input
                    type="checkbox"
                    name="concern_ids"
                    value={c.id}
                    defaultChecked={conIds.has(c.id)}
                    className="size-5"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={label}>
            Preocupación principal
            <select name="primary_concern" defaultValue={primary} className={field}>
              <option value="">Ninguna</option>
              {(cons.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className={hint}>
              Tiene que estar tildada arriba. Ordena el producto en esa página.
            </span>
          </label>
        </section>

        <section className={section} aria-labelledby="envio-t">
          <h2 id="envio-t" className={h2}>
            Envío
          </h2>
          <p className="text-sm text-muted-foreground">
            Peso y medidas del producto embalado: se usan para cotizar con Andreani o Correo.
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            <label className={label}>
              Peso (g)
              <input
                name="weight_g"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={p.weight_g ?? ""}
                className={field}
              />
            </label>
            <label className={label}>
              Largo (cm)
              <input
                name="length_cm"
                inputMode="decimal"
                defaultValue={p.length_cm ?? ""}
                className={field}
              />
            </label>
            <label className={label}>
              Ancho (cm)
              <input
                name="width_cm"
                inputMode="decimal"
                defaultValue={p.width_cm ?? ""}
                className={field}
              />
            </label>
            <label className={label}>
              Alto (cm)
              <input
                name="height_cm"
                inputMode="decimal"
                defaultValue={p.height_cm ?? ""}
                className={field}
              />
            </label>
          </div>
        </section>

        <section className={section} aria-labelledby="seo-t">
          <h2 id="seo-t" className={h2}>
            Google (opcional)
          </h2>
          <label className={label}>
            Título en Google
            <input
              name="seo_title"
              defaultValue={p.seo_title ?? ""}
              maxLength={70}
              className={field}
            />
            <span className={hint}>Hasta 70 caracteres. Si queda vacío se usa el nombre.</span>
          </label>
          <label className={label}>
            Descripción en Google
            <textarea
              name="seo_description"
              defaultValue={p.seo_description ?? ""}
              rows={2}
              maxLength={170}
              className={area}
            />
            <span className={hint}>
              Hasta 170 caracteres. Si queda vacío se usa “para qué sirve”.
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Dirección: <code>/producto/{p.slug}</code> (no se cambia para no perder
            posicionamiento).
          </p>
        </section>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 p-3 safe-bottom shadow-lg backdrop-blur">
          <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover">
            Guardar cambios
          </button>
          <Link
            href="/admin/productos"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </article>
  );
}

export default function ProductoAdminPage({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <ProductEditor
        params={params}
        search={searchParams as Promise<{ ok?: string; error?: string; falta?: string }>}
      />
    </Suspense>
  );
}
