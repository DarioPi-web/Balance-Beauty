import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminOrderAction } from "@/actions/admin-orders";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin/server";
import {
  actionsFor,
  CARRIERS,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  SHIPPING_METHOD_LABEL,
} from "@/lib/orders/labels";
import { UUID_RE } from "@/lib/orders/types";
import { formatARS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pedido" };

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover";
const field = "mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base";

const ACTION_LABEL = {
  mark_paid: "Acreditar pago",
  prepare: "Pasar a preparación",
  ship: "Marcar despachado",
  deliver: "Marcar entregado",
  cancel: "Cancelar pedido",
} as const;

async function OrderDetail({
  params,
  search,
}: {
  params: Promise<{ id: string }>;
  search: Promise<{ ok?: string; error?: string }>;
}) {
  const [{ id }, { ok, error: errMsg }] = await Promise.all([params, search]);
  if (!UUID_RE.test(id)) notFound();
  const { supabase } = await requireAdmin(`/admin/pedidos/${id}`);

  const { data: o, error } = await supabase
    .from("orders")
    .select(
      "id, number, created_at, status, email, phone, full_name, dni, payment_method, shipping_method, shipping_address, subtotal, discount_total, shipping_total, total, customer_note, admin_note, reserved_until, order_items(id, sku, name, unit_price, quantity, line_total), payments(id, provider, provider_payment_id, status, amount, installments, created_at), shipments(id, carrier, tracking_code, status, shipped_at, delivered_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!o) notFound();

  const a = (o.shipping_address ?? {}) as Record<string, string | null>;
  const actions = actionsFor(o.status);

  return (
    <article className="grid gap-6">
      <p>
        <Link
          href="/admin/pedidos"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          ← Pedidos
        </Link>
      </p>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-semibold">Pedido #{o.number}</h1>
        <StatusBadge status={o.status} />
        <span className="text-sm text-muted-foreground">
          {dateFmt.format(new Date(o.created_at))}
        </span>
      </header>

      {ok ? (
        <p role="status" className="rounded-xl border border-leaf/40 bg-mist px-4 py-3">
          Listo: {ACTION_LABEL[ok as keyof typeof ACTION_LABEL] ?? "pedido actualizado"}. Estado
          actual: {ORDER_STATUS_LABEL[o.status]}.
        </p>
      ) : null}
      {errMsg ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {errMsg}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="cliente">
          <h2 id="cliente" className="font-display text-2xl font-semibold">
            Cliente
          </h2>
          <dl className="mt-3 grid gap-1 text-sm">
            <div>
              <dt className="inline font-medium">Nombre: </dt>
              <dd className="inline">{o.full_name}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Email: </dt>
              <dd className="inline">
                <a className="underline" href={`mailto:${o.email}`}>
                  {o.email}
                </a>
              </dd>
            </div>
            {o.phone ? (
              <div>
                <dt className="inline font-medium">Celular: </dt>
                <dd className="inline">
                  <a className="underline" href={`https://wa.me/54${o.phone.replace(/\D/g, "")}`}>
                    {o.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {o.dni ? (
              <div>
                <dt className="inline font-medium">DNI: </dt>
                <dd className="inline">{o.dni}</dd>
              </div>
            ) : null}
            <div>
              <dt className="inline font-medium">Entrega: </dt>
              <dd className="inline">{SHIPPING_METHOD_LABEL[o.shipping_method]}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Dirección: </dt>
              <dd className="inline">
                {[
                  [a.street, a.number].filter(Boolean).join(" "),
                  a.floor_apt,
                  a.city,
                  a.province,
                  a.postal_code,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
            {o.customer_note ? (
              <div>
                <dt className="inline font-medium">Nota del cliente: </dt>
                <dd className="inline">{o.customer_note}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border bg-card p-5" aria-labelledby="detalle">
          <h2 id="detalle" className="font-display text-2xl font-semibold">
            Detalle
          </h2>
          <ul className="mt-3 divide-y text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>
                  {i.name}{" "}
                  <span className="text-muted-foreground">
                    × {i.quantity} · SKU {i.sku}
                  </span>
                </span>
                <span className="shrink-0">{formatARS(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid gap-1 border-t pt-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatARS(o.subtotal)}</dd>
            </div>
            {o.discount_total ? (
              <div className="flex justify-between">
                <dt>Descuento</dt>
                <dd>−{formatARS(o.discount_total)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd>{o.shipping_total ? formatARS(o.shipping_total) : "Gratis"}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatARS(o.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Pago</dt>
              <dd>{PAYMENT_METHOD_LABEL[o.payment_method]}</dd>
            </div>
          </dl>
        </section>
      </div>

      {o.payments.length || o.shipments.length || o.admin_note ? (
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="historial">
          <h2 id="historial" className="font-display text-2xl font-semibold">
            Pagos y envíos
          </h2>
          <ul className="mt-3 grid gap-1 text-sm">
            {o.payments.map((p) => (
              <li key={p.id}>
                Pago{" "}
                {p.provider === "manual"
                  ? "acreditado a mano"
                  : `Mercado Pago ${p.provider_payment_id}`}{" "}
                · {p.status} · {formatARS(p.amount)}
                {p.installments ? ` · ${p.installments} cuotas` : ""} ·{" "}
                {dateFmt.format(new Date(p.created_at))}
              </li>
            ))}
            {o.shipments.map((s) => (
              <li key={s.id}>
                Envío {s.carrier}
                {s.tracking_code ? ` · seguimiento ${s.tracking_code}` : ""}
                {s.shipped_at ? ` · despachado ${dateFmt.format(new Date(s.shipped_at))}` : ""}
                {s.delivered_at ? ` · entregado ${dateFmt.format(new Date(s.delivered_at))}` : ""}
              </li>
            ))}
          </ul>
          {o.admin_note ? (
            <pre className="mt-3 font-sans text-sm whitespace-pre-wrap text-muted-foreground">
              {o.admin_note}
            </pre>
          ) : null}
        </section>
      ) : null}

      {actions.length ? (
        <section className="grid gap-4 rounded-2xl border bg-card p-5" aria-labelledby="acciones">
          <h2 id="acciones" className="font-display text-2xl font-semibold">
            Acciones
          </h2>
          {actions
            .filter((x) => x !== "ship" && x !== "cancel")
            .map((x) => (
              <form key={x} action={adminOrderAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="action" value={x} />
                {x === "mark_paid" ? (
                  <label className="min-w-0 flex-1 text-sm">
                    Nota (opcional, ej. comprobante)
                    <input name="note" maxLength={300} className={field} />
                  </label>
                ) : null}
                <button className={btn}>{ACTION_LABEL[x]}</button>
              </form>
            ))}
          {actions.includes("ship") ? (
            <form
              action={adminOrderAction}
              className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="action" value="ship" />
              <label className="text-sm">
                Transportista
                <select name="carrier" required className={field} defaultValue={CARRIERS[0]}>
                  {CARRIERS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Código de seguimiento
                <input name="tracking" maxLength={80} className={field} />
              </label>
              <button className={btn}>{ACTION_LABEL.ship}</button>
            </form>
          ) : null}
          {actions.includes("cancel") ? (
            <form action={adminOrderAction} className="grid gap-3 border-t pt-4">
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="action" value="cancel" />
              <label className="text-sm">
                Motivo (se guarda en las notas internas)
                <input name="note" maxLength={300} className={field} />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="confirm" className="h-5 w-5 accent-alert" />
                Confirmo la cancelación
                {o.status !== "pending_payment"
                  ? " (el stock vuelve y el reintegro se hace aparte)"
                  : ""}
              </label>
              <button className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-alert px-5 font-medium text-alert">
                {ACTION_LABEL.cancel}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

export default function PedidoPage({ params, searchParams }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <OrderDetail
        params={params}
        search={searchParams as Promise<{ ok?: string; error?: string }>}
      />
    </Suspense>
  );
}
