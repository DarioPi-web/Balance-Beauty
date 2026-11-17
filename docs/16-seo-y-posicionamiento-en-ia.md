# 16 — Posicionamiento en Google y en IAs (SEO + GEO) y palabras clave

Objetivo: que Balance Beauty aparezca **en Google** (resultados orgánicos, Google Shopping gratuito, AI Overviews / AI Mode) y **en las respuestas de las IAs** (ChatGPT, Gemini, Perplexity, Claude, Copilot) cuando alguien en Argentina busca o pregunta por cuidado de la piel, activos dermocosméticos y productos.

---

## 1. ¿Cambiar el frontend a Vue/Nuxt (u otro) para posicionar mejor?

**Recomendación: no. Seguir con Next.js** (ADR‑016). Lo que hace posicionar no es el framework sino que la página llegue **como HTML completo, rápida y con datos estructurados**. Eso ya lo tenemos.

| Opción                  | SEO                                                                                                           | Para este proyecto                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js 16 (actual)** | HTML prerenderizado (SSG/ISR + Cache Components), metadata API, sitemap/robots nativos, JSON‑LD, `next/image` | ✅ Ya medido: Lighthouse SEO 100, LCP 0,94 s. Ecosistema React para WebGL (R3F), shadcn, Supabase. Sin costo de migración                                                            |
| Nuxt 4 (Vue)            | Equivalente: SSR/SSG, módulo SEO "con baterías", JS cliente algo menor                                        | Mismo resultado en Google si ambos están bien configurados. Cambiar implicaría reescribir F1 y perder R3F/shadcn. **No aporta ranking**                                              |
| Astro                   | El más liviano en JS: ideal para sitios de contenido                                                          | Excelente para un blog, pero un e‑commerce con carrito, cuenta y admin necesita "islas" de React igual. Separar el blog en otro sitio/subdominio **divide la autoridad** del dominio |
| SvelteKit / Qwik        | Muy buen rendimiento                                                                                          | Ecosistema chico para e‑commerce; sin ventaja de ranking                                                                                                                             |
| SPA (Vue/React sin SSR) | ❌ Google y sobre todo los bots de IA leen mal contenido que solo aparece con JavaScript                      | Descartado                                                                                                                                                                           |

Lo que **sí** marca diferencia (y está en el plan):

1. **Todo el contenido indexable en el HTML inicial** (Server Components + prerender). Los bots de IA (GPTBot, OAI‑SearchBot, PerplexityBot, ClaudeBot) en general **no ejecutan JavaScript**.
2. **Velocidad** (Core Web Vitals en verde, docs/11).
3. **Datos estructurados** completos y coherentes con el texto visible.
4. **Contenido experto** que responda preguntas reales (la investigación de keywords lo muestra: hay mucha búsqueda "para qué sirve…").
5. **Autoridad externa**: reseñas, menciones, perfiles de marca.

> Decisión de arquitectura relacionada: el contenido educativo ("Aprendé", activos A‑Z) vive **en el mismo dominio y app** como páginas estáticas con MDX, no en un subdominio ni en otro framework.

---

## 2. SEO técnico (Google)

| Ítem                    | Implementación                                                                                                                                                                                                                                                                                                                    | Fase        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Render                  | Catálogo, activos, preocupaciones y guías: estáticos con revalidación on‑demand                                                                                                                                                                                                                                                   | F3          |
| Metadata                | `generateMetadata` por ruta: title ≤ 60 car., description ≤ 155, canonical, OG/Twitter, `lang="es-AR"`                                                                                                                                                                                                                            | F3          |
| URLs                    | Cortas, en español, sin parámetros: `/producto/[slug]`, `/categoria/[slug]`, `/preocupacion/[slug]`, `/activos/[slug]`, `/aprende/[slug]`, `/linea/[slug]`                                                                                                                                                                        | F3          |
| Facetas/filtros         | Combinaciones de filtros → `noindex,follow` + canonical a la categoría; solo se indexan landings curadas (ej. "protector solar con color")                                                                                                                                                                                        | F3          |
| Datos estructurados     | `Organization` + `WebSite` (SearchAction), `Product` + `Offer` (precio ARS, stock, envío, devoluciones: `shippingDetails`, `hasMerchantReturnPolicy`), `Brand`, `BreadcrumbList`, `ItemList` en categorías, `FAQPage` en FAQ y fichas, `Article` + autor experto en guías, `AggregateRating`/`Review` **solo con reseñas reales** | F3/F7       |
| Sitemaps                | `sitemap.ts` dividido: productos (con imágenes), categorías/preocupaciones/activos, guías. `lastmod` real                                                                                                                                                                                                                         | F7          |
| robots.txt              | Bloquear `/admin`, `/mi-cuenta`, `/checkout`, `/carrito`, `/api`, búsquedas internas; permitir bots de búsqueda e IA (§3)                                                                                                                                                                                                         | F7          |
| Imágenes                | Nombre de archivo y `alt` descriptivos ("serum-vitamina-c-lidherma-30ml.avif"), AVIF/WebP, dimensiones                                                                                                                                                                                                                            | F3/F7       |
| Enlazado interno        | Producto ↔ activo ↔ preocupación ↔ guía; breadcrumbs; "completá tu rutina"                                                                                                                                                                                                                                                        | F3          |
| Migración               | Redirecciones 301 de WooCommerce (ya en `next.config.ts`), conservar `/producto/<slug>`                                                                                                                                                                                                                                           | ✅ F1       |
| Indexación              | Google Search Console + **Bing Webmaster Tools** (ChatGPT Search y Copilot usan el índice de Bing) + **IndexNow** al publicar/editar productos                                                                                                                                                                                    | F7          |
| Google Merchant Center  | Feed de productos generado cada noche en el VPS → **listados gratuitos en Google Shopping**, panel de productos y AI Mode                                                                                                                                                                                                         | F7          |
| Google Business Profile | Ficha con dirección real (si hay local/consultorio), horarios, fotos, reseñas → búsquedas locales y "cerca de mí"                                                                                                                                                                                                                 | F0/F7       |
| Core Web Vitals         | Presupuestos de docs/11 en CI                                                                                                                                                                                                                                                                                                     | ✅ continuo |

## 3. Posicionamiento en IAs (GEO / AEO)

### Rastreadores: qué permitir (`robots.ts`)

| Bot                                              | De quién   | Uso                                            | Decisión propuesta                                |
| ------------------------------------------------ | ---------- | ---------------------------------------------- | ------------------------------------------------- |
| `Googlebot`                                      | Google     | Búsqueda, AI Overviews, AI Mode                | Permitir                                          |
| `Google-Extended`                                | Google     | Entrenar Gemini (no afecta ranking)            | Permitir (más presencia de marca); revisable      |
| `Bingbot`                                        | Microsoft  | Búsqueda Bing, Copilot, base de ChatGPT Search | Permitir                                          |
| `OAI-SearchBot`                                  | OpenAI     | Índice de búsqueda de ChatGPT                  | **Permitir** (es el que hace aparecer en ChatGPT) |
| `ChatGPT-User`                                   | OpenAI     | Cuando un usuario pide leer una URL            | Permitir                                          |
| `GPTBot`                                         | OpenAI     | Entrenamiento                                  | Permitir (decisión de negocio, Q‑24)              |
| `PerplexityBot` / `Perplexity-User`              | Perplexity | Índice y lecturas a pedido                     | Permitir                                          |
| `ClaudeBot` / `Claude-SearchBot` / `Claude-User` | Anthropic  | Entrenamiento / búsqueda / a pedido            | Permitir                                          |
| `Applebot` / `Applebot-Extended`                 | Apple      | Siri/Spotlight / Apple Intelligence            | Permitir                                          |
| `meta-externalagent`                             | Meta       | Meta AI                                        | Permitir                                          |
| Scrapers agresivos sin identificación            | —          | —                                              | Bloquear en Vercel Firewall (docs/11)             |

**`llms.txt`**: los datos de 2026 indican que los principales bots casi no lo leen (estudio de Ahrefs sobre 137 mil sitios: 97 % sin pedidos) y Google declaró que no tiene efecto. Se publica uno simple porque cuesta minutos, pero **no es prioridad** ni sustituye lo de arriba.

### Qué hace que una IA cite y recomiende una tienda

1. **Respuesta primero**: cada página de activo/preocupación/guía abre con 2–3 oraciones que responden la pregunta directa ("La niacinamida es una forma de vitamina B3 que…"), después el desarrollo.
2. **Datos concretos y verificables**: concentraciones (%), tamaños, modo de uso, compatibilidades ("no combinar con…"), tablas comparativas ("ácido mandélico vs glicólico"), con fuentes cuando se cite evidencia.
3. **Autoría experta** (E‑E‑A‑T): guías firmadas/revisadas por un profesional (cosmiatra/dermatóloga, Q‑22) con bio y credenciales; fecha de revisión visible.
4. **Datos estructurados coherentes con el texto** (FAQPage, Product, Article): las IAs y AI Overviews los usan para confirmar lo que leen.
5. **Feed de productos** (Merchant Center) con atributos completos: es la vía por la que Google AI Mode y los asistentes de compra muestran productos con precio y stock. Seguir el programa de comercios de ChatGPT/Perplexity cuando esté disponible para Argentina (hoy centrado en EE. UU.).
6. **Reputación fuera del sitio**: las IAs recomiendan marcas que aparecen mencionadas en otros lugares. Reseñas en Google Business Profile, notas en medios/blogs de belleza argentinos, presencia en Mercado Libre (opcional), videos en YouTube/TikTok con descripción y link, respuestas genuinas en foros (r/argentina, comunidades de skincare).
7. **Consistencia de entidad**: mismo nombre, logo, descripción y datos de contacto en sitio, redes, Google Business Profile, `Organization` (`sameAs` a Instagram/TikTok/Facebook).

### Medición del posicionamiento en IAs

- **Panel fijo de 25 preguntas** (abajo, §6) que se hacen todos los meses en ChatGPT, Gemini, Perplexity, Google (AI Overviews/AI Mode) y Claude. Se registra: ¿aparece Balance? ¿se la cita con link? ¿qué competidores aparecen?
- GA4: tráfico referido desde `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai`.
- Search Console: impresiones/clics por consulta y por página; filtro de AI Mode cuando esté disponible.

---

## 4. Investigación de palabras clave (Argentina)

### Metodología y límites

- **Fuente principal**: autocompletado de Google configurado para Argentina y español sobre 58 términos semilla del rubro → **482 búsquedas reales** (sin ruido de otros países) en [seo/keywords-autocomplete-ar.csv](seo/keywords-autocomplete-ar.csv), clasificadas por intención (comercial 244, marca/comparación 165, informacional 57, transaccional 16).
- **Fuerza relativa**: para 48 términos se midió con cuántas letras tipeadas Google ya lo sugiere ("prefijo mínimo"). Menos letras = más búsquedas. Es un **estimador relativo**, no volumen mensual.
- Google Trends bloqueó las consultas automáticas (HTTP 429). **Los volúmenes absolutos se validan en F0/F7 con Google Keyword Planner** (gratis con cuenta de Google Ads) y después con datos reales de Search Console.

### Nivel A — Alta demanda (cabeza). Páginas: categorías, activos y preocupaciones

| Keyword                                     | Prefijo mínimo | Intención               | Página objetivo                                     |
| ------------------------------------------- | -------------- | ----------------------- | --------------------------------------------------- |
| skincare                                    | 2              | Informacional/comercial | Home + `/aprende/rutina-skincare`                   |
| ácido salicílico                            | 2              | Informacional/comercial | `/activos/acido-salicilico`                         |
| ácido hialurónico                           | 3              | Informacional/comercial | `/activos/acido-hialuronico`                        |
| ácido glicólico                             | 3              | Informacional/comercial | `/activos/acido-glicolico`                          |
| ácido azelaico                              | 3              | Informacional/comercial | `/activos/acido-azelaico`                           |
| niacinamida                                 | 3              | Informacional/comercial | `/activos/niacinamida`                              |
| retinol                                     | 3              | Informacional/comercial | `/activos/retinol` (+ bakuchiol como alternativa)   |
| exfoliante facial                           | 3              | Comercial               | `/categoria/limpieza` (landing exfoliantes)         |
| ojeras / ojeras vasculares                  | 3              | Informacional/comercial | `/preocupacion/ojeras`                              |
| protector solar / protector solar facial    | 4              | Comercial               | `/categoria/proteccion-solar`                       |
| serum vitamina c / serum niacinamida        | 4              | Comercial               | Landing `/serums/vitamina-c`, `/serums/niacinamida` |
| limpieza facial / espuma de limpieza facial | 4              | Comercial               | `/categoria/limpieza`                               |
| agua micelar                                | 4              | Comercial               | Ficha Agua Micelar + categoría                      |
| serum                                       | 4              | Comercial               | `/categoria/serums`                                 |

### Nivel B — Demanda media. Páginas: preocupaciones, landings y fichas

| Keyword                                             | Prefijo | Página objetivo                                                      |
| --------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| contorno de ojos                                    | 5       | `/categoria/contorno-ojos-labios`                                    |
| despigmentante / despigmentante de axilas           | 6       | `/preocupacion/manchas` + ficha "Despigmentante Axilas e Ingle"      |
| manchas en la cara / crema para manchas en la cara  | 6–10    | `/preocupacion/manchas`                                              |
| jabón íntimo femenino                               | 6       | Ficha "Jabón de limpieza íntimo prebiótico" + `/preocupacion/intimo` |
| dermocosmética                                      | 6       | Home / Nosotros                                                      |
| anticelulitis                                       | 6       | Ficha Anticelulitis + `/categoria/corporal`                          |
| piel sensible / piel grasa / piel mixta / piel seca | 6       | Guías por tipo de piel + filtro                                      |
| skin booster                                        | 6       | Ficha Skin Booster                                                   |
| crema hidratante facial                             | 8       | `/categoria/hidratacion`                                             |
| crema antiarrugas                                   | 8       | `/preocupacion/antiedad`                                             |
| rutina skincare                                     | 8       | Quiz "Armá tu rutina" + guía                                         |
| ácido mandélico                                     | 8       | `/activos/acido-mandelico`                                           |
| puntos negros                                       | 8       | `/preocupacion/acne` (sección puntos negros)                         |
| protector solar con color                           | 10      | Landing "protector solar con color"                                  |
| colágeno bebible                                    | 10      | `/categoria/nutricosmetica`                                          |
| melasma                                             | 4       | `/preocupacion/manchas` (sección melasma)                            |
| rosácea                                             | 5       | `/preocupacion/rosacea-sensible`                                     |
| bakuchiol                                           | 4       | `/activos/bakuchiol`                                                 |

### Nivel C — Long tail (menos volumen, menos competencia, alta intención): donde una tienda nueva gana rápido

Agrupadas por la página que las ataca (cada una como subtítulo H2/H3, pregunta de FAQ o landing propia):

- **Activos — "para qué sirve / qué es"** (`/activos/*`): niacinamida para qué sirve en la piel · ácido glicólico al 10 para qué sirve · ácido glicólico para axilas · ácido azelaico para qué sirve · ácido azelaico crema · ácido mandélico al 10 · ácido salicílico para puntos negros · ácido salicílico y niacinamida · serum vitamina C para qué sirve · serum facial para qué sirve · bakuchiol qué es y para qué sirve · urea crema para qué sirve.
- **Comparativas** (`/aprende/*`, muy citadas por IAs): bakuchiol vs retinol · ácido mandélico o glicólico · ácido glicólico y salicílico · ácido hialurónico y niacinamida · vitamina C facial cuál es la mejor.
- **Rutinas** (`/aprende/rutina-*` + quiz): rutina de skincare para principiantes · rutina de skincare para piel grasa día y noche · rutina skincare piel mixta · rutina skincare piel seca · rutina skincare noche · rutina skincare rosácea · rutina skincare hombre.
- **Manchas** (`/preocupacion/manchas`): crema para manchas de acné en la cara · crema para manchas en la cara por el sol · manchas en la cara por el sol · melasma tratamiento · despigmentante axilas y zona íntima · despigmentante íntimo · despigmentante de ojeras · despigmentante corporal.
- **Ojos** (`/preocupacion/ojeras`): ojeras pigmentadas · ojeras vasculares · bolsas en los ojos tratamiento · contorno de ojos con cafeína.
- **Tipo de piel** (guías + filtros): protector solar facial piel grasa · crema hidratante facial piel grasa · crema hidratante facial piel sensible · piel grasa deshidratada · piel sensible con rosácea · exfoliante facial piel grasa.
- **Protección solar** (landings): protector solar con color toque seco · protector solar mineral · protector solar en barra · protector solar vía oral.
- **Corporal e íntimo**: urea crema corporal · urea crema reparadora · urea crema 10 · scrub corporal · anticelulitis crema · jabón íntimo prebiótico.
- **Nutricosmética**: colágeno bebible para la piel · colágeno bebible funciona.
- **Magistrales** (⚠️ solo informativo hasta resolver R‑04): metformina crema para melasma · metformina crema 30.

### Nivel M — Marca + producto (gran oportunidad inmediata)

Las búsquedas combinan **activo + marca** y varias marcas que vende Balance aparecen en el autocompletado: _serum vitamina C lidherma, serum niacinamida lidherma, serum ácido hialurónico lidherma, despigmentante lidherma, protector solar con color lidherma, ácido glicólico lidherma, ácido mandélico lidherma, contorno de ojos lidherma, scrub corporal lidherma, bakuchiol carthage_. Acción:

- Título de cada ficha con la fórmula **"[Producto] [Marca] [tamaño] — [beneficio]"** y página `/marca/[slug]` por marca (Lidherma, Carthage, Exel, Idraet, etc.). **Q‑25: confirmar qué marca es cada uno de los 53 productos.**
- Competencia que domina el autocompletado (referencia para benchmark y comparativas honestas): Dermaglós, La Roche‑Posay, L'Oréal, Natura, Garnier, Nivea, Idraet, Eucerin, The Ordinary, Caviahue, ISDIN, CeraVe, Biobellus, Cepage, Dadatina.

### Competitividad más allá de lo local

- El contenido educativo (activos, comparativas, rutinas) posiciona en **todo el mundo hispanohablante** y es el tipo de página que más citan las IAs; aunque las ventas sean nacionales, suma autoridad al dominio. Se redacta en español claro con modismos argentinos moderados (vos) y unidades/marcas locales.
- Mantener un **glosario de activos A‑Z** (30–40 activos) es la base de "autoridad temática" que Google y las IAs premian.
- Si en el futuro se vende a otros países: subcarpetas `/mx`, `/cl` con `hreflang` (no subdominios).

---

## 5. Plan de contenido (prioridad por impacto/esfuerzo)

| Ola      | Contenido                                                                                                                      | Cant.      | Keywords que ataca         | Fase                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------- | ------------------------------ |
| 1        | Fichas de producto completas (beneficio, activos con %, modo de uso, FAQ)                                                      | 53         | Marca+producto, Nivel C    | F7 (requiere Q‑08, Q‑21, Q‑25) |
| 1        | Páginas de preocupación (manchas, acné, rosácea/sensible, hidratación, antiedad, solar, ojeras, corporal, íntimo)              | 9          | Niveles A/B                | F3/F7                          |
| 1        | Páginas de activo (salicílico, hialurónico, glicólico, azelaico, niacinamida, vitamina C, mandélico, retinol, bakuchiol, urea) | 10         | Nivel A + "para qué sirve" | F7                             |
| 2        | Guías de rutina por tipo de piel + principiantes + noche                                                                       | 6          | Nivel C rutinas            | Post‑lanzamiento mes 1         |
| 2        | Comparativas (bakuchiol vs retinol, mandélico vs glicólico, etc.)                                                              | 5          | Nivel C comparativas       | Mes 1–2                        |
| 3        | Glosario A‑Z de activos                                                                                                        | 30–40      | Long tail informacional    | Mes 2–4                        |
| 3        | Landings de marca                                                                                                              | según Q‑25 | Nivel M                    | Mes 1                          |
| Continuo | 2 artículos/mes basados en Search Console (consultas con impresiones y sin clics)                                              | —          | Oportunidades reales       | Mensual                        |

Cada pieza: respuesta en las primeras líneas, H2 con preguntas reales del autocompletado, tabla o lista de datos, FAQ con `FAQPage`, enlaces a productos y a la preocupación, autor/revisor profesional y fecha.

## 6. Panel mensual de preguntas para medir presencia en IAs

1. ¿Dónde comprar dermocosmética online en Argentina?
2. ¿Cuál es el mejor serum de vitamina C en Argentina?
3. ¿Qué serum con niacinamida me recomendás para piel grasa?
4. ¿Qué protector solar facial con color sirve para piel grasa?
5. ¿Qué crema sirve para manchas en la cara por el sol?
6. ¿Cómo tratar el melasma en casa?
7. ¿Qué despigmentante sirve para axilas?
8. ¿Qué contorno de ojos sirve para ojeras vasculares?
9. ¿Bakuchiol o retinol para piel sensible?
10. ¿Ácido mandélico o glicólico para manchas?
11. ¿Qué rutina de skincare para piel grasa día y noche?
12. Rutina de skincare para principiantes con productos argentinos.
13. ¿Qué producto sirve para la rosácea?
14. ¿Para qué sirve el ácido azelaico?
15. ¿Para qué sirve el ácido salicílico en la cara?
16. ¿Qué jabón íntimo femenino es bueno?
17. ¿El colágeno bebible funciona para la piel?
18. ¿Qué crema anticelulitis funciona?
19. ¿Dónde comprar productos Lidherma online?
20. ¿Qué es Balance Beauty? / ¿Es confiable Balance Beauty?
21. Tienda de skincare con cuotas sin interés en Argentina.
22. ¿Qué crema hidratante facial para piel sensible?
23. ¿Qué exfoliante facial para piel grasa?
24. ¿Qué es la dermocosmética?
25. ¿Qué skin booster recomendás?

Registro en `docs/seo/panel-ia.md` (mes, motor, ¿aparece?, posición/mención, link, competidores citados).

## 7. KPIs

| KPI                                | Herramienta     | Meta 6 meses post‑lanzamiento                        |
| ---------------------------------- | --------------- | ---------------------------------------------------- |
| Páginas indexadas válidas          | Search Console  | 100 % de las indexables                              |
| Clics orgánicos                    | Search Console  | ≥ baseline WooCommerce ×3                            |
| Keywords en top 10 (Nivel C)       | Search Console  | ≥ 60                                                 |
| Keywords en top 10 (Niveles A/B)   | Search Console  | ≥ 10                                                 |
| Presencia en panel de IAs          | Panel mensual   | Mencionada en ≥ 8/25 preguntas en al menos 2 motores |
| Tráfico referido de IAs            | GA4             | Tendencia creciente mes a mes                        |
| Listados gratuitos de Shopping     | Merchant Center | 100 % de productos aprobados                         |
| Reseñas en Google Business Profile | GBP             | ≥ 30 con promedio ≥ 4,5                              |

## Fuentes

- Generative engine optimization para e‑commerce: [Hello Retail](https://helloretail.com/en/blog/geo-for-ecommerce-guide/), [Alhena](https://alhena.ai/blog/ai-search-engine-optimization-brand-visibility/), [Botmind](https://www.botmind.io/en/blog/generative-engine-optimization-ecommerce-2026), [IWD Agency](https://www.iwdagency.com/blogs/news/ai-search-optimization-for-ecommerce-2026/), [1Digital](https://www.1digitalagency.com/blog/what-makes-content-citable-by-ai-a-data-driven-analysis-for-ecommerce/) — blogs de proveedores; las cifras se toman como orientativas.
- llms.txt: [Ahrefs — estudio sobre 137 mil sitios](https://ahrefs.com/blog/llmstxt-study/), [Search Engine Journal](https://www.searchenginejournal.com/97-of-llms-txt-files-got-no-requests-ahrefs-data-shows/579478/), [Codersera](https://codersera.com/blog/llms-txt-complete-guide-2026/).
- Frameworks y SEO: [Naturaily — Nuxt vs Next](https://naturaily.com/blog/nuxt-vs-next), [BCMS](https://thebcms.com/blog/best-frontend-frameworks-for-seo/), [FocusReactive](https://focusreactive.com/nextjs-alternatives/), [arc.dev](https://arc.dev/employer-blog/astro-vs-nextjs-vs-nuxt/).
- Mercado: [Nubimetrics — skin care en e‑commerce](https://academia.nubimetrics.com/skin-care-crecimiento-y-tendencias-en-ecommerce), [Mercado — conocimiento de skincare en Argentina](https://mercado.com.ar/vida-y-estilo/las-argentinas-elevan-el-conocimiento-sobre-skincare-y-avon-presenta-anew-niacinamida-fps-30).
- Datos propios: autocompletado de Google (es, Argentina), consultado el 18/11/2026.
