"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildIndex, search, type SearchDoc } from "@/lib/search";
import { formatARS } from "@/lib/pricing";

const SUGGESTIONS = ["Manchas", "Acné", "Protector solar", "Vitamina C", "Rosácea", "Ojeras"];

let cache: SearchDoc[] | null = null;

/** Diálogo de búsqueda. Se carga con import() al primer toque de la lupa (no pesa en el inicio). */
export default function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<SearchDoc[] | null>(cache);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (docs) return;
    let alive = true;
    fetch("/api/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SearchDoc[]) => {
        cache = d;
        if (alive) setDocs(d);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [docs]);

  const index = useMemo(() => (docs ? buildIndex(docs) : []), [docs]);
  const results = useMemo(() => search(index, query, 12), [index, query]);

  const go = (slug: string) => {
    onOpenChange(false);
    router.push(`/producto/${slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 max-h-dvh w-full max-w-none translate-y-0 gap-0 overflow-hidden rounded-none p-0 sm:top-[12%] sm:max-w-xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">Buscar productos</DialogTitle>
        <DialogDescription className="sr-only">
          Escribí un producto, activo, marca o preocupación de la piel.
        </DialogDescription>
        <Command
          shouldFilter={false}
          label="Buscar productos"
          className="flex max-h-dvh flex-col sm:max-h-[70vh]"
        >
          <div className="flex items-center gap-2 border-b px-4 safe-top">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar: manchas, vitamina C, Sulderm…"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar búsqueda"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-mist"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <Command.List className="overflow-y-auto overscroll-contain p-2">
            {failed ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No pudimos cargar la búsqueda. Probá de nuevo.
              </p>
            ) : !docs ? (
              <Command.Loading>
                <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>
              </Command.Loading>
            ) : query.trim().length < 2 ? (
              <div className="p-3">
                <p className="mb-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  Búsquedas frecuentes
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="inline-flex min-h-11 items-center rounded-full bg-mist px-4 text-sm font-medium hover:bg-leaf/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Command.Empty>
                  <p className="p-6 text-center text-sm">
                    No encontramos “{query}”. Probá con una preocupación (manchas, acné) o un
                    activo.
                  </p>
                </Command.Empty>
                {results.map((d) => (
                  <Command.Item
                    key={d.slug}
                    value={d.slug}
                    onSelect={() => go(d.slug)}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 data-[selected=true]:bg-mist"
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-mist">
                      {d.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- variante AVIF ya optimizada
                        <img
                          src={d.image}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full scale-150 object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[d.brand, d.concerns[0]].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatARS(d.price)}
                    </span>
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
