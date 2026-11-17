"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { ProductMedia } from "@/components/shop/product-media";
import { formatARS, installmentAmount, priceWithPaymentDiscount } from "@/lib/pricing";
import {
  buildRoutine,
  routineTotal,
  type Budget,
  type Depth,
  type RoutineAnswers,
  type RoutineProduct,
  type SkinType,
} from "@/lib/routine";
import type { ProductImage, Taxon } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

export type QuizProduct = RoutineProduct & { image: ProductImage | null };

type Option<T extends string> = { value: T; label: string; hint?: string };

const SKIN: Option<SkinType>[] = [
  { value: "grasa", label: "Grasa", hint: "Brilla a las pocas horas, poros visibles" },
  { value: "mixta", label: "Mixta", hint: "Zona T grasa, mejillas normales o secas" },
  { value: "seca", label: "Seca", hint: "Tirante, opaca, a veces descama" },
  { value: "sensible", label: "Sensible", hint: "Se enrojece o arde con facilidad" },
  { value: "normal", label: "Normal", hint: "Equilibrada, sin grandes molestias" },
];
const DEPTH: Option<Depth>[] = [
  { value: "simple", label: "Simple", hint: "2 o 3 pasos, lo esencial" },
  { value: "completa", label: "Completa", hint: "Sumá hidratación y más cuidado" },
];
const BUDGET: Option<Budget>[] = [
  { value: "hasta-30", label: "Hasta $30.000 por producto" },
  { value: "hasta-50", label: "Hasta $50.000 por producto" },
  { value: "sin-limite", label: "Sin límite" },
];

type Key = "piel" | "preocupacion" | "rutina" | "presupuesto";

export function RoutineQuiz({
  products,
  concerns,
}: {
  products: QuizProduct[];
  concerns: Taxon[];
}) {
  const params = useSearchParams();
  // Solo se aceptan valores conocidos: una URL manipulada no rompe la lógica.
  const valid = (key: Key, v: string | null, allowed: string[]) =>
    v && allowed.includes(v) ? v : undefined;
  const [answers, setAnswers] = useState<Partial<Record<Key, string>>>(() => ({
    piel: valid(
      "piel",
      params.get("piel"),
      SKIN.map((o) => o.value),
    ),
    preocupacion: valid(
      "preocupacion",
      params.get("preocupacion"),
      concerns.map((c) => c.slug),
    ),
    rutina: valid(
      "rutina",
      params.get("rutina"),
      DEPTH.map((o) => o.value),
    ),
    presupuesto: valid(
      "presupuesto",
      params.get("presupuesto"),
      BUDGET.map((o) => o.value),
    ),
  }));
  const steps: { key: Key; title: string; options: Option<string>[] }[] = useMemo(
    () => [
      { key: "piel", title: "¿Cómo es tu piel?", options: SKIN },
      {
        key: "preocupacion",
        title: "¿Qué te gustaría mejorar primero?",
        options: concerns
          .filter((c) => !["corporal", "intimo"].includes(c.slug))
          .map((c) => ({ value: c.slug, label: c.name, hint: c.description })),
      },
      { key: "rutina", title: "¿Qué tipo de rutina querés?", options: DEPTH },
      { key: "presupuesto", title: "¿Cuál es tu presupuesto?", options: BUDGET },
    ],
    [concerns],
  );
  const firstMissing = steps.findIndex((s) => !answers[s.key]);
  const [index, setIndex] = useState(firstMissing === -1 ? steps.length : firstMissing);
  const done = index >= steps.length;

  const choose = (key: Key, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    const i = steps.findIndex((s) => s.key === key);
    setIndex(i + 1);
    if (i + 1 >= steps.length) {
      const qs = new URLSearchParams(next as Record<string, string>).toString();
      window.history.replaceState(null, "", `?${qs}`);
      requestAnimationFrame(() => document.getElementById("rutina-resultado")?.focus());
    }
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (done) {
    const a: RoutineAnswers = {
      skin: answers.piel as SkinType,
      concern: answers.preocupacion!,
      depth: answers.rutina as Depth,
      budget: answers.presupuesto as Budget,
    };
    return (
      <RoutineResult products={products} answers={a} concerns={concerns} onRestart={restart} />
    );
  }

  const step = steps[index];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
          aria-label={`Paso ${index + 1} de ${steps.length}`}
        >
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-300 ease-out"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {index + 1}/{steps.length}
        </span>
      </div>

      <fieldset
        key={step.key}
        className="mt-8 min-w-0 animate-in duration-300 fade-in slide-in-from-bottom-2"
      >
        <legend className="font-display text-3xl font-semibold sm:text-4xl">{step.title}</legend>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {step.options.map((o) => {
            const checked = answers[step.key] === o.value;
            return (
              <label
                key={o.value}
                className={cn(
                  "flex min-h-16 cursor-pointer flex-col justify-center rounded-2xl border bg-card px-5 py-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf",
                  checked ? "border-leaf bg-mist" : "hover:border-leaf/40",
                )}
              >
                <input
                  type="radio"
                  name={step.key}
                  value={o.value}
                  checked={checked}
                  onChange={() => choose(step.key, o.value)}
                  className="sr-only"
                />
                <span className="font-medium">{o.label}</span>
                {o.hint ? (
                  <span className="mt-0.5 text-sm text-muted-foreground">{o.hint}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {index > 0 ? (
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-graphite"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
        </button>
      ) : null}
    </div>
  );
}

function RoutineResult({
  products,
  answers,
  concerns,
  onRestart,
}: {
  products: QuizProduct[];
  answers: RoutineAnswers;
  concerns: Taxon[];
  onRestart: () => void;
}) {
  const steps = useMemo(() => buildRoutine(products, answers), [products, answers]);
  const byslug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const total = routineTotal(steps);
  const concern = concerns.find((c) => c.slug === answers.concern)?.name ?? answers.concern;
  const n = total >= 150000 ? 12 : 6;

  return (
    <section
      id="rutina-resultado"
      tabIndex={-1}
      aria-labelledby="h-resultado"
      className="mx-auto max-w-3xl animate-in duration-300 outline-none fade-in"
    >
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Tu rutina</p>
      <h2 id="h-resultado" className="mt-1 font-display text-4xl font-semibold">
        Piel {answers.skin}, foco en {concern.toLowerCase()}
      </h2>

      {steps.length ? (
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => {
            const prod = byslug.get(s.product.slug);
            return (
              <li key={s.key} className="relative flex gap-4 rounded-2xl border bg-card p-3 sm:p-4">
                <ProductMedia
                  image={prod?.image ?? undefined}
                  name={s.product.name}
                  brand={s.product.brand}
                  zoom
                  sizes="96px"
                  className="h-24 w-24 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    Paso {i + 1} · {s.title} · {s.when}
                  </p>
                  <h3 className="mt-0.5 font-display text-xl leading-snug font-semibold">
                    <Link
                      href={`/producto/${s.product.slug}`}
                      className="after:absolute after:inset-0"
                      data-stretched-link
                    >
                      {s.product.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground">{s.why}</p>
                  <p className="mt-1 font-medium tabular-nums">{formatARS(s.product.price)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 rounded-2xl bg-mist p-6">
          No encontramos productos con ese presupuesto. Probá con un presupuesto mayor.
        </p>
      )}

      {steps.length ? (
        <div className="mt-6 rounded-2xl bg-mist p-5 tabular-nums">
          <p className="flex items-baseline justify-between gap-4">
            <span>Total de la rutina</span>
            <span className="text-2xl font-semibold">{formatARS(total)}</span>
          </p>
          <p className="mt-1 flex justify-between gap-4 text-sm">
            <span>Con transferencia</span>
            <span className="rounded bg-rose-soft px-1.5 font-medium">
              {formatARS(priceWithPaymentDiscount(total, 10))}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {n} cuotas sin interés de {formatARS(installmentAmount(total, n))}
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical opacity-80 disabled:cursor-not-allowed"
          >
            Agregar rutina al carrito · muy pronto
          </button>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        Recomendación orientativa según tus respuestas. No reemplaza la consulta con un profesional.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-graphite px-5 text-sm font-medium"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Volver a empezar
      </button>
    </section>
  );
}
