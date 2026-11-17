"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { CartView } from "@/lib/cart/compute";
import { CartContents } from "./cart-contents";
import { cartStore, useCartState } from "./cart-store";

/** Mini-carrito lateral. Se carga con import() al primer uso. */
export default function CartSheet() {
  const { open, view } = useCartState();
  const [failed, setFailed] = useState(false);

  // Al abrir sin datos frescos, se pide el carrito al servidor (la cookie es httpOnly).
  useEffect(() => {
    if (!open || view) return;
    let alive = true;
    fetch("/api/cart", { cache: "no-store" })
      .then((r) =>
        r.ok ? (r.json() as Promise<CartView>) : Promise.reject(new Error(String(r.status))),
      )
      .then((v) => alive && cartStore.setView(v))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, view]);

  const close = () => cartStore.close();

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? cartStore.open() : close())}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b px-5 py-3 safe-top">
          <SheetTitle className="font-display text-2xl font-semibold">Tu carrito</SheetTitle>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar carrito"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-mist"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <SheetDescription className="sr-only">
          Productos agregados, cantidades y totales.
        </SheetDescription>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {failed ? (
            <p className="py-10 text-center text-muted-foreground">
              No pudimos cargar el carrito. Probá de nuevo.
            </p>
          ) : view ? (
            <CartContents view={view} onNavigate={close} compact />
          ) : (
            <p className="py-10 text-center text-muted-foreground">Cargando…</p>
          )}
        </div>

        {view?.items.length ? (
          <div className="flex flex-col gap-2 border-t px-5 py-4 safe-bottom">
            <Link
              href="/carrito"
              onClick={close}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover"
            >
              Ver carrito y finalizar
            </Link>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center rounded-full text-sm font-medium"
            >
              Seguir comprando
            </button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
