/** Rutas públicas que se validan en todos los dispositivos (una de cada plantilla). */
export const PUBLIC_ROUTES = [
  "/",
  "/tienda",
  "/rutina",
  "/carrito", // vacío
  "/checkout", // carrito vacío
  "/terminos",
  "/promociones",
  "/contacto",
  "/mayorista",
  "/preguntas-frecuentes",
  "/arrepentimiento",
  "/devoluciones",

  "/categoria/serums",
  "/preocupacion/manchas",
  "/producto/rosatopis-serum", // con fotos
  "/producto/serum-bakuchiol", // sin foto (placeholder de marca)
] as const;
