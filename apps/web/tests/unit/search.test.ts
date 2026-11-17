import { describe, expect, it } from "vitest";
import { buildIndex, normalize, search, type SearchDoc } from "@/lib/search";

const doc = (p: Partial<SearchDoc> & { slug: string; name: string }): SearchDoc => ({
  brand: null,
  tagline: null,
  price: 1000,
  image: null,
  concerns: [],
  categories: [],
  ...p,
});

const index = buildIndex([
  doc({
    slug: "acneplur-serum",
    name: "ACNEPLUR Serum",
    brand: "Sulderm",
    concerns: ["Acné"],
    categories: ["Anti‑acné"],
  }),
  doc({
    slug: "rosatopic",
    name: "ROSATOPIC Serum",
    brand: "Sulderm",
    concerns: ["Rosácea y piel sensible"],
  }),
  doc({
    slug: "despig",
    name: "Despigmentante Axilas e Ingle",
    concerns: ["Manchas"],
    categories: ["Despigmentantes"],
  }),
  doc({
    slug: "exel",
    name: "EXEL pantalla fotoprotectora SPF 60",
    brand: "EXEL",
    concerns: ["Protección solar"],
  }),
  doc({ slug: "vitc", name: "Vitamina C", brand: "Sulderm", concerns: ["Manchas", "Antiedad"] }),
]);

const slugs = (q: string) => search(index, q).map((d) => d.slug);

describe("normalize", () => {
  it("saca acentos, mayúsculas y signos", () => {
    expect(normalize("  Rosácea, ¡Ácido!  ")).toBe("rosacea acido");
  });
});

describe("search", () => {
  it("encuentra por nombre con o sin acentos", () => {
    expect(slugs("rosatopic")).toContain("rosatopic");
    expect(slugs("vitamina")).toEqual(["vitc"]);
  });
  it("entiende sinónimos del rubro", () => {
    expect(slugs("granitos")).toContain("acneplur-serum");
    expect(slugs("melasma")).toEqual(expect.arrayContaining(["despig", "vitc"]));
    expect(slugs("bloqueador")).toContain("exel");
    expect(slugs("rojeces")).toContain("rosatopic");
  });
  it("busca por marca", () => {
    expect(slugs("sulderm").length).toBe(3);
  });
  it("todas las palabras deben coincidir", () => {
    expect(slugs("sulderm manchas")).toEqual(["vitc"]);
  });
  it("prioriza coincidencias en el nombre", () => {
    expect(slugs("serum")[0]).toMatch(/serum|rosatopic/);
  });
  it("consulta vacía o de una letra no devuelve nada", () => {
    expect(slugs("")).toEqual([]);
    expect(slugs("a")).toEqual([]);
  });
});
