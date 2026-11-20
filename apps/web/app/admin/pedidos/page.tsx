import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  EmptyState,
  PageHeader,
  Panel,
  RowLink,
  adminField,
  btnSecondary,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/server";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus } from "@/lib/orders/labels";
import { formatARS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

const FILTERS: (OrderStatus | "todos")[] = [
  "todos",
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];
const dateFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Search = { estado?: string; q?: string };

function href(estado: string | null, q: string) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (q) params.set("q", q);
  const s = params.toString();
  return `/admin/pedidos${s ? `?${s}` : ""}`;
}

async function OrdersTable({ search }: { search: Promise<Search> }) {
  const { supabase } = await requireAdmin("/admin/pedidos");
  const { estado, q: rawQ } = await search;
  const filter =
    FILTERS.includes(estado as OrderStatus) && estado !== "todos" ? (estado as OrderStatus) : null;
  // Solo letras, números y separadores comunes: evita inyectar sintaxis en el filtro .or().
  const q = (rawQ ?? "")
    .replace(/[^\p{L}\p{N} @._+-]/gu, "")
    .trim()
    .slice(0, 80);

  let query = supabase
    .from("orders")
    .select("id, number, created_at, full_name, email, total, payment_method, status")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) query = query.eq("status", filter);
  if (q) {
    const n = q.replace(/^#/, "");
    query = /^\d+$/.test(n)
      ? query.eq("number", Number(n))
      : query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data: orders, error } = await query;
  if (error) throw error;

  return (
    <Panel className="gap-5">
      <form role="search" action="/admin/pedidos" className="flex flex-wrap items-end gap-3">
        {filter ? <input type="hidden" name="estado" value={filter} /> : null}
        <label className="min-w-0 flex-1 basis-64 text-sm font-medium">
          Buscar por número, nombre o email
          <span className="relative block">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder="1024 o María"
              className={cn(adminField, "pl-9")}
            />
          </span>
        </label>
        <button className={btnSecondary}>Buscar</button>
        {q ? (
          <Link
            href={href(filter, "")}
            className="inline-flex min-h-11 items-center px-2 text-sm underline"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      <nav aria-label="Filtrar por estado" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-2">
          {FILTERS.map((f) => {
            const active = (f === "todos" && !filter) || f === filter;
            return (
              <li key={f}>
                <Link
                  href={href(f === "todos" ? null : f, q)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                    active ? "border-leaf bg-leaf text-clinical" : "bg-card hover:bg-mist",
                  )}
                >
                  {f === "todos" ? "Todos" : ORDER_STATUS_LABEL[f]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!orders?.length ? (
        <EmptyState
          title={q || filter ? "No hay pedidos con ese filtro" : "Todavía no hay pedidos"}
          description={
            q || filter
              ? "Probá con otro estado o borrá la búsqueda."
              : "Cuando entre la primera compra la vas a ver acá."
          }
        />
      ) : (
        <>
          {/* Celular: tarjetas (toda la tarjeta abre el pedido) */}
          <ul className="-mx-3 grid divide-y md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <RowLink href={`/admin/pedidos/${o.id}`} className="items-start">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      #{o.number} · <span className="font-normal">{o.full_name}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {dateFmt.format(new Date(o.created_at))} ·{" "}
                      {PAYMENT_METHOD_LABEL[o.payment_method]}
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1">
                    <span className="font-medium tabular-nums">{formatARS(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </RowLink>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Pedidos más recientes</caption>
              <thead className="border-b bg-mist/50 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pedido
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pago
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-mist/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="inline-flex min-h-11 items-center font-medium text-leaf underline-offset-4 hover:underline"
                      >
                        #{o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {dateFmt.format(new Date(o.created_at))}
                    </td>
                    <td className="px-4 py-2">
                      {o.full_name}
                      <span className="block text-xs text-muted-foreground">{o.email}</span>
                    </td>
                    <td className="px-4 py-2">{PAYMENT_METHOD_LABEL[o.payment_method]}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">
                      {formatARS(o.total)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 100 ? (
            <p className="text-sm text-muted-foreground">
              Se muestran los 100 más recientes. Usá la búsqueda o los filtros para encontrar otros.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

export default function PedidosPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Abrí un pedido para acreditar el pago, preparar el envío o cancelarlo."
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <OrdersTable search={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
