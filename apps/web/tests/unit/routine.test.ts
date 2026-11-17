import { describe, expect, it } from "vitest";
import { buildRoutine, routineTotal, type RoutineProduct } from "@/lib/routine";

const p = (
  o: Partial<RoutineProduct> & { slug: string; name: string; price: number },
): RoutineProduct => ({
  brand: null,
  inStock: true,
  requiresReview: false,
  categories: [],
  concerns: [],
  hasImage: true,
  ...o,
});

const catalog: RoutineProduct[] = [
  p({ slug: "micelar", name: "Agua Micelar", price: 25000, categories: ["limpieza"] }),
  p({
    slug: "foam",
    name: "ACNEPLUR Foam",
    price: 32000,
    categories: ["anti-acne"],
    concerns: ["acne"],
  }),
  p({
    slug: "acne-serum",
    name: "ACNEPLUR Serum",
    price: 33000,
    categories: ["anti-acne"],
    concerns: ["acne"],
  }),
  p({
    slug: "vitc",
    name: "Vitamina C",
    price: 75000,
    categories: ["serums"],
    concerns: ["manchas", "antiedad"],
  }),
  p({
    slug: "despig",
    name: "Clear complexión despigmentante",
    price: 48000,
    categories: ["despigmentantes"],
    concerns: ["manchas"],
  }),
  p({
    slug: "metformina",
    name: "Solucion de Metformina 30%",
    price: 32000,
    categories: ["despigmentantes"],
    concerns: ["manchas"],
    requiresReview: true,
  }),
  p({
    slug: "rosa",
    name: "ROSATOPIC Serum",
    price: 32000,
    categories: ["serums"],
    concerns: ["rosacea-sensible"],
  }),
  p({
    slug: "bio",
    name: "ROSATOPIC Biosensitive",
    price: 34000,
    categories: ["serums"],
    concerns: ["rosacea-sensible"],
  }),
  p({
    slug: "light",
    name: "Hydra Filler Light",
    price: 29600,
    categories: ["hidratacion"],
    concerns: ["hidratacion"],
  }),
  p({
    slug: "intense",
    name: "Hydra Filler Intense",
    price: 29600,
    categories: ["hidratacion"],
    concerns: ["hidratacion"],
  }),
  p({
    slug: "spf",
    name: "Protector Solar sin Color",
    price: 35500,
    categories: ["proteccion-solar"],
    concerns: ["proteccion-solar"],
  }),
  p({
    slug: "oral",
    name: "Protector via Oral",
    price: 42000,
    categories: ["proteccion-solar"],
    requiresReview: true,
  }),
  p({
    slug: "contorno",
    name: "Contorno de ojos bolsas y ojeras",
    price: 32000,
    categories: ["contorno-ojos-labios"],
    concerns: ["ojeras"],
  }),
  p({
    slug: "agotado",
    name: "Espuma de limpieza",
    price: 25000,
    categories: ["limpieza"],
    inStock: false,
  }),
];

const keys = (s: ReturnType<typeof buildRoutine>) => s.map((x) => `${x.key}:${x.product.slug}`);

describe("buildRoutine", () => {
  it("piel grasa con acné: limpiador y tratamiento anti-acné + protección", () => {
    const r = buildRoutine(catalog, {
      skin: "grasa",
      concern: "acne",
      depth: "simple",
      budget: "sin-limite",
    });
    expect(keys(r)).toEqual(["limpieza:foam", "tratamiento:acne-serum", "proteccion:spf"]);
  });

  it("nunca recomienda productos que requieren asesoramiento ni sin stock", () => {
    const r = buildRoutine(catalog, {
      skin: "normal",
      concern: "manchas",
      depth: "completa",
      budget: "sin-limite",
    });
    const slugs = r.map((s) => s.product.slug);
    expect(slugs).not.toContain("metformina");
    expect(slugs).not.toContain("oral");
    expect(slugs).not.toContain("agotado");
    expect(slugs).toContain("vitc"); // tratamiento para manchas
  });

  it("respeta el presupuesto por producto", () => {
    const r = buildRoutine(catalog, {
      skin: "normal",
      concern: "manchas",
      depth: "simple",
      budget: "hasta-30",
    });
    expect(r.every((s) => s.product.price <= 30000)).toBe(true);
  });

  it("piel sensible prioriza fórmulas suaves", () => {
    const r = buildRoutine(catalog, {
      skin: "sensible",
      concern: "rosacea-sensible",
      depth: "completa",
      budget: "sin-limite",
    });
    expect(r.find((s) => s.key === "tratamiento")?.product.slug).toMatch(/rosa|bio/);
    expect(r.find((s) => s.key === "limpieza")?.product.slug).toBe("micelar");
  });

  it("ojeras usa contorno en lugar de tratamiento", () => {
    const r = buildRoutine(catalog, {
      skin: "mixta",
      concern: "ojeras",
      depth: "simple",
      budget: "sin-limite",
    });
    expect(r.map((s) => s.key)).toEqual(["limpieza", "contorno", "proteccion"]);
  });

  it("rutina completa o piel seca suman hidratación (la versión rica para piel seca)", () => {
    const r = buildRoutine(catalog, {
      skin: "seca",
      concern: "antiedad",
      depth: "simple",
      budget: "sin-limite",
    });
    expect(r.find((s) => s.key === "hidratacion")?.product.slug).toBe("intense");
  });

  it("no repite productos y suma el total", () => {
    const r = buildRoutine(catalog, {
      skin: "normal",
      concern: "hidratacion",
      depth: "completa",
      budget: "sin-limite",
    });
    const slugs = r.map((s) => s.product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(routineTotal(r)).toBe(r.reduce((t, s) => t + s.product.price, 0));
  });
});
