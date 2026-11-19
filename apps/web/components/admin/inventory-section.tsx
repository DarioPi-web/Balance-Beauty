import { adjustStock, receiveStock, setLotStatus } from "@/actions/admin-inventory";
import { cn } from "@/lib/utils";

export type Lot = {
  id: string;
  lot_code: string;
  expires_on: string | null;
  qty_on_hand: number;
  status: "available" | "quarantine" | "expired" | "recalled" | "depleted";
  received_on: string;
  unit_cost: number | null;
};
export type Movement = {
  id: number;
  qty: number;
  kind: string;
  reason: string | null;
  created_at: string;
  lot_id: string | null;
};

const KIND: Record<string, string> = {
  receipt: "Recepción",
  sale: "Venta",
  return: "Devolución",
  adjustment: "Ajuste",
  waste: "Merma",
  count: "Conteo",
  quarantine: "Cuarentena",
  unquarantine: "Vuelve a la venta",
  recall: "Retiro",
};
const STATUS: Record<Lot["status"], string> = {
  available: "A la venta",
  quarantine: "En cuarentena",
  expired: "Vencido",
  recalled: "Retirado",
  depleted: "Agotado",
};

const field = "mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base";
const label = "block text-sm font-medium";
const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover";
const ghost =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium hover:bg-mist";
const dateFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Semáforo de vencimiento: rojo < 6 meses, ámbar 6–12, verde > 12 (docs/17 §4.3). */
function expiry(expires: string | null, today: Date) {
  if (!expires) return { text: "Sin vencimiento cargado", cls: "bg-rose-soft" };
  const months = (new Date(expires).getTime() - today.getTime()) / (30.44 * 864e5);
  const [y, m] = expires.split("-");
  const text = `Vence ${m}/${y}`;
  if (months < 0) return { text: `Venció ${m}/${y}`, cls: "bg-alert text-white" };
  if (months < 6) return { text, cls: "bg-rose-soft" };
  if (months < 12) return { text, cls: "bg-mist" };
  return { text, cls: "bg-leaf/15" };
}

export function InventorySection({
  productId,
  trackStock,
  stock,
  reserved,
  lots,
  movements,
}: {
  productId: string;
  trackStock: boolean;
  stock: number;
  reserved: number;
  lots: Lot[];
  movements: Movement[];
}) {
  const today = new Date();
  const lotCode = new Map(lots.map((l) => [l.id, l.lot_code]));
  const active = lots.filter((l) => l.status !== "depleted" || l.qty_on_hand > 0);

  return (
    <section
      id="inventario"
      className="grid gap-5 rounded-2xl border bg-card p-5"
      aria-labelledby="inv-t"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inv-t" className="font-display text-2xl font-semibold">
            Inventario
          </h2>
          <p className="text-sm text-muted-foreground">
            {trackStock
              ? `${stock - reserved} para vender${reserved ? ` · ${reserved} reservadas en pedidos sin pagar` : ""}. Se vende primero el lote que vence antes.`
              : "Este producto no controla stock: se vende siempre."}
          </p>
        </div>
      </div>

      {active.length ? (
        <ul className="grid gap-2" aria-label="Lotes">
          {active.map((l) => {
            const e = expiry(l.expires_on, today);
            return (
              <li
                key={l.id}
                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium">{l.lot_code}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", e.cls)}>
                    {e.text}
                  </span>
                  <span className="text-sm tabular-nums">{l.qty_on_hand} u.</span>
                  <span className="text-sm text-muted-foreground">{STATUS[l.status]}</span>
                </div>
                {l.status === "available" || l.status === "quarantine" ? (
                  <form action={setLotStatus} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={productId} />
                    <input type="hidden" name="lot_id" value={l.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={l.status === "available" ? "quarantine" : "available"}
                    />
                    <label className="sr-only" htmlFor={`motivo-${l.id}`}>
                      Motivo
                    </label>
                    <input
                      id={`motivo-${l.id}`}
                      name="reason"
                      required
                      minLength={3}
                      maxLength={200}
                      placeholder="Motivo"
                      className="min-h-11 w-40 rounded-xl border bg-background px-3 text-sm"
                    />
                    <button className={ghost}>
                      {l.status === "available" ? "Pasar a cuarentena" : "Volver a la venta"}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-rose-soft px-4 py-3 text-sm">Sin lotes con unidades.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={receiveStock} className="grid gap-3 rounded-xl border p-4">
          <h3 className="font-medium">Recibir mercadería</h3>
          <input type="hidden" name="id" value={productId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Cantidad
              <input
                name="qty"
                type="number"
                inputMode="numeric"
                min={1}
                required
                className={field}
              />
            </label>
            <label className={label}>
              Lote (del envase)
              <input
                name="lot"
                required
                maxLength={40}
                autoCapitalize="characters"
                className={field}
              />
            </label>
            <label className={label}>
              Vencimiento
              <input name="expires" type="month" className={field} />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Mes y año del envase. Si no tiene, dejalo vacío.
              </span>
            </label>
            <label className={label}>
              Costo por unidad (opcional)
              <input
                name="cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className={field}
              />
            </label>
          </div>
          <label className={label}>
            Nota (opcional)
            <input
              name="note"
              maxLength={200}
              placeholder="Ej.: remito 0001-2345"
              className={field}
            />
          </label>
          <button className={cn(btn, "w-fit")}>Sumar al stock</button>
        </form>

        <form action={adjustStock} className="grid gap-3 rounded-xl border p-4">
          <h3 className="font-medium">Ajustar stock</h3>
          <input type="hidden" name="id" value={productId} />
          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">Sentido del ajuste</legend>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" name="direction" value="out" defaultChecked className="size-5" />
              Restar
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" name="direction" value="in" className="size-5" />
              Sumar (corrección)
            </label>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Cantidad
              <input
                name="qty"
                type="number"
                inputMode="numeric"
                min={1}
                required
                className={field}
              />
            </label>
            <label className={label}>
              Tipo
              <select name="kind" defaultValue="waste" className={field}>
                <option value="waste">Merma / rotura / muestra</option>
                <option value="count">Diferencia de conteo</option>
                <option value="adjustment">Otro</option>
              </select>
            </label>
          </div>
          <label className={label}>
            Lote
            <select name="lot_id" defaultValue="" className={field}>
              <option value="">El que vence primero (para restar)</option>
              {lots
                .filter((l) => l.status === "available" || l.status === "depleted")
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lot_code} · {l.qty_on_hand} u.
                  </option>
                ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Para sumar, elegí el lote. Si es mercadería nueva, usá “Recibir mercadería”.
            </span>
          </label>
          <label className={label}>
            Motivo
            <input
              name="reason"
              required
              minLength={3}
              maxLength={200}
              placeholder="Ej.: frasco roto en el local"
              className={field}
            />
          </label>
          <button className={cn(ghost, "w-fit")}>Registrar ajuste</button>
        </form>
      </div>

      {movements.length ? (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">
            Últimos movimientos ({movements.length})
          </summary>
          <ul className="mt-2 grid gap-1 text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
                <span>
                  {dateFmt.format(new Date(m.created_at))} · {KIND[m.kind] ?? m.kind}
                  {m.lot_id && lotCode.get(m.lot_id) ? ` · lote ${lotCode.get(m.lot_id)}` : ""}
                  {m.reason ? ` · ${m.reason}` : ""}
                </span>
                <span
                  className={cn("font-medium tabular-nums", m.qty < 0 ? "text-alert" : "text-leaf")}
                >
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
