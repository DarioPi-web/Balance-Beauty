import { Suspense } from "react";
import type { Metadata } from "next";
import { updatePayoutInfo } from "@/actions/seller";
import { CopyButton } from "@/components/checkout/copy-button";
import { formatARS } from "@/lib/pricing";
import { requireSeller } from "@/lib/seller/server";
import { SITE_URL } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi panel" };

type Data = {
  seller: {
    full_name: string;
    email: string;
    commission_percent: number;
    payout_info: string | null;
  };
  coupons: {
    code: string;
    percent: number | null;
    amount: number | null;
    min_amount: number;
    is_active: boolean;
    ends_at: string | null;
    used_count: number;
  }[];
  totals: {
    pending: number;
    approved: number;
    paid: number;
    month_commission: number;
    month_units: number;
  };
  month_orders: number;
  orders: {
    number: number;
    created_at: string;
    status: string;
    subtotal: number;
    coupon_discount: number;
    customer_first_name: string;
    commission: number;
    commission_status: string;
    items: { name: string; qty: number; amount: number; status: string }[] | null;
  }[];
  payouts: {
    paid_at: string;
    amount: number;
    commissions_count: number;
    method: string | null;
    reference: string | null;
  }[];
};

const ORDER_STATUS: Record<string, string> = {
  paid: "Pagado",
  preparing: "En preparación",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
};
const COMMISSION: Record<string, { label: string; cls: string }> = {
  pending: { label: "En curso", cls: "bg-mist" },
  approved: { label: "A cobrar", cls: "bg-leaf/15" },
  paid: { label: "Cobrada", cls: "bg-leaf text-clinical" },
  void: { label: "Anulada", cls: "bg-rose-soft" },
};
const date = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const card = "grid content-start gap-3 rounded-2xl border bg-card p-5";
const h2 = "font-display text-2xl font-semibold";

function Stat({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        strong ? "border-leaf bg-leaf text-clinical" : "bg-card",
      )}
    >
      <p className={cn("text-sm", strong ? "text-clinical/85" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className={cn("mt-1 text-sm", strong ? "text-clinical/85" : "text-muted-foreground")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

async function Panel({ search }: { search: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireSeller("/vendedora");
  const [{ ok, error: errMsg }, { data, error }] = await Promise.all([
    search,
    supabase.rpc("seller_dashboard"),
  ]);
  if (error) throw error;
  const d = data as unknown as Data;
  const first = d.seller.full_name.split(" ")[0];
  const active = d.coupons.filter((c) => c.is_active);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-4xl font-semibold">Hola, {first}</h1>
        <p className="mt-1 text-muted-foreground">
          Ganás el {Number(d.seller.commission_percent)} % de cada producto vendido con tu código
          (algunos productos pueden tener otro %).
        </p>
      </header>

      {ok === "cobro" ? (
        <p role="status" className="rounded-xl border border-leaf/40 bg-mist px-4 py-3">
          Datos de cobro guardados.
        </p>
      ) : null}
      {errMsg ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {errMsg.slice(0, 200)}
        </p>
      ) : null}

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="A cobrar"
          value={formatARS(d.totals.approved)}
          hint="pedidos entregados"
          strong
        />
        <Stat
          label="En curso"
          value={formatARS(d.totals.pending)}
          hint="se liberan al entregarse"
        />
        <Stat
          label="Comisión del mes"
          value={formatARS(d.totals.month_commission)}
          hint={`${d.month_orders} pedido${d.month_orders === 1 ? "" : "s"} · ${d.totals.month_units} producto${d.totals.month_units === 1 ? "" : "s"}`}
        />
        <Stat label="Cobrado en total" value={formatARS(d.totals.paid)} />
      </section>

      <section className={card} aria-labelledby="codigos-t">
        <h2 id="codigos-t" className={h2}>
          Tus códigos
        </h2>
        {d.coupons.length ? (
          <ul className="grid gap-3">
            {d.coupons.map((c) => {
              const offer = c.percent
                ? `${Number(c.percent)} % off`
                : formatARS(c.amount ?? 0) + " off";
              const share = `Usá mi código ${c.code} y tenés ${offer} en ${SITE_URL.replace(/^https?:\/\//, "")}`;
              return (
                <li key={c.code} className="grid gap-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      <strong className="font-mono text-xl tracking-wider">{c.code}</strong>{" "}
                      <span className="text-muted-foreground">
                        · {offer}
                        {c.min_amount ? ` desde ${formatARS(c.min_amount)}` : ""}
                        {c.ends_at ? ` · vence ${date.format(new Date(c.ends_at))}` : ""}
                      </span>
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        c.is_active ? "bg-mist" : "bg-rose-soft",
                      )}
                    >
                      {c.is_active
                        ? `Activo · usado ${c.used_count} ${c.used_count === 1 ? "vez" : "veces"}`
                        : "Pausado"}
                    </span>
                  </div>
                  {c.is_active ? (
                    <div className="flex flex-wrap gap-2">
                      <CopyButton value={c.code} label={`el código ${c.code}`} />
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(share)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium hover:bg-mist"
                      >
                        Compartir por WhatsApp
                      </a>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">Todavía no tenés códigos. Pedíselos a la tienda.</p>
        )}
        {!active.length && d.coupons.length ? (
          <p className="text-sm text-muted-foreground">Tus códigos están pausados.</p>
        ) : null}
      </section>

      <section className={card} aria-labelledby="ventas-t">
        <h2 id="ventas-t" className={h2}>
          Tus ventas
        </h2>
        {d.orders.length ? (
          <ul className="grid gap-3">
            {d.orders.map((o) => (
              <li key={o.number} className="grid gap-2 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    Pedido #{o.number} · {o.customer_first_name}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {date.format(new Date(o.created_at))} · {ORDER_STATUS[o.status] ?? o.status}
                    </span>
                  </p>
                  <p className="text-right">
                    <span className="block text-lg font-semibold tabular-nums">
                      {formatARS(o.commission)}
                    </span>
                    <span className="text-xs text-muted-foreground">tu comisión</span>
                  </p>
                </div>
                {o.items?.length ? (
                  <ul className="grid gap-1 text-sm">
                    {o.items.map((i, k) => (
                      <li
                        key={k}
                        className="flex flex-wrap items-center justify-between gap-2 border-t pt-1"
                      >
                        <span>
                          {i.name} × {i.qty}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">{formatARS(i.amount)}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              COMMISSION[i.status]?.cls,
                            )}
                          >
                            {COMMISSION[i.status]?.label ?? i.status}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Cuando alguien compre con tu código, lo vas a ver acá.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          “En curso”: el pedido se pagó y se está enviando. “A cobrar”: ya se entregó (se te paga en
          la próxima liquidación). Si un pedido se cancela, la comisión se anula.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="liq-t">
          <h2 id="liq-t" className={h2}>
            Liquidaciones
          </h2>
          {d.payouts.length ? (
            <ul className="grid gap-2">
              {d.payouts.map((p, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                >
                  <span>
                    {date.format(new Date(p.paid_at))}
                    <span className="block text-sm text-muted-foreground">
                      {[p.method, p.reference, `${p.commissions_count} comisiones`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <strong className="tabular-nums">{formatARS(p.amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Todavía no hay liquidaciones.</p>
          )}
        </section>

        <section id="cobro" className={card} aria-labelledby="cobro-t">
          <h2 id="cobro-t" className={h2}>
            Tus datos de cobro
          </h2>
          <form action={updatePayoutInfo} className="grid gap-3">
            <label className="block text-sm font-medium">
              CBU/CVU o alias y titular de la cuenta
              <input
                name="payout_info"
                maxLength={300}
                defaultValue={d.seller.payout_info ?? ""}
                className="mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base"
              />
            </label>
            <button className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover">
              Guardar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function VendedoraPage({ searchParams }: PageProps<"/vendedora">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <Panel search={searchParams as Promise<{ ok?: string; error?: string }>} />
    </Suspense>
  );
}
