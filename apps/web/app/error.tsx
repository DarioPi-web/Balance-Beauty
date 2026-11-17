"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Error inesperado en una ruta: mensaje humano + reintento. Se reporta a Sentry cuando esté configurado. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Algo salió mal</p>
      <h1 className="font-display text-4xl font-semibold">No pudimos cargar esta página</h1>
      <p className="text-muted-foreground">
        Puede ser un problema momentáneo. Probá de nuevo o volvé a la tienda.
        {error.digest ? <span className="mt-2 block text-xs">Código: {error.digest}</span> : null}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-leaf px-6 text-sm font-medium text-clinical"
        >
          Reintentar
        </button>
        <Link
          href="/tienda"
          className="inline-flex min-h-11 items-center rounded-full border border-graphite px-6 text-sm font-medium"
        >
          Ir a la tienda
        </Link>
      </div>
    </main>
  );
}
