import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice } from "@/components/shop/legal-draft";

// Borrador: noindex hasta que lo apruebe el dueño / asesor legal (docs/10, D6 en docs/18).
// Destino de la redirección heredada /reembolso_devoluciones.
export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  robots: { index: false, follow: true },
  alternates: { canonical: "/devoluciones" },
};

export default function DevolucionesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Cambios y devoluciones</h1>
      <div className="mt-4">
        <LegalDraftNotice />
      </div>
      <div className="mt-6 grid gap-4 text-base leading-relaxed">
        <h2 className="font-display text-2xl font-semibold">Arrepentimiento de la compra</h2>
        <p>
          Podés revocar la compra dentro de los 10 días corridos desde que recibiste el producto,
          sin costo y sin dar explicaciones (Ley 24.240, art. 34). El producto tiene que estar sin
          abrir ni usar, en su envase original. Te damos un código de identificación y te escribimos
          con los pasos.
        </p>
        <Link
          href="/arrepentimiento"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover"
        >
          Ir al Botón de arrepentimiento
        </Link>
        <h2 className="font-display text-2xl font-semibold">Productos con fallas</h2>
        <p>
          Si un producto llegó dañado, con fallas o no es el que pediste, escribinos dentro de las
          48 horas de recibido con una foto y el número de pedido. Lo cambiamos sin costo.
        </p>
        <h2 className="font-display text-2xl font-semibold">Higiene y seguridad</h2>
        <p>
          Por tratarse de productos de cuidado personal, no aceptamos cambios ni devoluciones de
          productos abiertos o usados, salvo fallas de fabricación.
        </p>
        <h2 className="font-display text-2xl font-semibold">Reintegros</h2>
        <p>
          El reintegro se hace por el mismo medio de pago. Con tarjeta, el plazo de acreditación
          depende del banco emisor.
        </p>
        <Link
          href="/terminos"
          className="inline-flex min-h-11 w-fit items-center underline underline-offset-2"
        >
          Ver términos y condiciones
        </Link>
      </div>
    </main>
  );
}
