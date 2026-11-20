import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Plus, Search as SearchIcon } from "lucide-react";
import { createProduct } from "@/actions/admin-products";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  adminField,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";
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
  active: { label: "Publicado", tone: "success" },
  draft: { label: "Borrador", tone: "warning" },
  archived: { label: "Archivado", tone: "muted" },
} as const;

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
      <Flash error={errMsg} />
      <Panel className="gap-5">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <label className="min-w-0 flex-1 basis-64 text-sm font-medium">
            Buscar por nombre o código
            <span className="relative block">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                name="q"
                defaultValue={term}
                className={cn(adminField, "pl-9")}
                type="search"
              />
            </span>
          </label>
          <input type="hidden" name="f" value={filter} />
          <button className={btnSecondary}>Buscar</button>
          {term ? (
            <Link
              href={`/admin/productos?f=${filter}`}
              className="inline-flex min-h-11 items-center px-2 text-sm underline"
            >
              Limpiar
            </Link>
          ) : null}
        </form>

        <nav aria-label="Filtrar productos" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2">
            {(Object.keys(FILTERS) as Filter[]).map((k) => (
              <li key={k}>
                <Link
                  href={`/admin/productos?${new URLSearchParams({ ...(term ? { q: term } : {}), f: k })}`}
                  aria-current={filter === k ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                    filter === k ? "border-leaf bg-leaf text-clinical" : "bg-card hover:bg-mist",
                  )}
                >
                  {FILTERS[k]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-sm text-muted-foreground" role="status">
          {rows.length} producto{rows.length === 1 ? "" : "s"}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            title="No hay productos con ese filtro"
            description="Probá con otra búsqueda o filtro, o creá un producto nuevo."
          />
        ) : null}
        <ul className="grid gap-2">
          {rows.map((p) => {
            const brand = (p.brand as { name: string } | null)?.name;
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-leaf hover:bg-mist/30 sm:grid-cols-[56px_minmax(0,1fr)_auto_7rem_7rem]"
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
                  <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
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
      </Panel>
    </>
  );
}

export default function ProductosPage({ searchParams }: PageProps<"/admin/productos">) {
  return (
    <>
      <PageHeader
        title="Productos"
        description="Fotos, descripciones, precios y stock. Para cambios en muchos productos a la vez usá la planilla."
        actions={
          <>
            <Link href="/admin/productos/planilla" className={btnSecondary}>
              <FileSpreadsheet aria-hidden="true" className="size-4" />
              Editar con Excel
            </Link>
            <a href="#nuevo" className={btnPrimary}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo producto
            </a>
          </>
        }
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <ProductsTable
          search={searchParams as Promise<{ q?: string; f?: string; error?: string }>}
        />
      </Suspense>
      <Panel
        id="nuevo"
        tone="quiet"
        title="Nuevo producto"
        description="Se crea como borrador: no se ve en la tienda hasta que tenga foto, precio y lo publiques."
      >
        <form action={createProduct} className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 basis-64 text-sm font-medium">
            Nombre del producto
            <input
              name="name"
              required
              minLength={3}
              maxLength={120}
              placeholder="Ej.: Serum de vitamina C 30 ml"
              className={adminField}
            />
          </label>
          <button className={btnPrimary}>Crear borrador</button>
        </form>
      </Panel>
    </>
  );
}
