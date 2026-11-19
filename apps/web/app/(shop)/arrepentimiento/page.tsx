import { Suspense } from "react";
import type { Metadata } from "next";
import { requestWithdrawal } from "@/actions/withdrawal";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description:
    "Revocá tu compra dentro de los 10 días corridos desde que recibiste el producto, sin costo ni explicaciones.",
  alternates: { canonical: "/arrepentimiento" },
};

const field = "mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base";
const label = "block font-medium";

/** Mensaje según el resultado (lee la URL: va detrás de Suspense). */
async function Outcome({
  search,
}: {
  search: Promise<{ codigo?: string; error?: string; ok?: string }>;
}) {
  const { codigo, error } = await search;
  if (codigo && /^[A-Z0-9]{6,12}$/.test(codigo)) {
    return (
      <div role="status" className="rounded-2xl border border-leaf/40 bg-mist p-5">
        <h2 className="font-display text-2xl font-semibold">Recibimos tu solicitud</h2>
        <p className="mt-2">
          Tu código de identificación es{" "}
          <strong className="font-mono text-xl tracking-wider">{codigo}</strong>. Guardalo: te lo
          enviamos también por email.
        </p>
        <p className="mt-2">
          Te escribimos dentro de las próximas 24 horas hábiles con los pasos para la devolución.
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
        {error.slice(0, 200)}
      </p>
    );
  }
  return null;
}

export default function ArrepentimientoPage({ searchParams }: PageProps<"/arrepentimiento">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Botón de arrepentimiento", path: "/arrepentimiento" },
        ]}
      />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
        Botón de arrepentimiento
      </h1>
      <div className="mt-4 grid gap-3 text-lg text-muted-foreground">
        <p>
          Podés revocar tu compra dentro de los <strong>10 días corridos</strong> desde que
          recibiste el producto, sin costo y sin dar explicaciones (Ley 24.240, art. 34).
        </p>
        <p>
          El producto tiene que estar sin abrir ni usar, en su envase original. El envío de vuelta
          corre por nuestra cuenta y te devolvemos el dinero por el mismo medio de pago.
        </p>
      </div>

      <div className="mt-6 grid gap-6">
        <Suspense fallback={null}>
          <Outcome
            search={searchParams as Promise<{ codigo?: string; error?: string; ok?: string }>}
          />
        </Suspense>

        <form action={requestWithdrawal} className="grid gap-4 rounded-2xl border bg-card p-5">
          <label className={label}>
            Nombre y apellido
            <input
              name="full_name"
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
              className={field}
            />
          </label>
          <label className={label}>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={field}
            />
          </label>
          <label className={label}>
            Número de pedido{" "}
            <span className="font-normal text-muted-foreground">(si lo tenés)</span>
            <input
              name="order_number"
              inputMode="numeric"
              maxLength={12}
              placeholder="Ej.: 1024"
              className={field}
            />
          </label>
          <label className={label}>
            Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
            <textarea
              name="reason"
              rows={3}
              maxLength={2000}
              className="mt-1 block w-full rounded-xl border bg-background px-3 py-2 text-base"
            />
          </label>
          {/* Honeypot anti-bots: oculto para personas y lectores de pantalla. */}
          <div aria-hidden="true" className="hidden">
            <label>
              Sitio web
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <button className="inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover">
            Enviar solicitud de arrepentimiento
          </button>
          <p className="text-sm text-muted-foreground">
            Al enviarla te mostramos un código de identificación y te lo mandamos por email.
          </p>
        </form>
      </div>
    </main>
  );
}
