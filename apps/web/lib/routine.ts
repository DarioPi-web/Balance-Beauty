/**
 * "Armá tu rutina" (F3‑11, docs/14 §4): reglas simples y explicables, sin IA.
 * Pura y testeable. Orientativa: no reemplaza la consulta profesional.
 */
export type SkinType = "grasa" | "mixta" | "seca" | "sensible" | "normal";
export type Depth = "simple" | "completa";
export type Budget = "hasta-30" | "hasta-50" | "sin-limite";

export type RoutineAnswers = {
  skin: SkinType;
  concern: string; // slug de preocupación
  depth: Depth;
  budget: Budget;
};

export type RoutineProduct = {
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  inStock: boolean;
  requiresReview: boolean;
  categories: string[];
  concerns: string[];
  hasImage: boolean;
};

export type StepKey = "limpieza" | "tratamiento" | "hidratacion" | "proteccion" | "contorno";

export type RoutineStep = {
  key: StepKey;
  title: string;
  when: "AM" | "PM" | "AM y PM";
  why: string;
  product: RoutineProduct;
};

const MAX_PRICE: Record<Budget, number> = {
  "hasta-30": 30000,
  "hasta-50": 50000,
  "sin-limite": Number.POSITIVE_INFINITY,
};

/** Afinidad por tipo de piel según palabras del nombre. */
const SKIN_HINTS: Record<SkinType, RegExp> = {
  grasa: /acneplur|foam|espuma|light|mandel|salis|salic|toque seco/i,
  mixta: /light|espuma|micelar|niacinamida|hydra/i,
  seca: /intense|urea|edad de oro|supreme/i,
  sensible: /rosatopic|micelar|biosensitive|mist/i,
  normal: /hydra|micelar|vitamina c/i,
};

const isCleanser = (p: RoutineProduct) =>
  /micelar|espuma|foam|cleanser|limpieza/i.test(p.name) && !/[ií]ntimo|scrub/i.test(p.name);
const isMoisturizer = (p: RoutineProduct) =>
  p.categories.includes("hidratacion") || /hydra|biosensitive|hidratante/i.test(p.name);
const isSunscreen = (p: RoutineProduct) =>
  p.categories.includes("proteccion-solar") && !/v[ií]a oral/i.test(p.name);
const isTreatment = (p: RoutineProduct) =>
  ["serums", "despigmentantes", "anti-acne"].includes(p.categories[0] ?? "") && !isCleanser(p);
const isEyeCare = (p: RoutineProduct) => /contorno|ojeras/i.test(p.name);

function pick(
  pool: RoutineProduct[],
  filter: (p: RoutineProduct) => boolean,
  a: RoutineAnswers,
  taken: Set<string>,
): RoutineProduct | null {
  const max = MAX_PRICE[a.budget];
  const candidates = pool.filter(
    (p) => p.inStock && !p.requiresReview && p.price <= max && !taken.has(p.slug) && filter(p),
  );
  const score = (p: RoutineProduct) =>
    (p.concerns[0] === a.concern ? 6 : p.concerns.includes(a.concern) ? 4 : 0) +
    (SKIN_HINTS[a.skin].test(p.name) ? 3 : 0) +
    (a.skin === "sensible" && /acido|ac\.|glic|retinol|mandel/i.test(p.name) ? -4 : 0) +
    // Texturas: la liviana no alcanza para piel seca; la intensa satura la piel grasa.
    (a.skin === "seca" && /light/i.test(p.name) ? -3 : 0) +
    (a.skin === "grasa" && /intense|supreme/i.test(p.name) ? -3 : 0) +
    (p.hasImage ? 1 : 0);
  const best = candidates.sort((x, y) => score(y) - score(x) || x.price - y.price)[0];
  if (best) taken.add(best.slug);
  return best ?? null;
}

export function buildRoutine(products: RoutineProduct[], a: RoutineAnswers): RoutineStep[] {
  const taken = new Set<string>();
  const steps: RoutineStep[] = [];
  const push = (step: Omit<RoutineStep, "product">, p: RoutineProduct | null) => {
    if (p) steps.push({ ...step, product: p });
  };

  push(
    {
      key: "limpieza",
      title: "Limpieza",
      when: "AM y PM",
      why: "Retira impurezas y prepara la piel para los activos.",
    },
    pick(products, isCleanser, a, taken),
  );

  if (a.concern === "ojeras") {
    push(
      {
        key: "contorno",
        title: "Contorno de ojos",
        when: "AM y PM",
        why: "Fórmula específica para la piel fina del contorno.",
      },
      pick(products, isEyeCare, a, taken),
    );
  } else if (a.concern !== "proteccion-solar" && a.concern !== "hidratacion") {
    push(
      {
        key: "tratamiento",
        title: "Tratamiento",
        when: "PM",
        why: "El activo que trabaja tu preocupación principal.",
      },
      pick(products, (p) => isTreatment(p) || p.concerns.includes(a.concern), a, taken),
    );
  }

  if (a.depth === "completa" || a.concern === "hidratacion" || a.skin === "seca") {
    push(
      {
        key: "hidratacion",
        title: "Hidratación",
        when: "AM y PM",
        why: "Refuerza la barrera y mantiene el equilibrio.",
      },
      pick(products, isMoisturizer, a, taken),
    );
  }

  push(
    {
      key: "proteccion",
      title: "Protección solar",
      when: "AM",
      why: "Sin protección diaria, ningún tratamiento rinde.",
    },
    pick(products, isSunscreen, a, taken),
  );

  return steps;
}

export const routineTotal = (steps: RoutineStep[]) =>
  steps.reduce((s, x) => s + x.product.price, 0);
