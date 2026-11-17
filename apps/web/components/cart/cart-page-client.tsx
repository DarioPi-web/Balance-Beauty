"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { CartView } from "@/lib/cart/compute";
import { CartContents } from "./cart-contents";
import { cartStore, useCartState } from "./cart-store";

/** Página /carrito: arranca con la vista calculada en el servidor y se actualiza con las acciones. */
export function CartPageClient({ initial }: { initial: CartView }) {
  const { view } = useCartState();

  // Sincroniza el store con lo que leyó el servidor (fuente de verdad: la cookie).
  useEffect(() => {
    cartStore.setView(initial);
  }, [initial]);

  const current = view ?? initial;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <CartContents view={current} />
      {current.items.length ? (
        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-32">
          <h2 className="font-display text-2xl font-semibold">Finalizar compra</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            En el próximo paso vas a elegir envío o retiro y el medio de pago: tarjeta en cuotas,
            transferencia o QR con 10 % off.
          </p>
          <Link
            href="/checkout"
            prefetch={false}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical transition-colors hover:bg-leaf-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Continuar al pago
          </Link>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-leaf" aria-hidden="true" /> Compra segura. Tus
            datos viajan cifrados.
          </p>
        </aside>
      ) : null}
    </div>
  );
}
