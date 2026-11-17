/**
 * Búsqueda del catálogo en el cliente (50 productos: no justifica un servicio ni ir a la base).
 * Pura y testeable. Cuando el catálogo crezca (> 500), se reemplaza por la RPC search_products.
 */
export type SearchDoc = {
  slug: string;
  name: string;
  brand: string | null;
  tagline: string | null;
  price: number;
  image: string | null;
  concerns: string[]; // nombres visibles
  categories: string[]; // nombres visibles
};

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Sinónimos del rubro: lo que escribe la gente → cómo se llama en el catálogo (docs/16 §4). */
const SYNONYMS: Record<string, string[]> = {
  granos: ["acne"],
  granitos: ["acne"],
  espinillas: ["acne"],
  "puntos negros": ["acne", "salicilico"],
  grasa: ["acne"],
  manchas: ["despigmentante", "manchas"],
  melasma: ["despigmentante", "manchas"],
  rojeces: ["rosacea", "rosatopic"],
  rosacea: ["rosatopic", "rosacea"],
  sensible: ["rosacea", "rosatopic"],
  sol: ["protector", "solar"],
  spf: ["protector", "solar"],
  bloqueador: ["protector", "solar"],
  arrugas: ["antiedad"],
  "anti edad": ["antiedad"],
  ojeras: ["contorno", "ojeras"],
  bolsas: ["contorno", "ojeras"],
  colageno: ["nutricosmetica", "fine", "drink"],
  suplemento: ["nutricosmetica"],
  celulitis: ["anticelulitis"],
  limpiador: ["limpieza", "cleanser", "espuma", "micelar"],
  "vitamina c": ["vitamina c"],
  "acido hialuronico": ["hydra", "hialuronico", "hyalucol"],
  hidratante: ["hidratacion", "hydra"],
};

function expand(query: string): string[][] {
  const q = normalize(query);
  if (!q) return [];
  // Frases de sinónimos primero (p. ej. "puntos negros"), después tokens sueltos.
  const groups: string[][] = [];
  let rest = q;
  for (const [phrase, alts] of Object.entries(SYNONYMS)) {
    if (phrase.includes(" ") && rest.includes(phrase)) {
      groups.push([phrase, ...alts]);
      rest = rest.replace(phrase, " ");
    }
  }
  for (const token of rest.split(" ").filter((t) => t.length >= 2)) {
    groups.push([token, ...(SYNONYMS[token] ?? [])]);
  }
  return groups;
}

type Indexed = { doc: SearchDoc; name: string; brand: string; tags: string; text: string };

export function buildIndex(docs: SearchDoc[]): Indexed[] {
  return docs.map((doc) => ({
    doc,
    name: normalize(doc.name),
    brand: normalize(doc.brand ?? ""),
    tags: normalize([...doc.concerns, ...doc.categories].join(" ")),
    text: normalize(doc.tagline ?? ""),
  }));
}

const hasWordPrefix = (haystack: string, term: string) =>
  haystack.startsWith(term) || haystack.includes(` ${term}`);

/** Cada grupo (palabra del usuario + sus sinónimos) debe coincidir en algún campo (AND). */
export function search(index: Indexed[], query: string, limit = 12): SearchDoc[] {
  const groups = expand(query);
  if (!groups.length) return [];
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const it of index) {
    let score = 0;
    let ok = true;
    for (const alts of groups) {
      let best = 0;
      for (const t of alts) {
        if (hasWordPrefix(it.name, t)) best = Math.max(best, 5);
        else if (hasWordPrefix(it.brand, t)) best = Math.max(best, 4);
        else if (hasWordPrefix(it.tags, t)) best = Math.max(best, 3);
        else if (it.name.includes(t)) best = Math.max(best, 2);
        else if (hasWordPrefix(it.text, t)) best = Math.max(best, 1);
      }
      if (!best) {
        ok = false;
        break;
      }
      score += best;
    }
    if (ok) scored.push({ doc: it.doc, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.doc.name.localeCompare(b.doc.name, "es"))
    .slice(0, limit)
    .map((s) => s.doc);
}
