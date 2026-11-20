import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminOrderAction } from "@/actions/admin-orders";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Flash,
  PageHeader,
  Panel,
  adminField as field,
  btnDanger,
  btnPrimary as btn,
} from "@/components/admin/ui";
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

  const address = [
    [a.street, a.number].filter(Boolean).join(" "),
    a.floor_apt,
    a.city,
    a.province,
    a.postal_code,
  ]
    .filter(Boolean)
    .join(" · ");
  const wa = o.phone ? `https://wa.me/54${o.phone.replace(/\D/g, "")}` : null;
  const units = o.order_items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        title={`Pedido #${o.number}`}
        meta={
          <>
            <StatusBadge status={o.status} />
            <span className="text-sm text-muted-foreground">
              {dateFmt.format(new Date(o.created_at))} · {PAYMENT_METHOD_LABEL[o.payment_method]} ·{" "}
              {SHIPPING_METHOD_LABEL[o.shipping_method]}
            </span>
          </>
        }
      />

      <Flash
        ok={
          ok
            ? `Listo: ${ACTION_LABEL[ok as keyof typeof ACTION_LABEL] ?? "pedido actualizado"}. Estado actual: ${ORDER_STATUS_LABEL[o.status]}.`
            : null
        }
        error={errMsg}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <Panel title="Productos" description={`${units} ${units === 1 ? "unidad" : "unidades"}`}>
            <ul className="divide-y text-sm">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{i.name}</span>
                    <span className="text-muted-foreground">
                      {i.quantity} × {formatARS(i.unit_price)} · SKU {i.sku}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatARS(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="grid gap-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatARS(o.subtotal)}</dd>
              </div>
              {o.discount_total ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descuento</dt>
                  <dd className="tabular-nums">−{formatARS(o.discount_total)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Envío</dt>
                <dd className="tabular-nums">
                  {o.shipping_total ? formatARS(o.shipping_total) : "Gratis"}
                </dd>
              </div>
              <div className="mt-1 flex justify-between border-t pt-2 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatARS(o.total)}</dd>
              </div>
            </dl>
          </Panel>

          {o.payments.length || o.shipments.length || o.admin_note ? (
            <Panel title="Historial">
              <ol className="grid gap-3 border-l-2 border-mist pl-4 text-sm">
                {o.payments.map((p) => (
                  <li key={p.id}>
                    <p className="font-medium">
                      Pago{" "}
                      {p.provider === "manual"
                        ? "acreditado a mano"
                        : `Mercado Pago ${p.provider_payment_id}`}
                    </p>
                    <p className="text-muted-foreground">
                      {p.status} · {formatARS(p.amount)}
                      {p.installments ? ` · ${p.installments} cuotas` : ""} ·{" "}
                      {dateFmt.format(new Date(p.created_at))}
                    </p>
                  </li>
                ))}
                {o.shipments.map((s) => (
                  <li key={s.id}>
                    <p className="font-medium">Envío {s.carrier}</p>
                    <p className="text-muted-foreground">
                      {s.tracking_code
                        ? `Seguimiento ${s.tracking_code}`
                        : "Sin código de seguimiento"}
                      {s.shipped_at
                        ? ` · despachado ${dateFmt.format(new Date(s.shipped_at))}`
                        : ""}
                      {s.delivered_at
                        ? ` · entregado ${dateFmt.format(new Date(s.delivered_at))}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ol>
              {o.admin_note ? (
                <div className="rounded-xl bg-mist/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Notas internas</p>
                  <pre className="mt-1 font-sans text-sm whitespace-pre-wrap">{o.admin_note}</pre>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>

        <div className="grid gap-6 lg:sticky lg:top-6">
          {actions.length ? (
            <Panel title="Próximo paso" className="border-leaf/40">
              {actions
                .filter((x) => x !== "ship" && x !== "cancel")
                .map((x) => (
                  <form key={x} action={adminOrderAction} className="grid gap-3">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="action" value={x} />
                    {x === "mark_paid" ? (
                      <label className="text-sm font-medium">
                        Nota (opcional, ej. comprobante)
                        <input name="note" maxLength={300} className={field} />
                      </label>
                    ) : null}
                    <button className={btn}>{ACTION_LABEL[x]}</button>
                  </form>
                ))}
              {actions.includes("ship") ? (
                <form action={adminOrderAction} className="grid gap-3">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="action" value="ship" />
                  <label className="text-sm font-medium">
                    Transportista
                    <select name="carrier" required className={field} defaultValue={CARRIERS[0]}>
                      {CARRIERS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Código de seguimiento
                    <input name="tracking" maxLength={80} className={field} />
                  </label>
                  <button className={btn}>{ACTION_LABEL.ship}</button>
                </form>
              ) : null}
              {actions.includes("cancel") ? (
                <details className="group border-t pt-3">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-alert">
                    Cancelar este pedido…
                  </summary>
                  <form action={adminOrderAction} className="mt-2 grid gap-3">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="action" value="cancel" />
                    <label className="text-sm font-medium">
                      Motivo (se guarda en las notas internas)
                      <input name="note" maxLength={300} className={field} />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input type="checkbox" name="confirm" className="size-5 accent-alert" />
                      Confirmo la cancelación
                      {o.status !== "pending_payment"
                        ? " (el stock vuelve y el reintegro se hace aparte)"
                        : ""}
                    </label>
                    <button className={btnDanger}>{ACTION_LABEL.cancel}</button>
                  </form>
                </details>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Cliente">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{o.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>
                  <a className="break-all underline underline-offset-2" href={`mailto:${o.email}`}>
                    {o.email}
                  </a>
                </dd>
              </div>
              {o.phone && wa ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Celular</dt>
                  <dd>
                    <a
                      className="underline underline-offset-2"
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {o.phone} <span className="text-muted-foreground">(WhatsApp)</span>
                    </a>
                  </dd>
                </div>
              ) : null}
              {o.dni ? (
                <div>
                  <dt className="text-xs text-muted-foreground">DNI</dt>
                  <dd>{o.dni}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted-foreground">Entrega</dt>
                <dd>
                  {SHIPPING_METHOD_LABEL[o.shipping_method]}
                  {address ? <span className="block text-muted-foreground">{address}</span> : null}
                </dd>
              </div>
              {o.customer_note ? (
                <div className="rounded-xl bg-rose-soft/50 p-3">
                  <dt className="text-xs font-medium">Nota del cliente</dt>
                  <dd>{o.customer_note}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
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
