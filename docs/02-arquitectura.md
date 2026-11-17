# 02 — Arquitectura

## Stack

| Capa           | Tecnología                                                                                           | Motivo                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework      | **Next.js 16 (App Router)**, React 19, TypeScript estricto                                           | RSC, Server Actions, ISR/caché por tags, primera clase en Vercel                                            |
| Estilos / UI   | Tailwind CSS v4, shadcn/ui (Radix), lucide-react                                                     | Design system propio, accesible, sin lock‑in                                                                |
| Formularios    | React Hook Form + Zod                                                                                | Validación compartida cliente/servidor                                                                      |
| Backend        | Supabase: Postgres 15+, Auth, Storage, Edge Functions, pg_cron                                       | BaaS con SQL real, RLS, backups                                                                             |
| Acceso a datos | `@supabase/ssr` + `@supabase/supabase-js`, tipos generados (`supabase gen types`)                    | Sesión por cookies en RSC/Actions/Route Handlers                                                            |
| Pagos          | Getnet API y/o Mercado Pago Checkout Pro / Bricks (ADR‑002)                                          | Pasarelas locales con cuotas                                                                                |
| Emails         | Resend + React Email                                                                                 | Plantillas en React, buena entregabilidad                                                                   |
| Búsqueda       | Postgres FTS (`tsvector` español) + `pg_trgm` + `unaccent`                                           | Sin servicio extra para < 1.000 productos                                                                   |
| Imágenes       | Supabase Storage + `next/image`                                                                      | Optimización automática AVIF/WebP                                                                           |
| Hosting        | **Vercel** (Pro), región `gru1`                                                                      | CDN, funciones cerca de Supabase `sa-east-1`; **deploys solo manuales** ([12](12-deploy-y-entornos.md))     |
| Integraciones  | **VPS Contabo**: Hono + BullMQ + Redis + Caddy en Docker                                             | Envíos (Andreani, Correo Argentino), colas, imágenes, backups, ARCA ([13](13-vps-contabo-integraciones.md)) |
| Motion / 3D    | three.js + React Three Fiber + drei, GSAP, Motion, View Transitions                                  | Hero WebGL y microinteracciones con presupuesto ([14](14-frontend-ux-ui-webgl.md))                          |
| Monorepo       | pnpm workspaces + Turborepo                                                                          | `apps/web`, `apps/integrations`, `packages/shared`                                                          |
| Antispam       | Cloudflare Turnstile                                                                                 | Formularios públicos sin captchas molestos                                                                  |
| Rate limiting  | Upstash Redis (`@upstash/ratelimit`) vía Vercel Marketplace                                          | Protección de endpoints sensibles                                                                           |
| Observabilidad | Sentry, Vercel Analytics + Speed Insights                                                            | Errores y Core Web Vitals                                                                                   |
| Testing        | Vitest, Testing Library, Playwright                                                                  | Unit, componentes, E2E                                                                                      |
| Calidad        | ESLint (next config) + Prettier, Husky + lint-staged, commitlint                                     | Consistencia                                                                                                |
| Paquetes       | pnpm, Node 22 LTS                                                                                    | Rápido y determinista                                                                                       |
| CI/CD          | GitHub Actions (CI en cada push) + workflows **manuales con aprobación** para Vercel, Supabase y VPS | Control de costos y de cuándo sale cada fase                                                                |

## Diagrama

```
                ┌──────────────────────────── Vercel ────────────────────────────┐
 Navegador ───► │  Next.js App Router                                             │
  (RSC/HTML)    │   ├─ (shop)   páginas públicas: SSG/ISR + caché por tags        │
                │   ├─ (account) área cliente: dinámica, sesión por cookie        │
                │   ├─ admin/   panel: dinámico, rol admin                        │
                │   ├─ Server Actions: carrito, checkout, CRUD admin              │
                │   └─ Route Handlers: /api/webhooks/{getnet,mercadopago}, /api/revalidate, /api/cron/* │
                └───────────┬──────────────────────────────┬──────────────────────┘
                            │ supabase-js (anon + RLS)      │ service role (solo servidor)
                ┌───────────▼──────────────── Supabase ─────▼─────────────────────┐
                │ Postgres (RLS, RPC: place_order, reserve_stock, search_products)│
                │ Auth (email/magic link, Google)  Storage (product-images, banners)│
                │ pg_cron (liberar reservas, limpiar carritos)                     │
                └──────────────────────────────────────────────────────────────────┘
                            ▲ pooler 6543 (secret key dedicada)
                ┌───────────┴──────────── VPS Contabo (Docker) ──────────────────┐
  Vercel ─HMAC─►│ Caddy → api (Hono): /shipping/quote, /branches, /track          │
  (timeout 2,5s │ worker (BullMQ+Redis): envíos, etiquetas, tracking, imágenes,   │
   + fallback)  │   feeds, emails diferidos, backups · Uptime Kuma · Dozzle       │
                └──────────► Andreani API · MiCorreo API · ARCA (fase 2) ─────────┘

      Externos: Getnet / Mercado Pago (pago + webhook en Vercel) · Resend (email)
                Sentry · GA4 / Meta CAPI · Upstash Redis · Cloudflare Turnstile
```

## Estructura de carpetas

Monorepo: `apps/web` (lo de abajo), `apps/integrations` (servicio del VPS, ver [13](13-vps-contabo-integraciones.md)), `packages/shared` (esquemas Zod y tipos compartidos), `supabase/` en la raíz. Dentro de `apps/web` se suma `components/webgl/` (escenas, shaders `.glsl`, detección de tier).

```
balance-beauty/apps/web/
├─ app/
│  ├─ (shop)/
│  │  ├─ page.tsx                     # Home
│  │  ├─ tienda/page.tsx              # Listado + filtros
│  │  ├─ categoria/[slug]/page.tsx
│  │  ├─ producto/[slug]/page.tsx     # Ficha (mantiene /producto/<slug> de WooCommerce)
│  │  ├─ buscar/page.tsx
│  │  ├─ carrito/page.tsx
│  │  ├─ checkout/page.tsx
│  │  ├─ checkout/resultado/page.tsx
│  │  ├─ preguntas-frecuentes/page.tsx
│  │  ├─ nosotros/ · donde-estamos/ · contacto/ · mayorista/
│  │  ├─ legales/[slug]/page.tsx      # privacidad, devoluciones, términos
│  │  └─ arrepentimiento/page.tsx
│  ├─ (account)/mi-cuenta/{page,pedidos,pedidos/[id],direcciones,datos}/
│  ├─ (auth)/{ingresar,registro,auth/callback}/
│  ├─ admin/
│  │  ├─ layout.tsx                   # guard de rol
│  │  ├─ page.tsx                     # dashboard (ventas, pedidos pendientes, stock bajo)
│  │  ├─ productos/ · categorias/ · pedidos/ · clientes/
│  │  ├─ promociones/ · cupones/ · banners/ · faq/ · envios/ · ajustes/
│  ├─ api/
│  │  ├─ webhooks/mercadopago/route.ts
│  │  ├─ webhooks/getnet/route.ts
│  │  ├─ cron/release-reservations/route.ts
│  │  └─ revalidate/route.ts
│  ├─ sitemap.ts · robots.ts · manifest.ts · opengraph-image.tsx
│  └─ layout.tsx · not-found.tsx · error.tsx · global-error.tsx
├─ components/
│  ├─ ui/                             # shadcn
│  ├─ shop/                           # ProductCard, PriceTag, InstallmentsBadge, CartSheet…
│  ├─ admin/                          # DataTable, ImageUploader, OrderTimeline…
│  └─ layout/                         # Header, Footer, MegaMenu, SearchCommand
├─ lib/
│  ├─ supabase/{server,public,client,admin}.ts
│  ├─ payments/{index,getnet,mercadopago}.ts   # interfaz PaymentProvider
│  ├─ shipping/{index,flat-rate,correo-argentino,andreani}.ts
│  ├─ pricing.ts                      # descuentos, cuotas, precio sin impuestos
│  ├─ email/{send.ts, templates/*.tsx}
│  ├─ validation/*.ts                 # esquemas Zod
│  ├─ seo.ts · analytics.ts · ratelimit.ts · env.ts (t3-env)
├─ actions/                           # Server Actions por dominio (cart, checkout, admin/*)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/*.sql
│  ├─ seed.sql
│  └─ seed/legacy_products.csv
├─ scripts/                           # migración desde WooCommerce, import de imágenes
├─ tests/{unit,e2e}/
├─ emails/                            # preview de React Email
├─ proxy.ts                           # (Next 16: ex middleware) refresh de sesión + chequeo optimista /admin y /mi-cuenta
├─ next.config.ts · vercel.json (redirects, crons)
└─ CLAUDE.md · README.md · docs/
```

## Decisiones de diseño

1. **Server‑first**: lectura con React Server Components; mutaciones con Server Actions validadas con Zod. Cliente solo donde hay interacción (carrito, filtros, galería).
2. **Caché**: catálogo con `"use cache"` / `cacheTag('products')` (o `revalidateTag`) y revalidación desde el admin al guardar. Precios y stock se re‑validan en el servidor al agregar al carrito y al confirmar el pedido; nunca se confía en el cliente.
3. **Carrito**: tabla `carts` en Supabase identificada por cookie `cart_id` (invitado) y vinculada al `user_id` al loguearse (merge).
4. **Checkout atómico**: función Postgres `place_order()` (SECURITY DEFINER) que en una transacción valida precios, reserva stock (`SELECT … FOR UPDATE`), crea `orders` + `order_items` y devuelve el id. La creación de la preferencia de pago ocurre después, en el servidor.
5. **Pagos desacoplados**: interfaz `PaymentProvider { createCheckout, parseWebhook, getPayment }`; el estado del pedido solo cambia por **webhook verificado** (firma + consulta al proveedor), idempotente por `provider_payment_id`.
6. **Admin dentro del mismo proyecto** con rol en `profiles.role` y claim en JWT (custom access token hook). Toda escritura admin pasa por Server Actions que verifican rol + RLS.
7. **Service role key** solo en `lib/supabase/admin.ts`, marcado `server-only`.
8. **URLs** compatibles con WooCommerce (`/producto/<slug>`) para no perder SEO; el resto con 301 en `next.config.ts`.
9. **Lo lento va al VPS**: ninguna función de Vercel espera a un tercero más de 2,5 s; cotizaciones con caché y fallback a tarifa plana; trabajos largos por cola.
10. **Catálogo estático con revalidación on‑demand**: 0 queries a Supabase en cache hit ([11](11-performance-y-costos.md)).
11. **WebGL aislado** en `components/webgl/`, cargado después del LCP y solo en home/landings ([14](14-frontend-ux-ui-webgl.md)).

## Entornos

| Entorno    | Vercel                                           | Supabase                           | VPS                    | Pagos      |
| ---------- | ------------------------------------------------ | ---------------------------------- | ---------------------- | ---------- |
| Local      | `pnpm dev`                                       | `supabase start` (Docker)          | `docker compose` local | sandbox    |
| Staging    | deploy **manual** al cerrar fase, con aprobación | proyecto `staging` (Free)          | stack `staging`        | sandbox    |
| Producción | deploy **manual** tras validar staging           | proyecto `prod` (Pro, `sa-east-1`) | stack `prod`           | producción |

Detalle en [12 — Deploy y entornos](12-deploy-y-entornos.md).
