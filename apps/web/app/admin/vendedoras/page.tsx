import { Suspense } from "react";
import type { Metadata } from "next";
import { createPayout, saveSeller, saveSellerCoupon } from "@/actions/admin-sellers";
import { Plus } from "lucide-react";
import {
  EmptyState,
  Flash,
  PageHeader,
  Pill,
  adminField,
  adminLabel,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/server";
import { formatARS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendedoras" };

type Seller = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  commission_percent: number;
  is_active: boolean;
  payout_info: string | null;
  linked: boolean;
  coupons: {
    code: string;
    percent: number;
    min_amount: number;
    is_active: boolean;
    used_count: number;
    ends_at: string | null;
  }[];
  orders: number;
  pending: number;
  approved: number;
  paid: number;
};

const field = adminField;
const label = adminLabel;
const btn = btnPrimary;
const ghost = btnSecondary;
const card = "grid gap-4 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6";
const OK: Record<string, string> = {
  creada: "Vendedora creada. Si todavía no tiene usuario, creáselo en Supabase con su email.",
  guardada: "Datos guardados.",
  codigo: "Código guardado.",
  liquidacion: "Liquidación registrada: las comisiones quedaron como pagadas.",
};
const date = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function SellerForm({ s }: { s?: Seller }) {
  return (
    <form action={saveSeller} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <label className={label}>
        Nombre y apellido
        <input
          name="full_name"
          required
          minLength={3}
          maxLength={120}
          defaultValue={s?.full_name}
          className={field}
        />
      </label>
      <label className={label}>
        Email (con el que ingresa)
        <input name="email" type="email" required defaultValue={s?.email} className={field} />
      </label>
      <label className={label}>
        Celular
        <input
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={s?.phone ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Comisión por producto vendido (%)
        <input
          name="commission_percent"
          inputMode="decimal"
          required
          defaultValue={s?.commission_percent ?? 10}
          className={field}
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Sobre el precio neto de cada producto (después del descuento). Un producto puede tener su
          propio % (columna en la planilla Excel).
        </span>
      </label>
      <label className={cn(label, "sm:col-span-2")}>
        Datos para pagarle (CBU/alias, titular)
        <input
          name="payout_info"
          maxLength={300}
          defaultValue={s?.payout_info ?? ""}
          className={field}
        />
      </label>
      {s ? (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="is_active" defaultChecked={s.is_active} className="size-5" />
          Activa (si se desactiva, sus códigos dejan de funcionar)
        </label>
      ) : null}
      <button className={cn(btn, "w-fit sm:col-span-2")}>
        {s ? "Guardar datos" : "Crear vendedora"}
      </button>
    </form>
  );
}

async function Sellers({ search }: { search: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAdmin("/admin/vendedoras");
  const [{ ok, error: errMsg }, { data, error }] = await Promise.all([
    search,
    supabase.rpc("admin_sellers_overview"),
  ]);
  if (error) throw error;
  const sellers = (data ?? []) as unknown as Seller[];

  return (
    <div className="grid gap-6">
      <Flash ok={ok && OK[ok] ? OK[ok] : null} error={errMsg} />

      <details id="nueva" className={cn(card, "group")} open={sellers.length === 0}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-display text-2xl font-semibold text-graphite">
          <Plus
            aria-hidden="true"
            className="size-5 text-leaf transition-transform group-open:rotate-45"
          />
          Nueva vendedora
        </summary>
        <div className="mt-4 grid gap-3">
          <SellerForm />
          <p className="text-sm text-muted-foreground">
            Para que pueda ingresar: en Supabase → Authentication → Users → Add user, creá un
            usuario con el mismo email y una contraseña temporal (tildá “Auto Confirm User”). Al
            ingresar en /ingresar va directo a su panel.
          </p>
        </div>
      </details>

      {sellers.length === 0 ? (
        <EmptyState
          title="Todavía no hay vendedoras"
          description="Creá la primera con el formulario de arriba y asignale un código de descuento."
        />
      ) : (
        <ul className="grid gap-5">
          {sellers.map((s) => (
            <li key={s.id} id={`v-${s.id}`} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-graphite">
                    {s.full_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {s.email} · comisión {Number(s.commission_percent)} %
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={s.is_active ? "success" : "warning"}>
                    {s.is_active ? "Activa" : "Inactiva"}
                  </Pill>
                  <Pill tone={s.linked ? "neutral" : "warning"}>
                    {s.linked ? "Ya ingresó" : "Sin usuario todavía"}
                  </Pill>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Pedidos con su código", String(s.orders)],
                  ["En curso", formatARS(s.pending)],
                  ["A pagar", formatARS(s.approved)],
                  ["Pagado", formatARS(s.paid)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-mist/50 p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>

              {s.approved > 0 ? (
                <form
                  action={createPayout}
                  className="grid gap-3 rounded-xl border border-leaf/40 p-4 sm:grid-cols-2"
                >
                  <input type="hidden" name="seller_id" value={s.id} />
                  <p className="font-medium sm:col-span-2">
                    Liquidar {formatARS(s.approved)} (comisiones de pedidos entregados)
                  </p>
                  {s.payout_info ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Datos de cobro: {s.payout_info}
                    </p>
                  ) : null}
                  <label className={label}>
                    Medio
                    <input
                      name="method"
                      defaultValue="Transferencia"
                      maxLength={60}
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Comprobante / referencia
                    <input name="reference" maxLength={120} className={field} />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
                    <input type="checkbox" name="confirm" className="size-5" />
                    Ya le transferí {formatARS(s.approved)}
                  </label>
                  <button className={cn(btn, "w-fit")}>Registrar liquidación</button>
                </form>
              ) : null}

              <div className="grid gap-2">
                <h3 className="font-medium">Códigos de descuento</h3>
                {s.coupons.length ? (
                  <ul className="grid gap-2">
                    {s.coupons.map((c) => (
                      <li
                        key={c.code}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                      >
                        <span>
                          <strong className="font-mono">{c.code}</strong> · {Number(c.percent)} %
                          off
                          {c.min_amount ? ` desde ${formatARS(c.min_amount)}` : ""}
                          {c.ends_at ? ` · vence ${date.format(new Date(c.ends_at))}` : ""} · usado{" "}
                          {c.used_count} {c.used_count === 1 ? "vez" : "veces"}
                        </span>
                        <form action={saveSellerCoupon} className="flex gap-2">
                          <input type="hidden" name="seller_id" value={s.id} />
                          <input type="hidden" name="code" value={c.code} />
                          <input type="hidden" name="percent" value={String(c.percent)} />
                          <input type="hidden" name="min_amount" value={String(c.min_amount)} />
                          <input
                            type="hidden"
                            name="ends_at"
                            value={c.ends_at ? c.ends_at.slice(0, 10) : ""}
                          />
                          <input
                            type="hidden"
                            name="is_active"
                            value={c.is_active ? "off" : "on"}
                          />
                          <button className={ghost}>{c.is_active ? "Pausar" : "Activar"}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin códigos todavía.</p>
                )}
                <form
                  action={saveSellerCoupon}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-4"
                >
                  <input type="hidden" name="seller_id" value={s.id} />
                  <label className={label}>
                    Código
                    <input
                      name="code"
                      required
                      maxLength={20}
                      placeholder="VERO10"
                      autoCapitalize="characters"
                      className={cn(field, "uppercase")}
                    />
                  </label>
                  <label className={label}>
                    Descuento (%)
                    <input
                      name="percent"
                      inputMode="decimal"
                      required
                      defaultValue="10"
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Compra mínima ($)
                    <input
                      name="min_amount"
                      inputMode="numeric"
                      placeholder="0"
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Vence (opcional)
                    <input name="ends_at" type="date" className={field} />
                  </label>
                  <button className={cn(ghost, "w-fit")}>Agregar código</button>
                </form>
              </div>

              <details>
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
                  Editar datos de {s.full_name.split(" ")[0]}
                </summary>
                <div className="mt-3">
                  <SellerForm s={s} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VendedorasPage({ searchParams }: PageProps<"/admin/vendedoras">) {
  return (
    <>
      <PageHeader
        title="Vendedoras"
        description="Cada vendedora tiene códigos de descuento: cuando una clienta compra con su código, el pedido queda a su nombre y gana comisión por cada producto. Se liquida cuando el pedido está entregado."
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <Sellers search={searchParams as Promise<{ ok?: string; error?: string }>} />
      </Suspense>
    </>
  );
}
