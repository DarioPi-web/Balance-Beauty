"use client";

import { useActionState } from "react";
import {
  applyProductSheet,
  previewProductSheet,
  type PreviewState,
} from "@/actions/admin-product-sheet";

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover disabled:cursor-wait disabled:opacity-60";
const ghost =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 font-medium hover:bg-mist";

const fmt = (v: string | number | null) =>
  v === null || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("es-AR") : v;
const STATUS: Record<string, string> = {
  active: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
};
const show = (field: string, v: string | number | null) =>
  field === "status" && typeof v === "string" ? (STATUS[v] ?? v) : fmt(v);

/** Subir la planilla → revisar cambios → aplicar. Nada se guarda hasta "Aplicar". */
export function ProductSheetUploader() {
  const [preview, upload, uploading] = useActionState<PreviewState, FormData>(previewProductSheet, {
    step: "idle",
  });
  const [result, apply, applying] = useActionState<PreviewState, FormData>(applyProductSheet, {
    step: "idle",
  });
  const state = result.step !== "idle" ? result : preview;

  return (
    <div className="grid gap-5">
      <form
        action={upload}
        className="grid gap-3 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6"
      >
        <h2 className="font-display text-2xl font-semibold">2. Subí la planilla editada</h2>
        <label className="grid gap-1 text-sm font-medium">
          Archivo Excel (.xlsx, hasta 4 MB)
          <input
            name="file"
            type="file"
            required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-base file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-4 file:py-1.5"
          />
        </label>
        <button className={`${btn} w-fit`} disabled={uploading}>
          {uploading ? "Leyendo…" : "Revisar cambios"}
        </button>
        <p className="text-sm text-muted-foreground">
          Primero te mostramos qué va a cambiar. No se guarda nada hasta que confirmes.
        </p>
      </form>

      <div aria-live="polite" className="grid gap-5">
        {state.step === "error" ? (
          <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
            {state.message}
          </p>
        ) : null}

        {state.step === "done" ? (
          <div role="status" className="grid gap-2 rounded-2xl border border-leaf/40 bg-mist p-5">
            <h2 className="font-display text-2xl font-semibold">Listo</h2>
            <p>
              Se actualizaron <strong>{state.updated}</strong> producto
              {state.updated === 1 ? "" : "s"}
              {state.stockChanges
                ? ` (${state.stockChanges} con cambio de stock, registrado en el historial)`
                : ""}
              . La tienda ya muestra los cambios.
            </p>
            {state.notPublished.length ? (
              <p className="text-sm">
                No se publicaron porque les falta foto, precio o categoría:{" "}
                <strong>{state.notPublished.join(", ")}</strong>. Completalos desde el editor.
              </p>
            ) : null}
          </div>
        ) : null}

        {state.step === "preview" ? (
          <section
            className="grid gap-4 rounded-2xl border bg-card p-5"
            aria-labelledby="cambios-t"
          >
            <h2 id="cambios-t" className="font-display text-2xl font-semibold">
              3. Revisá y aplicá
            </h2>
            <p className="text-sm text-muted-foreground">
              {state.fileName}: {state.changes.length} producto
              {state.changes.length === 1 ? "" : "s"} con cambios · {state.unchanged} sin cambios
              {state.errors.length ? ` · ${state.errors.length} con errores` : ""}.
            </p>

            {state.errors.length ? (
              <div
                role="alert"
                className="grid gap-2 rounded-xl border border-alert/40 bg-rose-soft p-4"
              >
                <p className="font-medium">
                  Corregí estos errores en la planilla y volvé a subirla (no se puede aplicar con
                  errores):
                </p>
                <ul className="grid gap-1 text-sm">
                  {state.errors.map((e, i) => (
                    <li key={i}>
                      Fila {e.row}
                      {e.sku ? ` · código ${e.sku}` : ""}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {state.changes.length ? (
              <ul className="grid gap-3">
                {state.changes.map((c) => (
                  <li key={c.sku} className="rounded-xl border p-3">
                    <p className="font-medium">
                      {c.name} <span className="text-sm text-muted-foreground">· {c.sku}</span>
                    </p>
                    <ul className="mt-1 grid gap-1 text-sm">
                      {c.changes.map((f) => (
                        <li key={f.field} className="flex flex-wrap gap-x-2">
                          <span className="text-muted-foreground">{f.label}:</span>
                          <span className="line-through decoration-alert/60">
                            {show(f.field, f.from)}
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="sr-only">pasa a</span>
                          <strong>{show(f.field, f.to)}</strong>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay cambios para aplicar.</p>
            )}

            {state.changes.length && !state.errors.length ? (
              <form action={apply} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="payload" value={state.payload} />
                <button className={btn} disabled={applying}>
                  {applying
                    ? "Aplicando…"
                    : `Aplicar ${state.changes.length} cambio${state.changes.length === 1 ? "" : "s"}`}
                </button>
                <button type="button" onClick={() => window.location.reload()} className={ghost}>
                  Cancelar
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
