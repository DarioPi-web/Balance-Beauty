import type { Metadata } from "next";
import { LegalDraftNotice } from "@/components/shop/legal-draft";

// Borrador: noindex hasta que lo apruebe el dueño / asesor legal (docs/10, pendientes en ESTADO.md).
export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: false, follow: true },
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Política de privacidad</h1>
      <div className="mt-4">
        <LegalDraftNotice />
      </div>
      <div className="mt-6 grid gap-4 text-base leading-relaxed">
        <p>
          Usamos tus datos (nombre, email, teléfono, DNI y dirección) solo para procesar tu pedido,
          coordinar el envío y cumplir obligaciones legales y fiscales. No los vendemos ni los
          compartimos con terceros, salvo con quienes intervienen en el pago y la entrega.
        </p>
        <p>
          Las novedades por email solo te llegan si lo aceptaste, y podés darte de baja cuando
          quieras.
        </p>
        <p>
          Podés pedir acceso, rectificación o supresión de tus datos en cualquier momento, conforme
          a la Ley 25.326 de Protección de los Datos Personales.
        </p>
      </div>
    </main>
  );
}
