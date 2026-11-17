# 14 — Plan de frontend: UX/UI, diseño único y WebGL

Objetivo: que Balance Beauty se vea y se sienta como **una marca de dermocosmética de autor**, no como una plantilla de WooCommerce, **sin sacrificar conversión ni velocidad**. El efecto "wow" vive en momentos puntuales; la compra es rápida, clara y sin distracciones.

---

## 1. Investigación del nicho (resumen)

**Mercado argentino**

- El e‑commerce argentino creció fuerte en 2025 (CACE/Kantar) y _belleza y bienestar_ está entre los rubros que más crecieron.
- **8 de cada 10 compradores miran la financiación antes de comprar** → las cuotas sin interés tienen que verse en la tarjeta de producto, no solo en el checkout.
- Las transferencias desde billeteras crecieron mucho en participación → el **precio con 10 % off por transferencia/QR** merece el mismo protagonismo que el precio de lista.
- El público llega por **Instagram y TikTok** (@balancesaludbelleza) → tráfico mayormente mobile, con sesiones cortas y desde in‑app browsers (WebView): diseño mobile‑first y WebGL con fallback robusto.

**Patrones que convierten en skincare/dermocosmética**

- Navegación por **preocupación de la piel** (acné, manchas, rosácea, deshidratación, envejecimiento) además de por tipo de producto: el usuario sabe su problema, no el nombre del activo.
- **Educación sobre activos** (qué es, % de concentración, para quién) como señal de confianza; marcas de referencia del enfoque "ingredient‑led" basan su UX en esto.
- **Rutinas** (limpieza → tratamiento → hidratación → protección) y "combiná con": suben ticket promedio.
- Señales de confianza: respaldo profesional, aviso de que se puede consultar (WhatsApp), información clara de envío/devolución, reseñas.
- Conversión de referencia del rubro 2–4 %, abandono de carrito 70–80 %: **la brecha mobile es la mayor oportunidad**.

**Referencias a estudiar (no copiar)** — analizar en el moodboard qué resuelven bien:

| Referencia                                                                                                                                                          | Qué mirar                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Marcas "ingredient‑led" internacionales                                                                                                                             | Ficha centrada en activo y %, nomenclatura clara   |
| Marcas sensoriales de autor (cuidado de piel premium)                                                                                                               | Ritmo editorial, tipografía, fotografía de textura |
| Marcas dermatológicas de farmacia                                                                                                                                   | Navegación por preocupación, señales clínicas      |
| Marcas de dermocosmética argentinas (incluidas las líneas que vende Balance, p. ej. Liderma, Exel)                                                                  | Lenguaje local, precios y promos en cuotas         |
| Casos de estudio de diseño de skincare con motion (Codrops: _TrueKind_, 2025) y sitios premiados en Awwwards del rubro (p. ej. Koba Skincare 2025, OMR Beauty 2026) | Uso medido del movimiento, transiciones            |

Entregable F2‑R: `docs/design/benchmark.md` con 10 capturas comentadas (qué tomar / qué evitar) + 5 entrevistas cortas o encuestas a clientas por Instagram (¿cómo eligen productos?, ¿qué dudas tienen antes de comprar?).

---

## 2. Concepto creativo: "Equilibrio"

El nombre **Balance** es el concepto. La piel sana es un sistema en equilibrio (hidratación, barrera, pH, protección). La marca lo cuenta con:

- **Metáfora visual**: dos gotas de fórmula (una "serum" translúcida, una "crema" opaca) que se atraen, se deforman y encuentran equilibrio. Es el hilo conductor del WebGL.
- **Lenguaje**: clínico pero cálido. Precisión (porcentajes, activos, pasos) + calidez rioplatense en el tono ("tu piel", "te ayudamos a elegir").
- **Composición**: mucho aire, grillas asimétricas editoriales en contenido; grillas estrictas y previsibles en catálogo y checkout.

### Dirección visual — APROBADA: "B · Botánica clínica" (ADR‑017)

Elegida entre dos style tiles (`/estilos`). Inspirada en el verde de las plantas de las fotos de producto y el logo crema de tres hojas.

| Token         | Valor     | Uso                                                              |
| ------------- | --------- | ---------------------------------------------------------------- |
| `--clinical`  | `#F7F8F5` | Fondo principal                                                  |
| `--leaf`      | `#1E3A2F` | Marca: header con logo, botones primarios, barra de estado (PWA) |
| `--mist`      | `#E3EBE5` | Superficies, chips de preocupación                               |
| `--rose`      | `#D9A7A0` | Acentos y promos (solo como fondo, con texto grafito)            |
| `--rose-soft` | `#F3E3E0` | Resaltado del precio con transferencia                           |
| `--graphite`  | `#14231C` | Texto                                                            |
| `--alert`     | `#B4462F` | Errores, sin stock                                               |

- Contraste: grafito/clínico 15:1, clínico/verde 11:1, texto secundario `#4D5B54` 6,9:1 (AA).
- **Tipografía**: _Cormorant Garamond_ 500/600 para titulares (armoniza con la serif del logo) + _Geist_ para UI, textos y precios (cifras tabulares), con `next/font`.
- **WebGL**: las gotas del hero toman verde niebla y rosa empolvado; el bloque "activo protagonista" cambia de tono por activo.
- **Fotografía**: producto sobre fondos de color plano de la paleta + macro de texturas (gota, crema extendida). Sesión de fotos unificada = mayor impacto visual que cualquier efecto (ver Q‑08: 15 productos sin imagen).
- **Iconografía**: línea fina custom para preocupaciones (acné, manchas…) y momentos (AM/PM).

---

## 3. Arquitectura de información

```
Inicio
├─ Tienda
│  ├─ Por preocupación: Acné · Manchas · Rosácea/sensible · Hidratación · Antiedad · Protección solar · Ojeras · Corporal · Íntimo
│  ├─ Por producto: Limpieza · Serums · Hidratantes · Protectores · Despigmentantes · Contorno · Nutricosmética · Accesorios
│  └─ Por línea: ACNEPLUR · ROSATOPIC · Hydra · Fine · DermaNutrix · …
├─ Armá tu rutina (diagnóstico de piel)
├─ Promos (cuotas, transferencia, kits)
├─ Aprendé (activos A‑Z, guías) — fase 2
├─ Nosotros · Dónde estamos · Mayoristas
└─ Ayuda: FAQ · Envíos · Seguir mi envío · Cambios y devoluciones · Contacto · Botón de arrepentimiento
```

Requiere en datos: tabla `concerns` (preocupaciones) N‑N con productos, `ingredients` (activo, %, descripción corta) N‑N con productos, `routine_step` en producto (limpieza/tratamiento/hidratación/protección) y `time_of_use` (AM/PM). → migración adicional en F1.

---

## 4. Páginas y decisiones UX

### Home

1. **Hero WebGL "Equilibrio"** (ver §5) con titular corto + 2 CTAs: "Comprar por preocupación" / "Armá tu rutina". Debajo, barra fija de beneficios: _12 cuotas sin interés · 10 % off transferencia · Envíos a todo el país_.
2. Selector de preocupaciones (chips grandes con ícono) → filtra la tienda.
3. Más vendidos (grilla estándar, sin efectos que demoren).
4. Bloque "Activo protagonista" (p. ej. Vitamina C): scroll‑storytelling con la gota WebGL cambiando de color + producto + CTA.
5. Rutina sugerida (4 pasos) con "Agregar rutina completa" (bundle).
6. Prueba social: reseñas / videos cortos de Instagram (embed liviano con facade, no el script de IG).
7. Banners de promo administrables (reemplaza el slider actual; **sin autoplay** agresivo: los carruseles automáticos bajan la interacción).

### Listado (`/tienda`, preocupación, línea)

- Filtros como **chips horizontales** en mobile (bottom sheet para "más filtros"), lateral en desktop; estado en la URL (compartible, SEO).
- Tarjeta: imagen (hover desktop = segunda foto de textura), nombre, preocupación principal, **precio + precio transferencia + "12 cuotas de $X"**, botón "Agregar" directo (sin entrar a la ficha).
- Orden por defecto "Recomendados"; mostrar cantidad de resultados; estado vacío con sugerencias.

### Ficha de producto (la página más importante)

Above the fold mobile: galería (swipe), nombre, _para qué sirve_ en una línea, chips de tipo de piel, precio/transferencia/cuotas, stock ("Quedan 3"), **CTA sticky inferior** "Agregar al carrito".
Debajo, en este orden:

1. Beneficios (3 bullets con ícono).
2. **Activos clave** con % y explicación de una línea (tarjetas; hover/tap abre detalle).
3. Modo de uso: AM/PM, paso de rutina, frecuencia.
4. "Completá tu rutina" (cross‑sell por paso).
5. Envío y devoluciones (resumen + calculadora por CP usando el VPS).
6. Preguntas frecuentes del producto / "¿Dudas? Consultanos por WhatsApp" con mensaje prellenado con el nombre del producto.
7. Reseñas (fase 2).

- Productos con `requires_prescription` → CTA "Consultar" en lugar de "Comprar" (riesgo R‑04).

### Diagnóstico "Armá tu rutina"

Quiz de 5 pasos (tipo de piel, preocupación principal, sensibilidad, momento del día, presupuesto) → rutina AM/PM recomendada con reglas en tabla (sin IA en el MVP) + "Agregar rutina al carrito" + guardar resultado por email (captura de lead con consentimiento). Animación de transición entre pasos con la gota WebGL o versión CSS.

### Carrito (mini‑cart lateral + página)

- Barra de progreso hacia el **umbral de 12 cuotas ($150.000)** y hacia el envío gratis: "Te faltan $12.300 para 12 cuotas sin interés".
- Muestra en vivo el total con transferencia.
- Upsell discreto: 1 producto complementario.

### Checkout

- **Una página, sin header/footer de navegación** (solo logo y "compra segura").
- Orden: email → envío (CP primero → opciones y precios del VPS) → datos → pago. Autocompletado de localidad/provincia por CP.
- Guest checkout por defecto; crear cuenta opcional al final ("Guardá tus datos con una contraseña").
- Resumen sticky en desktop, colapsable en mobile, con el total por medio de pago.
- Errores inline, accesibles, en lenguaje humano. Teclados correctos (`inputmode="numeric"` para CP, DNI, teléfono).
- Sin WebGL ni animaciones decorativas.

### Cuenta, seguimiento, mayoristas

- "Seguir mi envío" público con número de pedido + email (reemplaza los links a Correo/Andreani).
- Mayoristas: landing + formulario de solicitud (fase 2: precios mayoristas al loguear).

### Microcopy

Voz rioplatense, cercana y precisa. Glosario en `docs/design/voz-y-tono.md` (vos, no tú; "Agregar al carrito", "Finalizar compra"; nunca jerga médica sin explicar).

---

## 5. WebGL y motion: plan técnico

### Dónde hay WebGL (y dónde no)

| Ubicación                                    | Efecto                                                                                                                                                                                                                        | Prioridad |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Hero home                                    | **"Dos gotas en equilibrio"**: metaballs / SDF raymarched en shader de fragmento con refracción y iridiscencia suave; reaccionan al cursor (desktop) y al giroscopio/scroll (mobile); se funden y separan buscando equilibrio | P1        |
| Bloque "Activo protagonista"                 | La misma escena cambia color/viscosidad según el activo (vitamina C ámbar, niacinamida lechosa, ácido hialurónico cristalino) sincronizada con scroll                                                                         | P1        |
| Transición de imágenes en tarjetas (desktop) | Distorsión líquida al pasar de foto de producto a foto de textura (shader de desplazamiento sobre plano)                                                                                                                      | P2        |
| Quiz de rutina                               | Gota que "se completa" con cada respuesta                                                                                                                                                                                     | P2        |
| Checkout, cuenta, admin, listados en mobile  | **Nada de WebGL**                                                                                                                                                                                                             | —         |

### Stack

- **three.js + React Three Fiber + drei** para el hero (escena aislada en `components/webgl/`), shaders GLSL propios en archivos `.glsl` importados como texto (regla `raw` en `turbopack.rules` de `next.config.ts`).
- Alternativa más liviana si el presupuesto no da: **OGL** (~30 KB) para los efectos 2D de imágenes.
- **GSAP + ScrollTrigger** (gratuito, incluidos los plugins) para coreografías de scroll; **Motion** (ex Framer Motion) para microinteracciones de UI (mini‑cart, chips, toasts).
- **View Transitions API** para transiciones entre listado y ficha (imagen compartida), con fallback sin animación.
- **Lenis** (smooth scroll) solo en home/landings y desactivado en mobile si mide peor INP.
- `detect-gpu` para clasificar el dispositivo en tiers.

### Reglas de performance del WebGL (no negociables)

1. **Carga diferida**: el canvas se monta con `next/dynamic({ ssr: false })` _después_ del LCP (`requestIdleCallback` / tras `load`). El LCP del hero es **un póster estático** (AVIF ≤ 60 KB) del primer frame del shader, idéntico visualmente → el usuario no nota el cambio.
2. **Tiers**: tier 0 (GPU baja, `prefers-reduced-motion`, ahorro de datos `navigator.connection.saveData`, WebView sin WebGL2) → solo póster + animación CSS sutil. Tier 1 → shader simplificado, DPR 1. Tier 2+ → completo, DPR máx. 1,5.
3. **Pausa** cuando el canvas sale de la vista (IntersectionObserver) o la pestaña está oculta; `frameloop="demand"` cuando no hay interacción.
4. **Presupuesto**: chunk WebGL ≤ 180 KB gzip; ≤ 1 draw call principal; sin texturas > 512 px; shaders compilados en _warm‑up_ fuera del hilo crítico; 60 fps desktop / ≥ 30 fps mobile medio.
5. **Accesibilidad**: el canvas es `aria-hidden`; todo el contenido y CTAs están en HTML real; `prefers-reduced-motion` desactiva coreografías de scroll.
6. **Medición**: test Playwright de FPS y long tasks (ver [11](11-performance-y-costos.md) §6) en cada PR que toque `components/webgl/`.

### Sistema de motion (tokens)

| Token                                                                                                                                  | Valor                       | Uso                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------- |
| `--ease-out-soft`                                                                                                                      | `cubic-bezier(.22,1,.36,1)` | Entradas                    |
| `--ease-in-out-fluid`                                                                                                                  | `cubic-bezier(.65,0,.35,1)` | Transiciones de página/gota |
| `--dur-micro`                                                                                                                          | 120 ms                      | Hover, toggles              |
| `--dur-ui`                                                                                                                             | 240 ms                      | Mini‑cart, sheets           |
| `--dur-scene`                                                                                                                          | 600–900 ms                  | Transiciones de sección     |
| Reglas: nunca animar layout (solo `transform`/`opacity`); nada bloquea la interacción; el contenido aparece aunque la animación falle. |

---

## 6. Design system y componentes

- Tokens en Tailwind v4 `@theme` (colores, tipografía fluida con `clamp()`, radios, sombras suaves, motion).
- shadcn/ui como base **re‑estilizado** con los tokens (no el look por defecto).
- Componentes propios del dominio: `PriceBlock` (lista / transferencia / cuotas / sin impuestos nacionales), `ConcernChip`, `IngredientCard`, `RoutineStepper`, `InstallmentsProgress`, `ProductCard`, `StickyAddToCart`, `ShippingEstimator`, `TrustBar`.
- Documentación viva con **Storybook** (o página `/design-system` protegida) + tests visuales (Playwright screenshots) para evitar regresiones.

---

## 7. Accesibilidad (WCAG 2.2 AA)

- Navegación completa por teclado, foco visible con estilo de marca, skip link.
- Objetivos táctiles ≥ 44 px; textos ≥ 16 px en inputs (evita zoom en iOS).
- Precios leídos correctamente por lectores ("Precio: 25.000 pesos. Con transferencia: 22.500 pesos").
- Formularios con labels reales, errores asociados (`aria-describedby`).
- axe en CI + prueba manual con VoiceOver/TalkBack antes del go‑live.

---

## 8. Proceso y entregables de diseño (fase F2 ampliada, 3–4 semanas)

| Semana | Entregable                                                                                                                 | Aprobación             |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1      | Benchmark + entrevistas + mapa de journey (descubrir → elegir → pagar → recibir → recomprar) + arquitectura de información | ✅ dueño               |
| 1–2    | Moodboard + 2 _style tiles_ alternativos (paleta, tipografía, foto, motion)                                                | ✅ elegir uno          |
| 2      | Wireframes mobile‑first de home, listado, ficha, quiz, carrito, checkout                                                   | ✅                     |
| 2–3    | **Prototipo técnico WebGL** del hero (spike de 3 días) medido en celular gama media real                                   | ✅ go/no‑go del efecto |
| 3      | UI final alta fidelidad + prototipo navegable (Figma)                                                                      | ✅                     |
| 3–4    | Especificación de motion, design tokens, guía de voz y tono, handoff                                                       | ✅                     |
| 4      | Test de usabilidad con 5 usuarias (prototipo): tareas "encontrá un producto para manchas" y "comprá con transferencia"     | ajustes                |

## 9. Métricas de éxito del frontend

- Conversión mobile ≥ 1,5 % a 90 días (objetivo rubro 2–4 %).
- Abandono en checkout < 60 %.
- % de sesiones que usan "comprar por preocupación" o el quiz.
- Ticket promedio (efecto rutinas/kits y barra de cuotas).
- Core Web Vitals en verde con el WebGL activo.

## Fuentes de la investigación

- [Webtonic — Beauty & Skincare Landing Pages & CRO 2026](https://www.webtonic.io/blog/beauty-skincare-landing-page-statistics)
- [Redefine Web — Web design for beauty brands](https://redefineweb.com/blog/web-design-beauty-brands-proven-playbook-dtc-growth/)
- [Codrops — Designing TrueKind (2025)](https://tympanus.net/codrops/2025/06/25/designing-truekind-a-skincare-brands-journey-through-moodboards-motion-and-meaning/)
- [Utsubo — Best Three.js websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026)
- [Mercado — Estudio anual CACE 2025](https://mercado.com.ar/tendencias/comercio-electronico-el-estudio-anual-de-cace-midio-34-033-238-millones-en-2025)
- [Perfil — 8 de cada 10 argentinos buscan cuotas](https://www.perfil.com/noticias/economia/cuotas-y-billeteras-las-claves-del-ecommerce-8-de-cada-10-argentinos-miran-la-financiacion-antes-de-comprar-a40.phtml)
- [Forbes Argentina — ecommerce local crece](https://www.forbesargentina.com/negocios/el-ecommerce-local-crece-79-contexto-mayor-competencia-internacional-temu-shein-n77047)

Las estadísticas de agencias son referencias orientativas, no benchmarks verificados; las métricas propias se miden desde el lanzamiento.
