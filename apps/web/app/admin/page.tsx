import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { handleWithdrawal } from "@/actions/admin-withdrawals";
import { requireAdmin } from "@/lib/admin/server";
import { formatARS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hoy" };

type Dashboard = {
  sales_today: { count: number; total: number };
  sales_month: { count: number; total: number };
  to_ship: {
    id: string;
    number: number;
    full_name: string;
    total: number;
    status: string;
    created_at: string;
  }[];
  to_ship_count: number;
  pending_transfers: {
    id: string;
    number: number;
    full_name: string;
    total: number;
    created_at: string;
  }[];
  low_stock: { id: string; name: string; sku: string; available: number }[];
  no_photo_count: number;
  withdrawals: {
    id: string;
    code: string;
    full_name: string;
    email: string;
    order_number: number | null;
    reason: string | null;
    created_at: string;
  }[];
};

const when = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const card = "grid content-start gap-3 rounded-2xl border bg-card p-5";
const h2 = "font-display text-2xl font-semibold";
const row = "flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-mist";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

async function Today({ search }: { search: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAdmin("/admin");
  const [{ ok, error: errMsg }, { data, error }] = await Promise.all([
    search,
    supabase.rpc("admin_dashboard"),
  ]);
  if (error) throw error;
  const d = data as unknown as Dashboard;
  const now = new Date();
  // Hora de Argentina para el saludo (el servidor corre en UTC).
  const hour = Number(
    new Intl.DateTimeFormat("es-AR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(now),
  );
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-4xl font-semibold">{greeting}</h1>
        <p className="mt-1 text-muted-foreground">Esto es lo que necesita atención hoy.</p>
      </header>

      {ok === "arrepentimiento" ? (
        <p role="status" className="rounded-xl border border-leaf/40 bg-mist px-4 py-3">
          Solicitud marcada como atendida.
        </p>
      ) : null}
      {errMsg ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {errMsg.slice(0, 200)}
        </p>
      ) : null}

      <section aria-label="Ventas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Ventas de hoy"
          value={formatARS(d.sales_today.total)}
          hint={`${d.sales_today.count} pedido${d.sales_today.count === 1 ? "" : "s"} pagado${d.sales_today.count === 1 ? "" : "s"}`}
        />
        <Stat
          label="Ventas del mes"
          value={formatARS(d.sales_month.total)}
          hint={`${d.sales_month.count} pedido${d.sales_month.count === 1 ? "" : "s"}`}
        />
        <Stat
          label="Para despachar"
          value={String(d.to_ship_count)}
          hint="pagados o en preparación"
        />
        <Stat
          label="Productos sin foto"
          value={String(d.no_photo_count)}
          hint="borradores y publicados"
        />
      </section>

      {d.withdrawals.length ? (
        <section
          id="arrepentimientos"
          className={cn(card, "border-alert/40")}
          aria-labelledby="arr-t"
        >
          <h2 id="arr-t" className={h2}>
            Arrepentimientos sin atender ({d.withdrawals.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Hay que responder dentro de las 24 h con los pasos para la devolución (Res. 424/2020).
          </p>
          <ul className="grid gap-3">
            {d.withdrawals.map((w) => (
              <li key={w.id} className="grid gap-2 rounded-xl border p-4">
                <p className="font-medium">
                  {w.full_name} · código <span className="font-mono">{w.code}</span>
                  {w.order_number ? ` · pedido #${w.order_number}` : ""}
                </p>
                <p className="text-sm">
                  <a
                    className="underline underline-offset-2"
                    href={`mailto:${w.email}?subject=${encodeURIComponent(`Tu solicitud de arrepentimiento ${w.code}`)}`}
                  >
                    {w.email}
                  </a>{" "}
                  · {when.format(new Date(w.created_at))}
                </p>
                {w.reason ? <p className="text-sm text-muted-foreground">“{w.reason}”</p> : null}
                <form action={handleWithdrawal} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name="confirm" className="size-5" />
                    Ya le escribí con los pasos
                  </label>
                  <button className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium hover:bg-mist">
                    Marcar atendida
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="despachar-t">
          <div className="flex items-center justify-between gap-3">
            <h2 id="despachar-t" className={h2}>
              Para despachar
            </h2>
            <Link
              href="/admin/pedidos?estado=paid"
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
            >
              Ver todos
            </Link>
          </div>
          {d.to_ship.length ? (
            <ul className="grid">
              {d.to_ship.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className={row}>
                    <span>
                      #{o.number} · {o.full_name}
                      <span className="block text-sm text-muted-foreground">
                        {when.format(new Date(o.created_at))}
                        {o.status === "preparing" ? " · en preparación" : ""}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatARS(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nada pendiente. 🎉</p>
          )}
        </section>

        <section className={card} aria-labelledby="transf-t">
          <h2 id="transf-t" className={h2}>
            Transferencias por acreditar
          </h2>
          <p className="text-sm text-muted-foreground">
            Pedidos de los últimos 7 días esperando la transferencia. Abrilos para acreditar el pago
            cuando la veas en el banco.
          </p>
          {d.pending_transfers.length ? (
            <ul className="grid">
              {d.pending_transfers.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className={row}>
                    <span>
                      #{o.number} · {o.full_name}
                      <span className="block text-sm text-muted-foreground">
                        {when.format(new Date(o.created_at))}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatARS(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No hay transferencias pendientes.</p>
          )}
        </section>

        <section className={card} aria-labelledby="stock-t">
          <div className="flex items-center justify-between gap-3">
            <h2 id="stock-t" className={h2}>
              Stock bajo
            </h2>
            <Link
              href="/admin/productos?f=stock_bajo"
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
            >
              Ver en productos
            </Link>
          </div>
          {d.low_stock.length ? (
            <ul className="grid">
              {d.low_stock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/productos/${p.id}`} className={row}>
                    <span>
                      {p.name}
                      <span className="block text-sm text-muted-foreground">Cód. {p.sku}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-sm font-medium tabular-nums",
                        p.available <= 0 ? "bg-rose-soft text-graphite" : "bg-mist",
                      )}
                    >
                      {p.available <= 0 ? "Sin stock" : `Quedan ${p.available}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Todo con stock suficiente.</p>
          )}
        </section>

        <section className={card} aria-labelledby="atajos-t">
          <h2 id="atajos-t" className={h2}>
            Atajos
          </h2>
          <ul className="grid gap-2">
            <li>
              <Link href="/admin/productos?f=sin_foto" className={row}>
                Completar fotos ({d.no_photo_count} sin foto)
              </Link>
            </li>
            <li>
              <Link href="/admin/productos" className={row}>
                Crear o editar un producto
              </Link>
            </li>
            <li>
              <Link href="/admin/integraciones" className={row}>
                Mercado Pago, Andreani, emails y datos bancarios
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <Today search={searchParams as Promise<{ ok?: string; error?: string }>} />
    </Suspense>
  );
}
