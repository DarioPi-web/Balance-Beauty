import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createProduct } from "@/actions/admin-products";
import { imageSrc } from "@/lib/admin/image-paths";
import { requireAdmin } from "@/lib/admin/server";
import imageLoader from "@/lib/image-loader";
import { formatARS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Productos" };

const FILTERS = {
  todos: "Todos",
  active: "Publicados",
  draft: "Borradores",
  archived: "Archivados",
  sin_foto: "Sin foto",
  sin_stock: "Sin stock",
  stock_bajo: "Stock bajo",
} as const;
type Filter = keyof typeof FILTERS;

const STATUS = {
  active: { label: "Publicado", cls: "bg-mist text-leaf" },
  draft: { label: "Borrador", cls: "bg-rose-soft text-graphite" },
  archived: { label: "Archivado", cls: "bg-muted text-muted-foreground" },
} as const;

const field = "block min-h-11 w-full rounded-xl border bg-background px-3 text-base";

async function ProductsTable({
  search,
}: {
  search: Promise<{ q?: string; f?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/productos");
  const { q = "", f, error: errMsg } = await search;
  const filter: Filter = f && f in FILTERS ? (f as Filter) : "todos";

  let query = supabase
    .from("products")
    .select(
      "id, sku, slug, name, price, stock, reserved_stock, low_stock_threshold, status, track_stock, brand:brands(name), product_images(storage_path, sort_order)",
    )
    .order("name")
    .limit(500);
  const term = q.trim().slice(0, 80);
  if (term) {
    const like = `%${term.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`name.ilike.${like},sku.ilike.${like}`);
  }
  if (filter === "active" || filter === "draft" || filter === "archived")
    query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? [])
    .map((p) => {
      const available = p.stock - p.reserved_stock;
      const first = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
      return { ...p, available, thumb: first ? imageSrc(first.storage_path) : null };
    })
    .filter((p) =>
      filter === "sin_foto"
        ? !p.thumb
        : filter === "sin_stock"
          ? p.track_stock && p.available <= 0
          : filter === "stock_bajo"
            ? p.track_stock && p.available > 0 && p.available <= p.low_stock_threshold
            : true,
    );

  return (
    <>
      {errMsg ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {errMsg}
        </p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="grid min-w-60 flex-1 gap-1 text-sm font-medium">
          Buscar por nombre o código
          <input name="q" defaultValue={term} className={field} type="search" />
        </label>
        <input type="hidden" name="f" value={filter} />
        <button className="inline-flex min-h-11 items-center rounded-full border px-5 font-medium">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar productos" className="flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((k) => (
          <Link
            key={k}
            href={`/admin/productos?${new URLSearchParams({ ...(term ? { q: term } : {}), f: k })}`}
            aria-current={filter === k ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
              filter === k ? "border-leaf bg-leaf text-clinical" : "bg-card hover:bg-mist",
            )}
          >
            {FILTERS[k]}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground" role="status">
        {rows.length} producto{rows.length === 1 ? "" : "s"}
      </p>

      <ul className="grid gap-2">
        {rows.map((p) => {
          const brand = (p.brand as { name: string } | null)?.name;
          return (
            <li key={p.id}>
              <Link
                href={`/admin/productos/${p.id}`}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl border bg-card p-3 hover:border-leaf sm:grid-cols-[56px_1fr_auto_auto_auto]"
              >
                {p.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura de 56 px desde el loader
                  <img
                    src={imageLoader({ src: p.thumb, width: 256 })}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-xl bg-mist object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-rose-soft text-xs">
                    Sin foto
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[brand, `Cód. ${p.sku}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS[p.status].cls)}
                >
                  {STATUS[p.status].label}
                </span>
                <span className="hidden text-right tabular-nums sm:block">
                  {p.price ? formatARS(p.price) : "Sin precio"}
                </span>
                <span
                  className={cn(
                    "hidden text-right text-sm tabular-nums sm:block",
                    p.track_stock && p.available <= 0 && "font-semibold text-alert",
                  )}
                >
                  {p.track_stock ? `Stock ${p.available}` : "Sin control"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function ProductosPage({ searchParams }: PageProps<"/admin/productos">) {
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Productos</h1>
        <form action={createProduct} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Nuevo producto
            <input
              name="name"
              required
              minLength={3}
              maxLength={120}
              placeholder="Nombre del producto"
              className={field}
            />
          </label>
          <button className="inline-flex min-h-11 items-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover">
            Crear borrador
          </button>
        </form>
      </header>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <ProductsTable
          search={searchParams as Promise<{ q?: string; f?: string; error?: string }>}
        />
      </Suspense>
    </div>
  );
}
