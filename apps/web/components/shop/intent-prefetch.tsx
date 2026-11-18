"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Precarga por intención: las tarjetas usan prefetch={false} (en el App Router eso desactiva
 * también la precarga por hover) para no descargar decenas de fichas al cargar una grilla.
 * Acá, con UN listener delegado, se precarga la ficha recién cuando el usuario apunta, toca o
 * enfoca un link marcado con data-prefetch-intent. Así la navegación es instantánea y la
 * transición de imagen (ViewTransition) encuentra la ficha lista.
 */
export function IntentPrefetch() {
  const router = useRouter();
  useEffect(() => {
    const done = new Set<string>();
    const onIntent = (e: Event) => {
      if (e instanceof PointerEvent && e.pointerType !== "mouse") return; // en touch: touchstart
      const a = (e.target as Element | null)?.closest?.("a[data-prefetch-intent]");
      const href = a?.getAttribute("href");
      if (!href || done.has(href)) return;
      done.add(href);
      router.prefetch(href);
    };
    const opts = { passive: true, capture: true } as const;
    document.addEventListener("pointerover", onIntent, opts);
    document.addEventListener("touchstart", onIntent, opts);
    document.addEventListener("focusin", onIntent, opts);
    return () => {
      document.removeEventListener("pointerover", onIntent, opts);
      document.removeEventListener("touchstart", onIntent, opts);
      document.removeEventListener("focusin", onIntent, opts);
    };
  }, [router]);
  return null;
}
