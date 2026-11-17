import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice } from "@/components/shop/legal-draft";

// Borrador: noindex hasta que lo apruebe el dueño / asesor legal (docs/10, pendientes en ESTADO.md).
export const metadata: Metadata = {
  title: "Términos y condiciones",
  robots: { index: false, follow: true },
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Términos y condiciones</h1>
      <div className="mt-4">
        <LegalDraftNotice />
      </div>
      <div className="mt-6 grid gap-4 text-base leading-relaxed">
        <h2 className="font-display text-2xl font-semibold">Precios y pagos</h2>
        <p>
          Los precios están expresados en pesos argentinos e incluyen IVA. El total definitivo
          (descuentos y envío) se confirma al registrar el pedido. Los pagos con tarjeta se procesan
          a través de Mercado Pago.
        </p>
        <h2 className="font-display text-2xl font-semibold">Stock y reservas</h2>
        <p>
          Al confirmar un pedido reservamos el stock por 30 minutos. Si el pago no se acredita, la
          reserva se libera. Los productos que requieren indicación profesional no se venden online.
        </p>
        <h2 className="font-display text-2xl font-semibold">Botón de arrepentimiento</h2>
        <p>
          Podés revocar la compra dentro de los 10 días corridos desde la entrega, conforme al
          artículo 34 de la Ley 24.240 de Defensa del Consumidor.
        </p>
        <Link
          href="/privacidad"
          className="inline-flex min-h-11 w-fit items-center underline underline-offset-2"
        >
          Ver la política de privacidad
        </Link>
      </div>
    </main>
  );
}
