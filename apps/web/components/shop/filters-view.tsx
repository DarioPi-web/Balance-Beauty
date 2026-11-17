"use client";

import type { ReactNode } from "react";
import type { SortKey, Taxon } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recomendados", label: "Recomendados" },
  { key: "precio-asc", label: "Menor precio" },
  { key: "precio-desc", label: "Mayor precio" },
  { key: "nombre", label: "A‑Z" },
];

/**
 * Vista de filtros sin estado. Se usa igual en el HTML del servidor (fallback, sin onChange)
 * y en el cliente, así el reemplazo no mueve nada (CLS 0).
 */
export function FiltersView({
  categories,
  concerns,
  category = "",
  concern = "",
  sort = "recomendados",
  total,
  onChange,
}: {
  categories: Taxon[];
  concerns: Taxon[];
  category?: string;
  concern?: string;
  sort?: SortKey;
  total?: number;
  onChange?: (key: string, value: string) => void;
}) {
  const interactive = Boolean(onChange);
  return (
    <div className="flex flex-col gap-4">
      <FilterRow
        label="Preocupación"
        options={concerns}
        value={concern}
        disabled={!interactive}
        onChange={(v) => onChange?.("preocupacion", v)}
      />
      <FilterRow
        label="Categoría"
        options={categories}
        value={category}
        disabled={!interactive}
        onChange={(v) => onChange?.("categoria", v)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
          {total !== undefined ? `${total} ${total === 1 ? "producto" : "productos"}` : " "}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ordenar</span>
          <select
            value={sort}
            disabled={!interactive}
            onChange={(e) =>
              onChange?.("orden", e.target.value === "recomendados" ? "" : e.target.value)
            }
            className="min-h-11 rounded-full border bg-card px-4 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: Taxon[];
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    // min-w-0: un <fieldset> por defecto mide min-content y rompería el scroll horizontal de los chips
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </legend>
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!value} onClick={() => onChange("")}>
          Todas
        </Chip>
        {options.map((o) => (
          <Chip
            key={o.slug}
            active={value === o.slug}
            onClick={() => onChange(value === o.slug ? "" : o.slug)}
          >
            {o.name}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "bg-leaf text-clinical" : "bg-mist text-graphite hover:bg-leaf/10",
      )}
    >
      {children}
    </button>
  );
}
