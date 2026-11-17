"use client";

import { useSyncExternalStore } from "react";
import type { CartView } from "@/lib/cart/compute";

/**
 * Estado mínimo del carrito en el cliente, sin librerías:
 * - cantidad: leída de la cookie legible bb_cart_count (el header no consulta al servidor)
 * - vista y apertura del mini-carrito: store en memoria con suscriptores.
 */
/** mounted: el mini-carrito (chunk diferido) ya se pidió — por hover o por apertura. */
type State = { open: boolean; mounted: boolean; view: CartView | null };
let state: State = { open: false, mounted: false, view: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const cartStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  open(view?: CartView) {
    state = { open: true, mounted: true, view: view ?? state.view };
    emit();
  },
  /** Precarga el mini-carrito (al pasar el mouse por un botón). */
  warm() {
    if (state.mounted) return;
    state = { ...state, mounted: true };
    emit();
  },
  close() {
    state = { ...state, open: false };
    emit();
  },
  setView(view: CartView) {
    state = { ...state, view };
    emit();
    window.dispatchEvent(new Event("bb:cart"));
  },
};

export function useCartState() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, () => state);
}

function readCount() {
  const m = document.cookie.match(/(?:^|;\s*)bb_cart_count=(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Cantidad para el badge del header; se actualiza al cambiar el carrito o volver a la pestaña. */
export function useCartCount() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("bb:cart", cb);
      window.addEventListener("focus", cb);
      return () => {
        window.removeEventListener("bb:cart", cb);
        window.removeEventListener("focus", cb);
      };
    },
    readCount,
    () => 0,
  );
}
