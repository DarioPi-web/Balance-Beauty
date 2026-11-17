# 05 — Backlog de tareas

Formato: `- [ ] ID · tarea — criterio de aceptación` · Prioridad: **P0** bloqueante MVP, **P1** MVP, **P2** post‑lanzamiento · Estimación en días‑persona (d).
Marcar `[x]` al completar. Cada tarea = 1 PR validado en local + CI (**sin deploy automático**). El deploy se decide al cerrar la fase con la tarea **GATE** ([12](12-deploy-y-entornos.md)).

## F0 — Descubrimiento

- [ ] F0‑01 · **P0** · Rotar contraseña de DB de Hostinger, salts de WP y contraseñas de los 2 admins (credenciales expuestas en el zip) — 0,5d
- [ ] F0‑02 · **P0** · Workshop con cliente y respuestas a preguntas bloqueantes de [06](06-pendientes-decisiones-riesgos.md) — 1d
- [ ] F0‑03 · **P0** · Decidir pasarela (ADR‑002) y pedir credenciales sandbox — 0,5d
- [ ] F0‑04 · **P0** · Definir taxonomía de categorías/líneas y asignar los 53 productos — 0,5d
- [ ] F0‑05 · **P1** · Exportar Search Console / GA (si existen) para baseline SEO y top URLs — 0,5d
- [ ] F0‑06 · **P0** · Crear cuentas/organización: GitHub, Vercel (Pro), Supabase (org + staging + prod), Resend, Sentry, Upstash, Cloudflare Turnstile — 0,5d
- [ ] F0‑07 · **P1** · Verificar dominio en Resend (SPF, DKIM, DMARC) — 0,25d
- [ ] F0‑08 · **P1** · Consulta legal sobre venta online de productos magistrales/medicamentos (R‑04) — externo

## F1 — Fundación

- [x] F1‑01 · **P0** · Node 22.23 + pnpm 10 + Git instalados; Supabase CLI como devDependency. **Falta: Docker Desktop** (lo instala el dueño: requiere admin + reinicio) y Vercel CLI (se usa en el workflow)
- [x] F1‑02 · **P0** · Next.js 16.4.6 (App Router, TS, Tailwind 4 vía `@tailwindcss/turbopack`, ESLint, Cache Components) — en `apps/web`
- [x] F1‑03 · **P0** · shadcn/ui (base-nova) + 25 componentes base
- [x] F1‑04 · **P0** · Prettier (+ plugin Tailwind), Husky, lint‑staged, commitlint, `.editorconfig`, `.gitattributes`
- [x] F1‑05 · **P0** · `lib/env.ts` con `@t3-oss/env-nextjs` + `.env.example`
- [ ] F1‑06 · **P0** · Migraciones escritas (`supabase/migrations/2026111700000{1,2,3}`: esquema, funciones, RLS) + test pgTAP. **Falta:** `supabase init` (config.toml + hook de JWT) y `supabase db reset` local — requiere Docker
- [x] F1‑07 · **P0** · `scripts/generate-seed.mjs` → `supabase/seed.sql` (53 productos: 38 activos, 15 borrador; categorías, preocupaciones, promos, ajustes)
- [x] F1‑08 · **P0** · Clientes Supabase (`server`, `public` cacheable, `client`, `admin` server‑only) + `proxy.ts` (Next 16) con matcher estricto
- [ ] F1‑09 · **P0** · Script `db:types` listo; **falta** generar los tipos reales (requiere Docker). Hoy hay un placeholder laxo
- [ ] F1‑10 · **P0** · `vercel.json` con `git.deploymentEnabled: false` + región `gru1` ✅. **Falta:** crear proyecto en Vercel, variables por entorno y Spend Management (cuenta del dueño)
- [x] F1‑11 · **P0** · `.github/workflows/ci.yml`: format, lint, typecheck, unit, Supabase (reset + lint + pgTAP), build, size‑limit, Lighthouse CI. Se activa al subir a GitHub
- [x] F1‑14 · **P0** · `deploy.yml` y `deploy-vps.yml` manuales. **Falta:** crear environments `staging`/`production` con reviewer en GitHub y cargar secrets
- [ ] F1‑15 · **P0** · Monorepo pnpm + Turborepo con `apps/web` ✅; `apps/integrations` y `packages/shared` se crean en la fase V
- [x] F1‑16 · **P0** · Taxonomía en la migración: `concerns`, `ingredients` (con concentración), `routine_step`, `time_of_use`
- [ ] F1‑17 · **P0** · Crear proyectos Supabase staging/prod en `sa-east-1` (cuenta del dueño)
- [ ] F1‑12 · **P1** · Vercel Analytics + Speed Insights (solo prod) ✅; **Sentry** pendiente hasta tener DSN
- [ ] F1‑13 · **P1** · Headers de seguridad (HSTS, nosniff, frame DENY, referrer, permissions) ✅; **CSP** pendiente para F4 (depende de dominios de pasarela/analytics)
- [x] F1‑18 · Lighthouse CI local: 100/100/100/100, LCP 944 ms, TBT 90 ms, CLS 0 → [perf/fase-1.md](perf/fase-1.md)

## F2 — UX/UI, design system y motion (ver [14](14-frontend-ux-ui-webgl.md))

- [ ] F2‑00 · **P0** · Benchmark de 10 referencias comentadas + 5 entrevistas/encuestas a clientas por Instagram — 2d
- [ ] F2‑06 · **P0** · Journey map + arquitectura de información (preocupaciones, producto, línea) — 1d
- [ ] F2‑01 · **P0** · Moodboard + 2 style tiles (paleta, tipografía, foto, motion) → elegir uno — 1,5d
- [ ] F2‑02 · **P0** · Wireframes mobile‑first: home, listado, ficha, quiz, carrito, checkout, cuenta, seguimiento — 2,5d
- [ ] F2‑07 · **P0** · **Spike WebGL** "Equilibrio" (3 días): prototipo del shader, medido en Android gama media e iPhone; go/no‑go — 3d
- [ ] F2‑03 · **P0** · UI final alta fidelidad + prototipo navegable — 4d
- [ ] F2‑04 · **P1** · UI de cuenta y admin (basado en shadcn re‑estilizado) — 1d
- [ ] F2‑08 · **P0** · Especificación de motion (tokens, coreografías, reduced‑motion) — 1d
- [ ] F2‑09 · **P1** · Guía de voz y tono + microcopy de checkout y errores — 1d
- [ ] F2‑05 · **P0** · Tokens en Tailwind (`@theme`), tipografía fluida, `next/font` — 0,5d
- [ ] F2‑10 · **P1** · Storybook (o `/design-system`) + tests visuales Playwright — 1d
- [ ] F2‑11 · **P1** · Test de usabilidad con 5 usuarias sobre el prototipo y ajustes — 1,5d
- [ ] F2‑12 · **P1** · Briefing y sesión de fotos de producto + texturas (cliente/proveedor) — externo

## F3 — Catálogo

- [ ] F3‑01 · **P0** · Layout: Header (logo, mega menú, buscador, cuenta, mini‑cart), Footer (redes, links legales, arrepentimiento, libro de quejas, Data Fiscal) — 1,5d
- [ ] F3‑02 · **P0** · Home: slider de banners desde tabla `banners` (desktop/mobile), barra de beneficios, destacados, video — 1,5d
- [ ] F3‑03 · **P0** · `ProductCard` + `PriceTag` (lista, transferencia −10 %, sin impuestos nacionales) + `InstallmentsBadge` — 1d
- [ ] F3‑04 · **P0** · `/tienda` y `/categoria/[slug]`: filtros por searchParams, orden, paginación, `generateMetadata` — 1,5d
- [ ] F3‑05 · **P0** · `/producto/[slug]`: galería con zoom, stock, add‑to‑cart, relacionados, JSON‑LD Product, `generateStaticParams` — 2d
- [ ] F3‑06 · **P0** · Búsqueda: RPC `search_products`, command palette con debounce, página `/buscar` — 1d
- [ ] F3‑07 · **P1** · Caché por tags + endpoint/acción de revalidación — 0,5d
- [ ] F3‑08 · **P1** · Estados vacíos, 404, skeletons, `error.tsx` — 0,5d
- [ ] F3‑09 · **P0** · Navegación por preocupación y por línea (`/preocupacion/[slug]`, `/linea/[slug]`) — 1d
- [ ] F3‑10 · **P0** · Ficha: bloques Activos clave, Modo de uso AM/PM, Completá tu rutina, CTA sticky mobile, WhatsApp con mensaje prellenado — 1,5d
- [ ] F3‑11 · **P1** · Quiz "Armá tu rutina" (5 pasos, reglas en tabla) + agregar rutina al carrito — 2d
- [ ] F3‑12 · **P0** · Loader de imágenes propio (variantes AVIF/WebP pre‑generadas) — 0,5d
- [ ] F3‑13 · **P1** · View Transitions listado ↔ ficha con fallback — 0,5d
- [ ] F3‑14 · **P1** · Facade para embeds de Instagram/YouTube (sin scripts de terceros hasta interacción) — 0,5d

## F3b — WebGL y motion

- [ ] W‑01 · **P1** · `components/webgl/`: canvas R3F con `next/dynamic` (ssr:false), montaje post‑LCP, póster AVIF como LCP — 1d
- [ ] W‑02 · **P1** · Shader "Equilibrio" (metaballs/SDF, refracción, iridiscencia) + interacción cursor/scroll/giroscopio — 3d
- [ ] W‑03 · **P1** · Tiers con `detect-gpu`, `prefers-reduced-motion`, `saveData`, WebView sin WebGL2 → fallback CSS — 1d
- [ ] W‑04 · **P1** · Pausa fuera de vista / pestaña oculta, `frameloop="demand"`, DPR ≤ 1,5 — 0,5d
- [ ] W‑05 · **P1** · Bloque "Activo protagonista": color/viscosidad por activo sincronizado con GSAP ScrollTrigger — 1,5d
- [ ] W‑06 · **P2** · Distorsión líquida en hover de tarjetas (desktop, OGL o R3F) — 1d
- [ ] W‑07 · **P1** · Microinteracciones con Motion (mini‑cart, chips, agregar al carrito, toasts) — 1d
- [ ] W‑08 · **P0** · Test Playwright de FPS y long tasks + `size-limit` del chunk WebGL (≤ 180 KB gzip) — 0,5d

## F4 — Carrito, checkout y pagos

- [ ] F4‑01 · **P0** · Server Actions de carrito (add/update/remove) con validación de stock; cookie `cart_id` firmada — 1d
- [ ] F4‑02 · **P0** · Mini‑cart (Sheet) + página `/carrito` con optimistic UI — 1d
- [ ] F4‑03 · **P0** · `lib/pricing.ts`: subtotal, promos, cupón, descuento por medio de pago, envío — con tests unitarios — 1d
- [ ] F4‑04 · **P0** · Checkout 1 página (contacto, envío, pago) con RHF + Zod, autocompletar si está logueado — 2d
- [ ] F4‑05 · **P0** · Tarifas de envío por zona/CP desde `shipping_rates` + retiro en local — 0,5d
- [ ] F4‑06 · **P0** · RPC `place_order()` transaccional con reserva de stock + tests SQL (pgTAP) — 1,5d
- [ ] F4‑07 · **P0** · `PaymentProvider` + implementación de pasarela elegida (crear checkout/preferencia) — 2d
- [ ] F4‑08 · **P0** · Webhook firmado + idempotente → `confirm_payment()` — 1d
- [ ] F4‑09 · **P0** · Página `/checkout/resultado` (aprobado, pendiente, rechazado) con polling del estado — 0,5d
- [ ] F4‑10 · **P0** · Flujo transferencia/QR: datos bancarios desde settings, subida de comprobante a bucket privado, vencimiento 48 h — 1d
- [ ] F4‑11 · **P0** · Emails React Email: pedido recibido, pago aprobado, transferencia pendiente, enviado, cancelado — 1,5d
- [ ] F4‑12 · **P0** · Cron `release_expired_reservations` (pg_cron) — 0,25d
- [ ] F4‑13 · **P1** · Rate limiting en acciones de checkout y login (Upstash) — 0,5d
- [ ] F4‑14 · **P1** · Eventos de analytics: view_item, add_to_cart, begin_checkout, purchase (GA4 + Meta CAPI) — 1d
- [ ] F4‑15 · **P0** · Barra de progreso en carrito hacia 12 cuotas ($150.000, configurable) y envío gratis — 0,5d
- [ ] F4‑16 · **P0** · Cotización de envío leyendo `shipping_rate_matrix` en Supabase; respaldo en vivo al VPS (HMAC, timeout 2,5 s) solo si el CP no está; último recurso `shipping_rates` — 1d
- [ ] F4‑17 · **P0** · k6 de checkout (20 VU) y regresión de queries del checkout — 0,5d

## F5 — Cuenta de cliente

- [ ] F5‑01 · **P0** · Login/registro/recuperar (email+password y magic link), callback, templates de email de Auth en español — 1d
- [ ] F5‑02 · **P1** · Login con Google — 0,25d
- [ ] F5‑03 · **P0** · Mis pedidos (lista y detalle con tracking) — 1d
- [ ] F5‑04 · **P1** · Direcciones (CRUD) y datos personales — 0,5d
- [ ] F5‑05 · **P1** · Merge de carrito invitado al iniciar sesión — 0,5d
- [ ] F5‑06 · **P1** · Eliminar cuenta / exportar mis datos (Ley 25.326) — 0,5d

## F6 — Admin

- [ ] F6‑01 · **P0** · Layout admin, guard por rol (middleware + layout + RLS), custom access token hook — 0,5d
- [ ] F6‑02 · **P0** · Dashboard: ventas hoy/mes, pedidos por estado, stock bajo — 1d
- [ ] F6‑03 · **P0** · Productos: DataTable (TanStack Table) con búsqueda, filtros y edición inline de precio/stock — 1,5d
- [ ] F6‑04 · **P0** · Producto: formulario completo, editor de texto enriquecido (Tiptap), SEO, categorías, relacionados — 1,5d
- [ ] F6‑05 · **P0** · Uploader de imágenes (drag&drop, reordenar, alt, compresión en cliente) a Storage — 1d
- [ ] F6‑06 · **P1** · Import/Export CSV de productos y actualización masiva de precios (± %) — 1d
- [ ] F6‑07 · **P0** · Pedidos: lista, detalle, cambio de estado con timeline, tracking, notas, reenviar email, confirmar transferencia — 2d
- [ ] F6‑08 · **P1** · Clientes: lista, detalle, pedidos, aprobar mayorista — 0,5d
- [ ] F6‑09 · **P1** · Cupones y promociones (cuotas, % por medio de pago, vigencias) — 1d
- [ ] F6‑10 · **P1** · Banners, FAQ, páginas legales, tarifas de envío, ajustes de tienda — 1,5d
- [ ] F6‑11 · **P1** · Audit log y vista de cambios — 0,5d
- [ ] F6‑12 · **P1** · Solicitudes de arrepentimiento y mensajes de contacto — 0,5d
- [ ] F6‑13 · **P0** · Dashboard con vista materializada `sales_daily_mv` (pg_cron 15 min); listas con paginación keyset — 0,5d
- [ ] F6‑14 · **P1** · Generar orden y etiqueta Andreani/Correo desde el pedido (vía cola del VPS) — 1d
- [ ] F6‑15 · **P1** · Carga de activos (%), preocupaciones y paso de rutina por producto — 0,5d

## F7 — Contenido, SEO, migración

- [ ] F7‑01 · **P0** · Script `scripts/migrate-images.ts`: subir imagen original de cada producto (sin sufijos `-300x300` etc.) a Storage y crear `product_images` — 1d
- [ ] F7‑02 · **P0** · Completar 26 descripciones, 15 imágenes y 2 precios faltantes (cliente) — externo
- [ ] F7‑03 · **P0** · Redirecciones 301 (ver [09](09-migracion-seo.md)) — 0,5d
- [ ] F7‑04 · **P0** · `sitemap.ts`, `robots.ts`, metadata por página, OG images dinámicas — 1d
- [ ] F7‑05 · **P0** · Páginas: Nosotros, Dónde estamos (mapa), Contacto (form + Turnstile + WhatsApp), FAQ, Mayorista (form de solicitud) — 1,5d
- [ ] F7‑06 · **P0** · Textos legales reales: términos, privacidad, devoluciones (revisión legal) — externo
- [ ] F7‑07 · **P1** · Banner de consentimiento de cookies + carga condicional de GA4/Pixel — 0,5d

## F8 — QA y lanzamiento

- [ ] F8‑01 · **P0** · Playwright E2E: navegar → carrito → checkout tarjeta (sandbox) → admin marca enviado → cliente ve tracking — 2d
- [ ] F8‑02 · **P0** · Tests de RLS (usuario A no ve pedidos de B; anon no escribe catálogo) — 0,5d
- [ ] F8‑03 · **P0** · Auditoría a11y (axe) y performance (Lighthouse CI) — 1d
- [ ] F8‑04 · **P0** · Revisión de seguridad (`/security-review`, secretos, headers, dependencias) — 0,5d
- [ ] F8‑05 · **P0** · Checklist legal (ver [10](10-seguridad-legal-qa.md)) — 0,5d
- [ ] F8‑06 · **P0** · Supabase prod en plan Pro con PITR; Vercel prod; credenciales de pasarela productivas — 0,5d
- [ ] F8‑07 · **P0** · Compra real + reembolso en producción — 0,25d
- [ ] F8‑08 · **P0** · Cutover DNS, verificación SSL, Search Console (nuevo sitemap), monitoreo 72 h — 0,5d
- [ ] F8‑09 · **P1** · Capacitación grabada al equipo + manual de admin — 0,5d

## V — VPS Contabo (ver [13](13-vps-contabo-integraciones.md))

- [x] V‑00 · Datos del VPS: Cloud VPS 20 SSD, 6 vCPU / 12 GB / 200 GB, región EU
- [ ] V‑01 · **P0** · Confirmar distribución Linux y accesos; reinstalar Ubuntu 24.04 LTS si hace falta (snapshot previo) — 0,25d
- [ ] V‑15 · **P0** · Prueba de conectividad desde la IP EU del VPS a sandbox de MiCorreo, Andreani y ARCA (¿bloquean IPs extranjeras?) + medición de latencia a Supabase pooler — 0,25d
- [ ] V‑16 · **P0** · Stacks `prod` y `staging` en el mismo VPS con límites de CPU/RAM por servicio — 0,25d
- [ ] V‑17 · **P0** · Job `rates.matrix.refresh` (nocturno) → tabla `shipping_rate_matrix` en Supabase + `branches.sync` → `pickup_branches`; upserts en lote — 1d
- [ ] V‑02 · **P0** · Hardening: usuario no root, SSH por clave, ufw, fail2ban, unattended‑upgrades, Tailscale opcional — 0,5d
- [ ] V‑03 · **P0** · Docker + Compose + Caddy (TLS en `int.balancebeauty.com.ar`) + Uptime Kuma + Dozzle — 0,5d
- [ ] V‑04 · **P0** · Backups: `pg_dump` nocturno de Supabase vía pooler + `restic` a object storage offsite + prueba de restauración — 0,5d
- [ ] V‑05 · **P0** · `apps/integrations`: Hono + Zod + middleware HMAC + rate limit + healthcheck — 1d
- [ ] V‑06 · **P0** · BullMQ + Redis: colas `shipment.create`, `label.generate`, `tracking.sync`, `image.process`, `feed.build`, `email.deferred` — 1d
- [ ] V‑07 · **P0** · `ShippingProvider` + MiCorreo (sandbox → prod) — 1,5d
- [ ] V‑08 · **P1** · Andreani (sandbox → prod), sujeto a credenciales/contrato — 1,5d
- [ ] V‑09 · **P0** · Caché de cotizaciones en Redis (TTL 6 h) + métricas de hit rate — 0,25d
- [ ] V‑10 · **P1** · Tracking sync cada 2 h → `shipments` + email "tu pedido está en camino/entregado" — 0,5d
- [ ] V‑11 · **P0** · Pipeline de imágenes (sharp → AVIF/WebP 400/800/1200/1600) disparado al subir desde el admin — 1d
- [ ] V‑12 · **P1** · Feeds Google Merchant / Meta Catalog nocturnos — 0,5d
- [ ] V‑13 · **P0** · Imagen Docker en GHCR + `deploy-vps.yml` manual con aprobación — 0,5d

## P — Performance y costos (ver [11](11-performance-y-costos.md))

- [ ] P‑01 · **P0** · `budget.json` de Lighthouse CI y `size-limit` con los presupuestos — 0,25d
- [ ] P‑02 · **P0** · Matcher estricto de middleware; verificar que el catálogo no ejecuta funciones (headers `x-vercel-cache: HIT`) — 0,25d
- [ ] P‑03 · **P0** · Vistas `products_card_v` / `product_detail_v`; prohibido `select('*')` (regla ESLint custom o revisión) — 0,5d
- [ ] P‑04 · **P0** · Políticas RLS con `(select auth.uid())` + índices en columnas de políticas — 0,25d
- [ ] P‑05 · **P0** · `pg_stat_statements` + script de regresión de las 10 queries críticas en CI — 0,5d
- [ ] P‑06 · **P1** · k6: catálogo 200 VU, búsqueda 50 VU, checkout 20 VU contra staging — 0,5d
- [ ] P‑07 · **P1** · WebPageTest desde São Paulo/Buenos Aires al cierre de cada fase → `docs/perf/fase-N.md` — 0,25d/fase
- [ ] P‑08 · **P0** · Spend Management de Vercel + alertas de uso de Supabase; revisión mensual de _Usage_ — 0,25d
- [ ] P‑09 · **P1** · Firewall de Vercel: bloquear rutas de WordPress y bots agresivos — 0,25d

## GATE — Cierre de fase (repetir en cada fase)

- [ ] GATE‑N · Checklist de [12](12-deploy-y-entornos.md): P0 cerradas, CI verde, reporte de performance, migraciones revisadas, changelog, impacto en costos → **preguntar al dueño** "¿Deploy a staging?" → validación → "¿Promovemos a producción?"

## F9 — Post‑lanzamiento (P2)

- [ ] F9‑01 · Mayorista B2B: rol `wholesale`, lista de precios, mínimo de compra
- [ ] F9‑02 · Más transportistas en el VPS (moto CABA, Envíopack, etc.)
- [ ] F9‑03 · Reseñas con moderación
- [ ] F9‑04 · Avisame cuando haya stock / wishlist
- [ ] F9‑05 · Kits y rutinas (bundles)
- [ ] F9‑06 · Facturación electrónica ARCA (AFIP)
- [ ] F9‑07 · Blog educativo (MDX)
- [ ] F9‑08 · Recuperación de carrito abandonado (email)
- [ ] F9‑09 · Dar de baja hosting de WordPress tras 30 días estables

**Total MVP estimado**: ~85–95 días‑persona (desarrollo + VPS + WebGL + performance) + ~20 días de diseño UX/UI + contenido del cliente.
