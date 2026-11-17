import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { RoutineQuiz, type QuizProduct } from "@/components/routine/routine-quiz";
import { listConcerns, listProducts } from "@/lib/catalog";
import { JsonLd, breadcrumbLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Armá tu rutina de skincare",
  description:
    "Respondé 4 preguntas sobre tu piel y te armamos una rutina de día y de noche con productos dermocosméticos: limpieza, tratamiento, hidratación y protección.",
  alternates: { canonical: "/rutina" },
};

export default async function RutinaPage() {
  const [products, concerns] = await Promise.all([listProducts(), listConcerns()]);
  const quizProducts: QuizProduct[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    price: p.price,
    inStock: p.inStock,
    requiresReview: p.requiresReview,
    categories: p.categories,
    concerns: p.concerns,
    hasImage: p.images.length > 0,
    image: p.images[0] ?? null,
  }));
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Armá tu rutina", path: "/rutina" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} />
      <header className="mx-auto mt-4 max-w-2xl text-center">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Diagnóstico en 1 minuto
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Armá tu rutina</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Cuatro preguntas y te proponemos qué usar de día y de noche, con productos que tenemos en
          stock.
        </p>
      </header>

      <div className="mt-10">
        <Suspense
          fallback={
            <div className="mx-auto h-96 max-w-2xl rounded-2xl bg-mist/60" aria-hidden="true" />
          }
        >
          <RoutineQuiz products={quizProducts} concerns={concerns} />
        </Suspense>
      </div>

      {/* Contenido indexable para buscadores e IAs (docs/16): qué es una rutina */}
      <section aria-labelledby="h-como" className="mx-auto mt-16 max-w-2xl">
        <h2 id="h-como" className="font-display text-3xl font-semibold">
          ¿Cómo se arma una rutina de skincare?
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[17px] leading-relaxed">
          <li>
            <strong>Limpieza</strong> (mañana y noche): retira grasa, maquillaje e impurezas.
          </li>
          <li>
            <strong>Tratamiento</strong> (noche): el activo para tu preocupación, como niacinamida,
            vitamina C o ácidos.
          </li>
          <li>
            <strong>Hidratación</strong> (mañana y noche): mantiene la barrera de la piel.
          </li>
          <li>
            <strong>Protección solar</strong> (mañana): todos los días, incluso nublado.
          </li>
        </ol>
      </section>

      <JsonLd data={breadcrumbLd(crumbs)} />
    </main>
  );
}
