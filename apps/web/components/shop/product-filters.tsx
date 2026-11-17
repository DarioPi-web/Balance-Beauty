"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { SortKey, Taxon } from "@/lib/catalog/types";
import { FiltersView } from "./filters-view";

/**
 * Filtros de la tienda SIN hidratar las tarjetas: la grilla es HTML del servidor
 * (#product-grid > [data-product]) y acá solo se ocultan/reordenan los nodos.
 * Menos JS y sin reemplazar contenido → sin TBT ni saltos de layout (docs/11).
 */
export function ProductFilters({
  categories,
  concerns,
  index,
}: {
  categories: Taxon[];
  concerns: Taxon[];
  /** Índice liviano (categorías y preocupaciones por producto) para contar sin tocar el DOM. */
  index: { c: string[]; k: string[] }[];
}) {
  const params = useSearchParams();
  const category = params.get("categoria") ?? "";
  const concern = params.get("preocupacion") ?? "";
  const sort = (params.get("orden") as SortKey) || "recomendados";
  const total = index.filter(
    (p) => (!category || p.c.includes(category)) && (!concern || p.k.includes(concern)),
  ).length;

  // Recuerda si alguna vez se tocó el DOM: en la carga sin filtros no se hace NADA
  // (evita recalcular el layout de 50 tarjetas en el arranque → TBT).
  const touched = useRef(false);

  useEffect(() => {
    const active = Boolean(category || concern || sort !== "recomendados");
    if (!active && !touched.current) return;
    touched.current = true;

    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll<HTMLElement>("[data-product]"));
    for (const el of items) {
      const cats = el.dataset.categories?.split(" ") ?? [];
      const cons = el.dataset.concerns?.split(" ") ?? [];
      const hide = !(
        (!category || cats.includes(category)) &&
        (!concern || cons.includes(concern))
      );
      if (el.hidden !== hide) el.hidden = hide;
    }
    const key = (el: HTMLElement) => {
      switch (sort) {
        case "precio-asc":
          return Number(el.dataset.price);
        case "precio-desc":
          return -Number(el.dataset.price);
        case "nombre":
          return 0;
        default:
          return Number(el.dataset.rank);
      }
    };
    const sorted =
      sort === "nombre"
        ? [...items].sort((a, b) =>
            (a.dataset.name ?? "").localeCompare(b.dataset.name ?? "", "es"),
          )
        : [...items].sort((a, b) => key(a) - key(b));
    sorted.forEach((el, i) => {
      const order = sort === "recomendados" ? "" : String(i);
      if (el.style.order !== order) el.style.order = order;
    });
    document.getElementById("product-empty")?.toggleAttribute("hidden", total > 0);
  }, [category, concern, sort, total]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  return (
    <FiltersView
      categories={categories}
      concerns={concerns}
      category={category}
      concern={concern}
      sort={sort}
      total={total}
      onChange={set}
    />
  );
}
