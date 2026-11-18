"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Los submenús del header son <details data-menu> (funcionan sin JS). Con navegación del lado
 * del cliente el header no se vuelve a montar: esto los cierra al cambiar de página, al tocar
 * afuera y con Escape. Abre uno solo a la vez.
 */
export function MenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    document
      .querySelectorAll<HTMLDetailsElement>("details[data-menu][open]")
      .forEach((d) => (d.open = false));
  }, [pathname]);

  useEffect(() => {
    const closeAll = (except?: Element | null) =>
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((d) => {
        if (d !== except) d.open = false;
      });
    const onClick = (e: MouseEvent) =>
      closeAll((e.target as Element | null)?.closest?.("details[data-menu]"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = document.querySelector<HTMLDetailsElement>("details[data-menu][open]");
      if (open) {
        open.open = false;
        open.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
