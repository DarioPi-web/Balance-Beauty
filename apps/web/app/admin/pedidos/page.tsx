import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
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

async function OrdersTable({ search }: { search: Promise<{ estado?: string }> }) {
  const { supabase } = await requireAdmin("/admin/pedidos");
  const { estado } = await search;
  const filter =
    FILTERS.includes(estado as OrderStatus) && estado !== "todos" ? (estado as OrderStatus) : null;

  let q = supabase
    .from("orders")
    .select("id, number, created_at, full_name, email, total, payment_method, status")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) q = q.eq("status", filter);
  const { data: orders, error } = await q;
  if (error) throw error;

  return (
    <>
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f === "todos" && !filter) || f === filter;
          return (
            <Link
              key={f}
              href={f === "todos" ? "/admin/pedidos" : `/admin/pedidos?estado=${f}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                active ? "border-leaf bg-leaf text-clinical" : "bg-card",
              )}
            >
              {f === "todos" ? "Todos" : ORDER_STATUS_LABEL[f]}
            </Link>
          );
        })}
      </nav>

      {!orders?.length ? (
        <p className="rounded-2xl border bg-card p-6">
          No hay pedidos {filter ? "en este estado" : "todavía"}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Pedidos más recientes</caption>
            <thead className="border-b bg-mist/40">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Pedido
                </th>
                <th scope="col" className="px-4 py-3">
                  Fecha
                </th>
                <th scope="col" className="px-4 py-3">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-3">
                  Pago
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="inline-flex min-h-11 items-center font-medium underline underline-offset-2"
                    >
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dateFmt.format(new Date(o.created_at))}
                  </td>
                  <td className="px-4 py-3">
                    {o.full_name}
                    <span className="block text-xs text-muted-foreground">{o.email}</span>
                  </td>
                  <td className="px-4 py-3">{PAYMENT_METHOD_LABEL[o.payment_method]}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatARS(o.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function PedidosPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <h1 className="mb-4 font-display text-4xl font-semibold">Pedidos</h1>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <OrdersTable search={searchParams as Promise<{ estado?: string }>} />
      </Suspense>
    </>
  );
}
