import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { LegalDraftNotice } from "@/components/shop/legal-draft";
import { formatARS } from "@/lib/pricing";
import { JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

// Respuestas armadas con las reglas que ya implementa la tienda (pagos, envíos, stock, ley).
// noindex hasta que el dueño las revise; el JSON-LD FAQPage refleja exactamente el texto visible.
export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  robots: { index: false, follow: true },
  alternates: { canonical: "/preguntas-frecuentes" },
};

const faqs = [
  {
    q: "¿Qué medios de pago aceptan?",
    a: `Tarjetas de crédito y débito a través de Mercado Pago y transferencia bancaria, que tiene ${site.transferDiscountPercent} % de descuento.`,
  },
  {
    q: "¿Tienen cuotas sin interés?",
    a: `Sí: ${site.installments.standard} cuotas sin interés en cualquier compra y ${site.installments.promo} cuotas desde ${formatARS(site.installments.promoMinAmount)}.`,
  },
  {
    q: "¿Hacen envíos a todo el país?",
    a: "Sí. El costo y el plazo se calculan al finalizar la compra según tu código postal. Podés elegir envío a domicilio o retiro en una sucursal del correo.",
  },
  {
    q: "¿Cómo sigo mi envío?",
    a: "Cuando despachamos tu pedido te enviamos un email con el transportista y el código de seguimiento, que podés consultar en el sitio del correo.",
  },
  {
    q: "¿Cuánto tiempo tengo para pagar por transferencia?",
    a: "Reservamos el stock de tu pedido por 30 minutos. Si la transferencia se acredita después, igual la confirmamos siempre que haya stock.",
  },
  {
    q: "¿Puedo arrepentirme de la compra?",
    a: "Sí. Tenés 10 días corridos desde que recibís el pedido para revocar la compra, según el artículo 34 de la Ley 24.240 de Defensa del Consumidor.",
  },
  {
    q: "¿Por qué algunos productos no se pueden comprar online?",
    a: "Los productos que requieren indicación profesional se venden con asesoramiento previo. Escribinos y te ayudamos.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", path: "/" },
          { name: "Preguntas frecuentes", path: "/preguntas-frecuentes" },
        ]}
      />
      <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Preguntas frecuentes</h1>
      <div className="mt-4">
        <LegalDraftNotice />
      </div>
      <dl className="mt-6 grid gap-3">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border bg-card p-5">
            <dt className="font-display text-xl font-semibold">{f.q}</dt>
            <dd className="mt-2 text-base leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8">
        ¿No encontraste tu respuesta?{" "}
        <Link
          href="/contacto"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          Escribinos
        </Link>
      </p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </main>
  );
}
