# 11 — Performance, tests de velocidad y optimización de costos

Principio rector: **cada request que no llega a una función ni a la base es más rápido y más barato.** El catálogo (53 productos, cambia pocas veces por día) debe servirse casi entero desde la CDN; Supabase y las funciones de Vercel solo trabajan en carrito, checkout, cuenta y admin.

---

## 1. Presupuestos de performance (bloquean el merge si se superan)

| Métrica                                             | Presupuesto                                                                                                                                                                                                    | Dónde se mide                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| LCP p75 mobile (**campo**, usuarios reales)         | < 2,5 s                                                                                                                                                                                                        | Vercel Speed Insights                                              |
| LCP laboratorio (Lighthouse 4G lento + CPU 4×)      | Páginas con foto LCP (incluida la home desde el video de fondo, cuyo póster AVIF de 7 KB es el LCP) < 3,6 s (ajustado en F3, ver perf/fase-3-catalogo.md; en la traza observada el LCP de la home es ≈ 0,45 s) | Lighthouse CI                                                      |
| INP p75                                             | < 150 ms                                                                                                                                                                                                       | Speed Insights                                                     |
| CLS p75                                             | < 0,05                                                                                                                                                                                                         | Lighthouse CI + Speed Insights                                     |
| TTFB catálogo (HTML desde CDN)                      | < 200 ms                                                                                                                                                                                                       | WebPageTest / `curl -w` desde AR                                   |
| JS inicial (gzip) por ruta pública                  | ≤ 190 KB (piso React 19 + Next 16 ≈ 150 KB; el 120 KB original no era alcanzable)                                                                                                                              | Lighthouse `resource-summary` + `size-limit` (alarma total 230 KB) |
| Chunk WebGL (carga diferida)                        | ≤ 180 KB gzip, solo home/landings                                                                                                                                                                              | `size-limit`                                                       |
| Imagen LCP                                          | ≤ 120 KB AVIF/WebP, `priority`                                                                                                                                                                                 | Lighthouse                                                         |
| Fuentes                                             | ≤ 2 familias, ≤ 4 archivos, `woff2`, subset latin                                                                                                                                                              | revisión manual                                                    |
| Lighthouse Performance mobile                       | ≥ 90 (home ≥ 85 con WebGL)                                                                                                                                                                                     | Lighthouse CI                                                      |
| Queries Supabase por vista de producto (cache miss) | ≤ 2                                                                                                                                                                                                            | logs / `pg_stat_statements`                                        |
| p95 de RPC `place_order`                            | < 300 ms                                                                                                                                                                                                       | logs de Supabase                                                   |

## 2. Estrategia de render y caché (Next.js)

| Ruta                                                        | Estrategia                                                                                                                                        | Toca Supabase                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `/`, `/tienda`, `/categoria/*`, `/producto/*`, FAQ, legales | **Estática** (`generateStaticParams` + `"use cache"` / `cacheTag`) con revalidación **on‑demand** al editar en admin; sin `revalidate` por tiempo | Solo al revalidar               |
| Precio/stock en ficha                                       | Shell estático + **isla dinámica chica** (PPR / Suspense) con stock en vivo, o stock validado recién al agregar al carrito                        | 1 query liviana por vista (o 0) |
| `/buscar`                                                   | Route Handler con `Cache-Control: s-maxage=300, stale-while-revalidate` por término normalizado                                                   | Solo en miss                    |
| Carrito, checkout, cuenta                                   | Dinámico                                                                                                                                          | Sí, mínimo indispensable        |
| `/admin`                                                    | Dinámico, `noindex`                                                                                                                               | Sí                              |

Reglas:

- `proxy.ts` (ex `middleware.ts` en Next 16) con **matcher estricto** (solo `/admin`, `/mi-cuenta`, `/checkout`, `/auth`): cada ejecución de middleware cuesta en Vercel y suma latencia. El catálogo **no** pasa por middleware.
- No usar `cookies()`/`headers()` en layouts compartidos con el catálogo (lo vuelve dinámico).
- El header muestra el contador del carrito con un componente cliente que lee una cookie liviana (`cart_count`), no con una query.
- Prefetch: links del catálogo con prefetch por defecto; deshabilitar en listas largas del admin.
- `next/dynamic` para todo lo pesado y no crítico: WebGL, carrusel, editor Tiptap, gráficos del admin, chat de WhatsApp.

## 3. Imágenes y medios (el mayor costo potencial)

Decisión **ADR‑009**: las variantes de imagen se **pre‑generan** una sola vez en el VPS (sharp → AVIF + WebP en 400/800/1200/1600 px) y se guardan en Supabase Storage (bucket público detrás de CDN). Next.js las sirve con un **loader propio** (`images.loader = 'custom'`) que arma la URL de la variante correcta.

- Evita pagar _Image Optimization_ de Vercel por transformación y la _Image Transformation_ de Supabase.
- Cache‑Control `public, max-age=31536000, immutable` (nombres con hash).
- Video del home: MP4 H.264 + WebM/AV1, ≤ 2 MB, `preload="none"` + póster; o servirlo desde Storage, nunca desde `/public` en el bundle.
- Fallback mientras el VPS no esté: `next/image` estándar de Vercel (con ~60 imágenes el costo es marginal; se mide y se decide).

## 4. Supabase: queries, índices y costos

### Patrones obligatorios

- **Seleccionar columnas explícitas**, nunca `select('*')` en listados. Vistas `products_card_v` (campos de la tarjeta) y `product_detail_v`.
- **Una query por vista** con joins embebidos (`products(..., product_images(...), categories(...))`) — sin N+1.
- Lógica transaccional y multi‑query en **RPC** (`place_order`, `confirm_payment`, `search_products`, `admin_dashboard_stats`): 1 round‑trip.
- Paginación por **keyset** (`created_at, id`) en el admin; `count: 'estimated'` en vez de `exact` en tablas grandes.
- **RLS performante**: escribir `(select auth.uid())` y `(select is_admin())` dentro de las políticas (se evalúan una vez por query, no por fila); índice en toda columna usada en políticas (`orders.user_id`, `addresses.user_id`, `carts.user_id`).
- Funciones `security definer` con `set search_path = ''`.
- Índices: los de [03](03-modelo-de-datos.md) + `orders(status, created_at desc)`, `cart_items(cart_id)`, `product_categories(category_id)`, `shipments(order_id)`, parcial `products(status) where status='active'`.
- Dashboard admin: **vista materializada** `sales_daily_mv` refrescada por `pg_cron` cada 15 min, en vez de agregar pedidos en cada visita.
- Scripts y el VPS se conectan por **Supavisor (pooler, modo transaction, puerto 6543)**; el front usa la API REST/PostgREST.
- Realtime **desactivado** salvo que haga falta (no hay caso de uso en el MVP).

### Monitoreo de queries

- Habilitar `pg_stat_statements`; revisión quincenal de top 10 por `total_exec_time`.
- **Query Performance** y **Advisors** (seguridad + performance) del dashboard de Supabase en cada fase; `index_advisor` para sugerencias.
- `EXPLAIN (ANALYZE, BUFFERS)` obligatorio en el PR de toda query nueva del checkout/admin.
- Test de regresión: script que corre las 10 queries críticas contra el seed y falla si alguna supera su presupuesto.

### Costos de Supabase

| Rubro     | Riesgo                                                             | Control                                                                                                         |
| --------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Plan      | Pro (USD 25) necesario en prod (sin pausa, backups, PITR opcional) | Staging en Free (se pausa por inactividad, aceptable)                                                           |
| Compute   | Instancia Micro alcanza para este volumen                          | Subir solo si CPU > 70 % sostenido                                                                              |
| Egress    | Imágenes servidas directo desde Storage                            | Cache immutable + CDN; variantes pre‑generadas chicas                                                           |
| Storage   | Bajo (< 1 GB)                                                      | Borrar originales huérfanos con job mensual en el VPS                                                           |
| Auth MAU  | Muy por debajo del límite                                          | —                                                                                                               |
| Branching | Cobra por hora por branch                                          | No usar; staging fijo                                                                                           |
| PITR      | Add‑on pago                                                        | Activar solo en prod cuando haya volumen de pedidos; mientras tanto backups diarios + `pg_dump` nocturno al VPS |

## 5. Vercel: optimización y costos

| Palanca     | Acción                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deploys** | Automáticos **desactivados** (ver [12](12-deploy-y-entornos.md)): cero builds por push → menos minutos de build y menos deployments                    |
| Plan        | Pro (uso comercial lo exige). Configurar **Spend Management** con tope duro y alertas al 50/80/100 %                                                   |
| Funciones   | Fluid Compute activado; región de funciones **`gru1` (São Paulo)** para quedar cerca de la base (crear el proyecto de Supabase también en `sa-east-1`) |
| Duración    | `maxDuration` bajo (10 s) por defecto; nada de esperas largas en funciones: lo lento va al VPS por cola                                                |
| Middleware  | Matcher estricto (ver §2)                                                                                                                              |
| ISR / caché | Revalidación on‑demand por tag (no por tiempo) → mínimas escrituras ISR                                                                                |
| Imágenes    | Loader propio (§3) → ~0 transformaciones                                                                                                               |
| Cron        | Ningún cron en Vercel: `pg_cron` en Supabase y cron/colas en el VPS                                                                                    |
| Bots        | Vercel Firewall: bloquear `/wp-admin`, `/wp-login.php`, `/xmlrpc.php` y scrapers agresivos antes de que consuman funciones                             |
| Analytics   | Speed Insights solo en producción y con sample rate; Web Analytics básico                                                                              |
| Logs        | Drenaje de logs solo si se necesita (es pago); Sentry para errores                                                                                     |

**Costo objetivo Vercel**: plan Pro base sin excedentes con el tráfico actual. Revisión mensual del panel _Usage_.

## 6. Tests de velocidad (automatizados)

| Test                  | Herramienta                                                                                                     | Cuándo                        | Falla si                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Presupuesto de bundle | `size-limit` + `@next/bundle-analyzer`                                                                          | Cada PR (CI)                  | Se pasa de §1                                                     |
| Lighthouse lab        | **Lighthouse CI** sobre `next build && next start` local en CI (home, tienda, ficha, carrito) con `budget.json` | Cada PR                       | Score < umbral o métricas fuera de presupuesto                    |
| Trazas de interacción | Playwright + `performance` API: medir INP sintético de "agregar al carrito", abrir mini‑cart, filtrar           | Cada PR                       | > 150 ms en CPU throttling 4×                                     |
| WebGL                 | Playwright con `page.metrics()` + FPS medido en el hero (requestAnimationFrame) en perfil "gama media"          | PR que toque WebGL            | < 50 fps desktop / < 30 fps mobile emulado, o long tasks > 200 ms |
| Carga (load)          | **k6** contra staging: catálogo 200 VU, checkout 20 VU, búsqueda 50 VU                                          | Fin de F4 y antes de go‑live  | p95 > presupuesto o errores > 0,5 %                               |
| Queries               | Script de regresión de queries (§4) contra Supabase local                                                       | Cada PR que toque `supabase/` | Supera tiempo o hace seq scan en tabla grande                     |
| Campo (RUM)           | Vercel Speed Insights                                                                                           | Continuo en prod              | Alerta si p75 sale de verde 3 días                                |
| Externo               | WebPageTest desde São Paulo / Buenos Aires, perfil 4G                                                           | Fin de cada fase              | Regresión > 10 % vs. fase anterior                                |

Los reportes de cada fase se guardan en `docs/perf/fase-N.md` (tabla antes/después) y se revisan en el **gate de deploy** de la fase.

## 7. Checklist de optimización por fase

- [ ] F1: presupuestos y Lighthouse CI configurados antes de escribir UI.
- [ ] F3: catálogo 100 % estático; 0 queries en cache hit verificado.
- [ ] F3: imágenes con loader propio y AVIF.
- [ ] F4: `place_order` < 300 ms p95; k6 de checkout.
- [ ] F6: dashboard con vista materializada; listas con keyset.
- [ ] F8: WebPageTest desde AR, Advisors de Supabase en verde, Spend Management configurado.
