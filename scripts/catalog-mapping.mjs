// Mapeos editoriales del catálogo heredado (propuestas a validar con el cliente: Q-07, Q-21, Q-25).
// SKU → foto(s) identificadas en el backup de noviembre 2026 (solo coincidencias seguras).
export const PHOTOS = {
  152: ["BB-001", "BB-001_2"], // Fine Smooth
  155: ["BB-002", "BB-002_2", "BB-002_3"], // DermaNutrix Drink Beauty
  118: ["BB-003", "BB-003_2", "BB-003_3", "BB-003_4"], // Contorno de ojos bolsas y ojeras
  114: ["BB-006"], // EXEL pantalla SPF 60
  125: ["BB-008"], // Vitamina C
  134: ["BB-011"], // Spray Mist
  143: ["BB-012", "BB-012_2", "BB-012_3", "BB-012_4"], // Jabón íntimo prebiótico
  136: ["BB-031", "BB-031_2", "BB-031_3", "BB-031_4", "BB-031_5"], // ROSATOPIC Biosensitive
  128: ["BB-032", "BB-032_2", "BB-032_3", "BB-032_4", "BB-032_5"], // ROSATOPIC Serum
  133: ["BB-035", "BB-035_2", "BB-035_3", "BB-035_4", "BB-035_5"], // ACNEPLUR Hydra
  131: ["BB-036", "BB-036_2", "BB-036_3", "BB-036_4", "BB-036_5"], // ACNEPLUR Serum
  132: ["BB-037", "BB-037_2", "BB-037_3", "BB-037_4", "BB-037_5"], // ACNEPLUR Foam
  142: ["BB-039", "BB-039_2"], // Nutricéutico antiglicante
  104: ["BB-042", "BB-042_2"], // Agua micelar
  145: ["BB-043", "BB-043_2"], // Carthage Deep care
  105: ["BB-044", "BB-044_2", "BB-044_3", "BB-044_4"], // Espuma de limpieza
};

// Marca por SKU (según fotos/nombre). Sin confirmar → "Sulderm" solo donde la foto lo muestra.
export const BRANDS = {
  152: "FINE",
  150: "FINE",
  151: "FINE",
  153: "FINE",
  154: "FINE",
  155: "DermaNutrix",
  156: "DermaNutrix",
  114: "EXEL",
  145: "Carthage",
  144: "Liderma",
  118: "Sulderm",
  125: "Sulderm",
  134: "Sulderm",
  143: "Sulderm",
  136: "Sulderm",
  128: "Sulderm",
  133: "Sulderm",
  131: "Sulderm",
  132: "Sulderm",
  142: "Sulderm",
  104: "Sulderm",
  105: "Sulderm",
};

// Reglas por nombre → categoría y preocupaciones. Orden: de lo específico (líneas) a lo genérico;
// la PRIMERA regla con categoría gana. Preocupaciones se acumulan (la primera = principal).
export const RULES = [
  { re: /acneplur/i, cat: "anti-acne", concerns: ["acne"] },
  { re: /rosatopic/i, cat: "serums", concerns: ["rosacea-sensible"] },
  {
    re: /despigment|clear complex|metimazol|azelaico|axilas/i,
    cat: "despigmentantes",
    concerns: ["manchas"],
  },
  { re: /metformina/i, cat: "despigmentantes", concerns: ["manchas"] },
  { re: /lips/i, cat: "contorno-ojos-labios", concerns: ["hidratacion"] },
  { re: /contorno|ojeras/i, cat: "contorno-ojos-labios", concerns: ["ojeras"] },
  { re: /v[ií]a oral/i, cat: "nutricosmetica", concerns: ["proteccion-solar"] },
  {
    re: /protector|spf|pantalla|solar/i,
    cat: "proteccion-solar",
    concerns: ["proteccion-solar", "manchas"],
  },
  { re: /scrub|glic[oó]lico/i, cat: "limpieza", concerns: ["manchas"] },
  { re: /anticelulitis|corporal|carthage/i, cat: "corporal", concerns: ["corporal"] },
  { re: /fine |drink|nutric|hyalucol/i, cat: "nutricosmetica", concerns: ["antiedad"] },
  { re: /mand[eé]lico|salic[ií]lico|salisilico/i, cat: "limpieza", concerns: ["acne"] },
  { re: /micelar|espuma|cleanser|limpieza|jab[oó]n/i, cat: "limpieza" },
  { re: /serum|vitamina c|niacinamida|bakuchiol|pynogenol|booster/i, cat: "serums" },
  { re: /hydra|hidratante|urea|mist/i, cat: "hidratacion", concerns: ["hidratacion"] },
  {
    re: /edad de oro|renovador|antiage|expression|filler|bakuchiol|booster/i,
    concerns: ["antiedad"],
  },
  { re: /booster/i, concerns: ["hidratacion"] },
  { re: /vitamina c|niacinamida|pynogenol/i, concerns: ["manchas", "antiedad"] },
  { re: /[ií]ntimo/i, concerns: ["intimo"] },
  { re: /vinchas|pads|m[aá]quina|perfilador/i, cat: "accesorios" },
];

// Productos que requieren validación regulatoria antes de venderse online (R-04).
export const REQUIRES_REVIEW = /metformina|metimazol|v[ií]a oral/i;
