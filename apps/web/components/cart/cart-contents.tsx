"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeFromCart, setCartQty } from "@/actions/cart";
import { ProductMedia } from "@/components/shop/product-media";
import type { CartView } from "@/lib/cart/compute";
import { formatARS } from "@/lib/pricing";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { cartStore } from "./cart-store";

/** Ítems + totales del carrito. Lo usan el mini-carrito y la página /carrito. */
export function CartContents({
  view,
  onNavigate,
  compact,
}: {
  view: CartView;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();

  const update = (fn: () => ReturnType<typeof setCartQty>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) cartStore.setView(res.cart);
      else toast.error(res.error);
    });

  if (!view.items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-2xl font-semibold">Tu carrito está vacío</p>
        <p className="text-muted-foreground">Encontrá lo que tu piel necesita o armá tu rutina.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/tienda"
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center rounded-full bg-leaf px-6 text-sm font-medium text-clinical"
          >
            Ir a la tienda
          </Link>
          <Link
            href="/rutina"
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center rounded-full border border-graphite px-6 text-sm font-medium"
          >
            Armá tu rutina
          </Link>
        </div>
      </div>
    );
  }

  const promoPct = Math.min(
    100,
    Math.round((view.subtotal / site.installments.promoMinAmount) * 100),
  );

  return (
    <div
      className={cn("flex flex-col gap-5", pending && "opacity-70 transition-opacity")}
      aria-busy={pending}
    >
      {view.adjusted ? (
        <p role="status" className="rounded-xl bg-rose-soft p-3 text-sm">
          Actualizamos tu carrito: algunos productos cambiaron de stock o ya no están disponibles.
        </p>
      ) : null}

      <div className="rounded-xl bg-mist p-3 text-sm">
        {view.remainingForPromo > 0 ? (
          <p>
            Te faltan <strong className="tabular-nums">{formatARS(view.remainingForPromo)}</strong>{" "}
            para <strong>{site.installments.promo} cuotas sin interés</strong>.
          </p>
        ) : (
          <p>
            🎉 Ya tenés <strong>{site.installments.promo} cuotas sin interés</strong>.
          </p>
        )}
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-label="Avance hacia 12 cuotas sin interés"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={promoPct}
        >
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-500"
            style={{ width: `${promoPct}%` }}
          />
        </div>
      </div>

      <ul className="divide-y">
        {view.items.map((it) => (
          <li key={it.slug} className="flex gap-3 py-3">
            <ProductMedia
              image={it.image ?? undefined}
              name={it.name}
              brand={it.brand}
              zoom
              sizes="80px"
              className={cn("shrink-0 rounded-xl", compact ? "h-20 w-20" : "h-24 w-24")}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={`/producto/${it.slug}`}
                onClick={onNavigate}
                className="font-display text-lg leading-snug font-semibold hover:underline"
              >
                {it.name}
              </Link>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatARS(it.unitPrice)} c/u
              </span>
              <div className="mt-auto flex items-center justify-between gap-2">
                <div
                  className="inline-flex items-center rounded-full border"
                  role="group"
                  aria-label={`Cantidad de ${it.name}`}
                >
                  <button
                    type="button"
                    aria-label="Quitar uno"
                    disabled={pending || it.qty <= 1}
                    onClick={() => update(() => setCartQty({ slug: it.slug, qty: it.qty - 1 }))}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-6 text-center tabular-nums" aria-live="polite">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Agregar uno"
                    disabled={pending || it.qty >= it.maxQty}
                    onClick={() => update(() => setCartQty({ slug: it.slug, qty: it.qty + 1 }))}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="font-medium tabular-nums">{formatARS(it.lineTotal)}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${it.name} del carrito`}
                  disabled={pending}
                  onClick={() => update(() => removeFromCart({ slug: it.slug }))}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:text-alert"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 border-t pt-4 tabular-nums">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd className="text-lg font-semibold">{formatARS(view.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt>Con transferencia ({site.transferDiscountPercent}% off)</dt>
          <dd>
            <span className="rounded bg-rose-soft px-1.5 font-medium">
              {formatARS(view.transferTotal)}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm text-muted-foreground">
          <dt>Cuotas sin interés</dt>
          <dd>
            {view.installments.n} de {formatARS(view.installments.amount)}
          </dd>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">El envío se calcula en el checkout.</p>
      </dl>
    </div>
  );
}
