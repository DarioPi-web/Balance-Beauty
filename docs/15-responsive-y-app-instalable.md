# 15 — Responsive, tests multi‑dispositivo y app instalable (PWA)

Objetivo: que el sitio funcione impecable desde un iPhone SE hasta un monitor 4K, y que al **agregarlo a la pantalla de inicio** (Android o iOS) se abra como una **app nativa**: ícono propio, pantalla completa sin barra del navegador, splash, colores de marca y navegación pensada para pulgar.

---

## 1. Principios responsive (aplican a todas las páginas)

| Regla             | Detalle                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile‑first      | Se diseña y se codea primero para 360–430 px; los breakpoints agregan, no corrigen                                                                                                   |
| Breakpoints       | Los de Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. Ancho máximo de contenido 1440 px                                                                             |
| Container queries | Componentes reutilizables (ProductCard, PriceBlock, filtros) se adaptan a **su contenedor** (`@container`), no a la pantalla: la misma tarjeta sirve en grilla, carrusel y mini‑cart |
| Tipografía fluida | `clamp()` en titulares; texto base ≥ 16 px (en inputs evita el zoom automático de iOS)                                                                                               |
| Toque             | Objetivos táctiles ≥ 44×44 px, separación ≥ 8 px; nada depende solo de `hover` (en touch, hover = tap)                                                                               |
| Zona del pulgar   | Acciones principales abajo en mobile: CTA sticky "Agregar al carrito", barra de checkout, bottom sheet de filtros                                                                    |
| Safe areas        | `viewport-fit=cover` + `env(safe-area-inset-*)` para notch, isla dinámica y barra de gestos (crítico en modo app)                                                                    |
| Alturas           | `100dvh`/`svh` en vez de `100vh` (barras del navegador móvil que aparecen/desaparecen)                                                                                               |
| Imágenes          | `next/image` con `sizes` reales por breakpoint; arte dirigido (banners distintos mobile/desktop)                                                                                     |
| Orientación       | Funciona en vertical y horizontal; tablets y plegables (Galaxy Fold ~280 px cerrado) sin scroll horizontal                                                                           |
| Tablas (admin)    | Se transforman en tarjetas en < 768 px o scroll horizontal contenido dentro de la tabla, nunca de la página                                                                          |
| WebGL             | Tiers por dispositivo (docs/14 §5); en mobile de gama baja, póster estático                                                                                                          |
| Accesibilidad     | Zoom hasta 200 % sin romper layout; reflow a 320 px (WCAG 1.4.10)                                                                                                                    |

## 2. Matriz de dispositivos de prueba

| Categoría          | Dispositivo (emulado)           | Viewport  | Motor                |
| ------------------ | ------------------------------- | --------- | -------------------- |
| Móvil chico        | iPhone SE (1.ª gen., peor caso) | 320×568   | WebKit               |
| Móvil iOS actual   | iPhone 15 Pro                   | 393×852   | WebKit               |
| Móvil iOS grande   | iPhone 15 Pro Max               | 430×932   | WebKit               |
| Android gama media | Pixel 7                         | 412×915   | Chromium             |
| Android chico      | Galaxy S8                       | 360×740   | Chromium             |
| Plegable cerrado   | Galaxy Fold (cerrado)           | 280×653   | Chromium             |
| Tablet vertical    | iPad Mini                       | 768×1024  | WebKit               |
| Tablet horizontal  | iPad Pro 11 landscape           | 1194×834  | WebKit               |
| Laptop             | Desktop                         | 1280×800  | Chromium             |
| Desktop grande     | Desktop HD                      | 1920×1080 | Firefox (solo en CI) |

Estado actual (F1): **39 tests pasan** en los 9 dispositivos locales; Firefox corre en CI (en la PC de desarrollo Windows no se lanza).

Además, **pruebas manuales en dispositivos reales** al cerrar cada fase con UI: un iPhone (Safari + app instalada), un Android gama media (Chrome + app instalada) y los navegadores internos de **Instagram y TikTok** (la mayor parte del tráfico llega desde ahí).

## 3. Tests automáticos

Playwright con un _project_ por dispositivo de la matriz (`apps/web/playwright.config.ts`), contra el build de producción local:

| Test                    | Qué verifica                                                                                                                   | Archivo                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Sin scroll horizontal   | `scrollWidth <= innerWidth` en cada página y dispositivo                                                                       | `tests/e2e/responsive.spec.ts` |
| Contenido clave visible | H1, CTA principal y header visibles sin superposición                                                                          | idem                           |
| Objetivos táctiles      | Botones y links interactivos ≥ 44 px en mobile                                                                                 | idem                           |
| Regresión visual        | Capturas por dispositivo comparadas contra la línea base (`toHaveScreenshot`) — se activa cuando el diseño de F2 esté aprobado | `tests/e2e/visual.spec.ts`     |
| App instalable          | Manifest válido (name, start_url, display standalone, íconos 192/512/maskable que responden 200), meta de iOS presentes        | `tests/e2e/pwa.spec.ts`        |
| Accesibilidad           | axe por página en mobile y desktop                                                                                             | `tests/e2e/a11y.spec.ts` (F3)  |
| Lighthouse              | Mobile (presupuestos docs/11) y desktop                                                                                        | `lighthouserc.json`            |

Comandos: `pnpm --filter web test:e2e` (todos) · `pnpm --filter web test:e2e --project="iPhone SE"` (uno). En CI corren en cada PR (sin deploy).

Herramientas complementarias opcionales: BrowserStack/LambdaTest para dispositivos reales en la nube (pago), o la granja de dispositivos de Firebase Test Lab para Android.

## 4. App instalable (PWA) — Android e iOS

### Qué se ve al instalar

| Aspecto                               | Android (Chrome)                                                    | iOS (Safari)                                                                            |
| ------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Ícono en inicio                       | Del manifest, versión _maskable_ (se adapta a círculo/squircle)     | `apple-touch-icon` 180×180                                                              |
| Nombre bajo el ícono                  | `short_name`: "Balance"                                             | `apple-mobile-web-app-title`: "Balance"                                                 |
| Pantalla completa                     | `display: standalone`                                               | `apple-mobile-web-app-capable` + `appleWebApp.capable`                                  |
| Splash al abrir                       | Generado por Chrome con `background_color` + ícono + nombre         | `apple-touch-startup-image` por tamaño de pantalla (se generan en F7 con el logo final) |
| Barra de estado                       | `theme_color`                                                       | `apple-mobile-web-app-status-bar-style`                                                 |
| Atajos (mantener presionado el ícono) | `shortcuts`: Tienda, Mi cuenta, Seguir mi envío                     | No soportado                                                                            |
| Instalación                           | Prompt nativo (`beforeinstallprompt`) + botón propio "Instalar app" | Manual: Compartir → "Agregar a inicio". Se muestra una guía visual propia               |

### Implementación

- `app/manifest.ts` (convención de Next 16): `id`, `name`, `short_name`, `description`, `lang: es-AR`, `start_url: /?utm_source=pwa`, `scope: /`, `display: standalone`, `display_override`, `orientation: portrait`, `background_color` y `theme_color` de marca, `categories: shopping/beauty/health`, íconos (192, 512, 512 maskable), `shortcuts`; `screenshots` (formato _wide_ y _narrow_) en F7 para el diálogo enriquecido de Android.
- Íconos generados con `ImageResponse` (`next/og`) en build: `app/icon.tsx` (favicon), `app/apple-icon.tsx` (180×180) y `app/icons/[name]/route.tsx` (PNGs del manifest). **Provisorios** con monograma; se reemplazan por el logo vectorial (Q‑12).
- `metadata.appleWebApp` en el layout + `viewport.viewportFit = "cover"` + `themeColor`.
- CSS de modo app: `@media (display-mode: standalone)` para mostrar botón "atrás" propio en el header (no hay barra del navegador), _bottom navigation_ (Inicio · Tienda · Buscar · Carrito · Cuenta) solo en mobile/standalone, padding con safe areas, `overscroll-behavior-y: none` en el body para evitar el rebote que delata la web.

### Service worker (F7)

- Chrome ya no exige service worker para instalar, pero se agrega uno **mínimo y seguro** para: página **offline** propia ("Sin conexión — tu carrito está guardado"), caché de assets estáticos con hash (inmutables) y, en fase 2, notificaciones push (iOS 16.4+ con la app instalada).
- **Nunca** cachea HTML con precios/stock ni respuestas de checkout/cuenta (riesgo de mostrar precios viejos). Estrategia: assets `cache-first`, navegación `network-first` con fallback offline.
- Versionado y `skipWaiting` controlado; desregistro de emergencia documentado.

### Casos especiales a probar en modo app

- **Pago con Mercado Pago/Getnet**: la redirección a la pasarela y el regreso (`back_urls`) deben volver a la app instalada; en iOS standalone los links externos abren una vista de Safari. Se prueba en dispositivo real en F4.
- **Login con magic link / Google**: el link del email abre el navegador, no la app instalada (limitación de plataforma). Mitigación: preferir código OTP de 6 dígitos en la app instalada.
- **Links compartidos por WhatsApp**: abren en el navegador; el sitio sigue funcionando igual.
- **Actualizaciones**: al publicar una fase nueva, la app instalada toma la versión nueva en la siguiente apertura (sin tiendas de apps).

### Prompt de instalación (UX)

- No se muestra en la primera visita. Aparece tras **2.ª visita o primera compra**, como banner discreto descartable ("Instalá Balance en tu celular: acceso directo y seguimiento de tus pedidos").
- Android: botón que dispara el prompt nativo guardado de `beforeinstallprompt`.
- iOS: hoja con 3 pasos ilustrados (Compartir → Agregar a inicio → Agregar).
- Medición: eventos `pwa_install_prompt_shown`, `pwa_installed` (`appinstalled`), sesiones con `display-mode: standalone`.

## 5. Tareas

Ver sección **R** del backlog en [05](05-backlog-tareas.md).
