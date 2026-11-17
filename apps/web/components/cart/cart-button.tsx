"use client";

import dynamic from "next/dynamic";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { cartStore, useCartCount, useCartState } from "./cart-store";

// Un único mini-carrito para toda la página; se descarga recién al primer uso.
const CartSheet = dynamic(() => import("./cart-sheet"), { ssr: false });

/** Monta el mini-carrito una sola vez (va en el layout). */
export function CartSheetHost() {
  const { mounted } = useCartState();
  return mounted ? <CartSheet /> : null;
}

/** Botón del carrito (header y barra inferior). Solo pide abrir; no monta nada. */
export function CartButton({ className, label }: { className?: string; label?: string }) {
  const count = useCartCount();
  return (
    <button
      type="button"
      onClick={() => cartStore.open()}
      onPointerEnter={() => cartStore.warm()}
      aria-label={
        count ? `Carrito: ${count} ${count === 1 ? "producto" : "productos"}` : "Carrito vacío"
      }
      aria-haspopup="dialog"
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1",
        className,
      )}
    >
      <span className="relative inline-flex">
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {count ? (
          <span
            aria-hidden="true"
            className="absolute -top-2 -right-2.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose px-1 text-[10px] leading-none font-semibold text-graphite tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      {label ? <span>{label}</span> : null}
    </button>
  );
}
