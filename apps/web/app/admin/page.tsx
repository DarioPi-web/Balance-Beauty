import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { handleWithdrawal } from "@/actions/admin-withdrawals";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  RowLink,
  Stat,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/server";
import { formatARS } from "@/lib/pricing";

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
  expiring_lots: {
    id: string;
    product_id: string;
    name: string;
    lot_code: string;
    expires_on: string;
    qty_on_hand: number;
    cost_value: number;
  }[];
  lots_without_expiry: number;
  discrepancies: number;
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
const longDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const linkMore =
  "inline-flex min-h-11 items-center text-sm font-medium text-leaf underline-offset-4 hover:underline";

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
  const today = longDate.format(now);
  const pendingTasks =
    d.withdrawals.length + d.to_ship_count + d.pending_transfers.length + (d.discrepancies ? 1 : 0);

  return (
    <>
      <PageHeader
        title={greeting}
        description={
          <>
            {today.charAt(0).toUpperCase() + today.slice(1)}
            {" · "}
            {pendingTasks === 0
              ? "No hay nada urgente: buen momento para completar fotos y descripciones."
              : `Tenés ${plural(pendingTasks, "tema", "temas")} para resolver hoy.`}
          </>
        }
        actions={
          <>
            <Link href="/admin/productos#nuevo" className={btnSecondary}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo producto
            </Link>
            <Link href="/admin/pedidos" className={btnPrimary}>
              Ver pedidos
            </Link>
          </>
        }
      />

      <Flash
        ok={ok === "arrepentimiento" ? "Solicitud marcada como atendida." : null}
        error={errMsg}
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          tone="primary"
          label="Ventas de hoy"
          value={formatARS(d.sales_today.total)}
          hint={plural(d.sales_today.count, "pedido pagado", "pedidos pagados")}
        />
        <Stat
          label="Ventas del mes"
          value={formatARS(d.sales_month.total)}
          hint={plural(d.sales_month.count, "pedido", "pedidos")}
        />
        <Stat
          tone={d.to_ship_count ? "attention" : "default"}
          label="Para despachar"
          value={String(d.to_ship_count)}
          hint="pagados o en preparación"
          href="/admin/pedidos?estado=paid"
        />
        <Stat
          label="Productos sin foto"
          value={String(d.no_photo_count)}
          hint="Completar fotos →"
          href="/admin/productos?f=sin_foto"
        />
      </section>

      {d.withdrawals.length ? (
        <Panel
          id="arrepentimientos"
          tone="attention"
          title={`Arrepentimientos sin atender (${d.withdrawals.length})`}
          description="Hay que responder dentro de las 24 h con los pasos para la devolución (Res. 424/2020)."
        >
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
                    <input type="checkbox" name="confirm" className="size-5 accent-leaf" />
                    Ya le escribí con los pasos
                  </label>
                  <button className={btnSecondary}>Marcar atendida</button>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Para despachar"
          actions={
            <Link href="/admin/pedidos?estado=paid" className={linkMore}>
              Ver todos
            </Link>
          }
        >
          {d.to_ship.length ? (
            <ul className="-mx-3 grid">
              {d.to_ship.map((o) => (
                <li key={o.id}>
                  <RowLink href={`/admin/pedidos/${o.id}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        #{o.number} · {o.full_name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {when.format(new Date(o.created_at))}
                        {o.status === "preparing" ? " · en preparación" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatARS(o.total)}</span>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nada pendiente de despacho"
              description="Los pedidos pagados aparecen acá."
            />
          )}
        </Panel>

        <Panel
          title="Transferencias por acreditar"
          description="Pedidos de los últimos 7 días esperando la transferencia. Abrilos para acreditar el pago cuando la veas en el banco."
        >
          {d.pending_transfers.length ? (
            <ul className="-mx-3 grid">
              {d.pending_transfers.map((o) => (
                <li key={o.id}>
                  <RowLink href={`/admin/pedidos/${o.id}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        #{o.number} · {o.full_name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {when.format(new Date(o.created_at))}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatARS(o.total)}</span>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No hay transferencias pendientes" />
          )}
        </Panel>

        <Panel
          title="Stock bajo"
          actions={
            <Link href="/admin/productos?f=stock_bajo" className={linkMore}>
              Ver en productos
            </Link>
          }
        >
          {d.low_stock.length ? (
            <ul className="-mx-3 grid">
              {d.low_stock.map((p) => (
                <li key={p.id}>
                  <RowLink href={`/admin/productos/${p.id}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-sm text-muted-foreground">Cód. {p.sku}</span>
                    </span>
                    <Pill tone={p.available <= 0 ? "warning" : "neutral"}>
                      {p.available <= 0 ? "Sin stock" : `Quedan ${p.available}`}
                    </Pill>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Todo con stock suficiente" />
          )}
        </Panel>

        <Panel title="Por vencer (90 días)">
          {d.discrepancies ? (
            <Flash
              error={`${plural(d.discrepancies, "producto", "productos")} con diferencia entre stock y lotes: revisalos con un conteo.`}
            />
          ) : null}
          {d.expiring_lots.length ? (
            <ul className="-mx-3 grid">
              {d.expiring_lots.map((l) => (
                <li key={l.id}>
                  <RowLink href={`/admin/productos/${l.product_id}#inventario`}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        Lote {l.lot_code} · {l.qty_on_hand} u.
                        {l.cost_value ? ` · costo ${formatARS(l.cost_value)}` : ""}
                      </span>
                    </span>
                    <Pill tone="warning">
                      {l.expires_on.slice(5, 7)}/{l.expires_on.slice(0, 4)}
                    </Pill>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nada vence en los próximos 90 días" />
          )}
          {d.lots_without_expiry ? (
            <p className="text-sm text-muted-foreground">
              {plural(d.lots_without_expiry, "lote", "lotes")} sin vencimiento cargado (el stock que
              había antes del control por lote). Completalo en la próxima recepción o conteo.
            </p>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <Today search={searchParams as Promise<{ ok?: string; error?: string }>} />
    </Suspense>
  );
}
