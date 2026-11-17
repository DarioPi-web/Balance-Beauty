# CLAUDE.md — Balance Beauty

E‑commerce de dermocosmética (balancebeauty.com.ar). Reemplaza un WordPress/WooCommerce. Stack: monorepo pnpm/Turborepo — `apps/web` (Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui + R3F/GSAP) en Vercel, Supabase, y `apps/integrations` (Hono + BullMQ) en un VPS Contabo. Idioma de la UI: español rioplatense. Moneda: ARS sin decimales.

Documentación de referencia en `docs/` (empezar por `README.md`). Antes de cambiar el modelo de datos leer `docs/03-modelo-de-datos.md`; antes de tocar pagos, `docs/02-arquitectura.md` §Decisiones.

## Comandos

- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e`
- `pnpm db:start` (Supabase local, requiere Docker) · `pnpm db:reset` · `pnpm db:diff <nombre>` · `pnpm db:types`

## Retomar trabajo

- **Leer primero `docs/CONTEXTO.md`** (stack, infraestructura e identificadores) y **`docs/ESTADO.md`** (punto de retorno); actualizar ESTADO en cada commit: fase actual, próximos pasos, pendientes del dueño.
- Supabase staging: proyecto `tblitemxzgeolktuieph` en sa-east-1 (São Paulo). Vercel: región `gru1`.

## Deploy (ADR‑010) — regla dura

- **Nunca desplegar automáticamente** ni ejecutar `vercel deploy`, `/deploy`, `supabase db push` o `deploy-vps.yml` por iniciativa propia.
- Al terminar una fase: correr el gate de `docs/12-deploy-y-entornos.md` y **preguntar al dueño** "¿Hacemos deploy de la fase N a staging?". Solo con un "sí" explícito. Producción requiere una segunda aprobación.

## Performance y costos (docs/11)

- Catálogo estático con `cacheTag` + revalidación on‑demand; nada de `cookies()`/`headers()` en layouts del catálogo; `proxy.ts` (ex middleware en Next 16) solo en `/admin`, `/mi-cuenta`, `/checkout`, `/auth`.
- Next.js 16.4 con Cache Components: leer `apps/web/node_modules/next/dist/docs/` antes de usar APIs nuevas. `cookies()`/sesión siempre detrás de `<Suspense>`; `revalidateTag(tag, "max")` o `updateTag(tag)` en Server Actions (la forma de un argumento está deprecada).
- Lecturas cacheables del catálogo con `createSupabasePublicClient()` (sin cookies) dentro de `"use cache"` + `cacheTag` + `cacheLife`.
- Nunca `select('*')` en listados; una query por vista; lógica multi‑paso en RPC; RLS con `(select auth.uid())`.
- Respetar presupuestos de bundle y Lighthouse; WebGL solo en `components/webgl/`, cargado post‑LCP, con tiers y `prefers-reduced-motion`.
- Nada que espere a un tercero > 2,5 s en Vercel: va al servicio de integraciones del VPS (`apps/integrations`) con fallback.

## Responsive y app instalable (docs/15)

- Mobile‑first, sin scroll horizontal de 280 px a 1920 px; objetivos táctiles ≥ 44 px; texto ≥ 16 px; `dvh` en vez de `vh`; safe areas con `safe-x/top/bottom`.
- Cada ruta pública nueva se agrega a `apps/web/tests/e2e/routes.ts` para que la matriz de dispositivos la pruebe. `pnpm --filter web test:e2e` (requiere `pnpm build`).
- No romper el manifest ni los íconos (`app/manifest.ts`, `app/icons`, `app/apple-icon.tsx`): el test de PWA lo valida.

## SEO y posicionamiento en IAs (docs/16)

- Todo contenido indexable debe estar en el HTML del servidor (los bots de IA no ejecutan JS). Nada de texto clave solo en componentes cliente.
- Cada página nueva: `generateMetadata`, canonical, JSON‑LD coherente con el texto visible, enlaces internos a producto/activo/preocupación.
- Keywords objetivo y página asignada: tablas de docs/16 §4 y `docs/seo/keywords-autocomplete-ar.csv`.

## Design system (ADR‑017, docs/14 §2)

- Dirección "B · Botánica clínica". Usar tokens, nunca hex sueltos: `bg-leaf`, `text-graphite`, `bg-mist`, `bg-rose-soft`, `bg-clinical`; `font-display` (Cormorant Garamond) para titulares, Geist para el resto.
- `rose` solo como fondo con texto grafito (no tiene contraste como color de texto).
- Si en `pnpm dev` no aparecen clases nuevas de Tailwind, borrar `apps/web/.next` y reiniciar (caché persistente de Turbopack); el build de producción no tiene ese problema.

## Reglas

- Server‑first: leer datos en Server Components; mutar con Server Actions en `actions/`, siempre validando con Zod y verificando sesión/rol dentro de la acción.
- Nunca confiar en precios/stock del cliente: recalcular en servidor (`place_order` RPC).
- `lib/supabase/admin.ts` (service role) solo desde código `server-only`. Nunca exponer secretos con `NEXT_PUBLIC_`.
- Toda tabla nueva: migración en `supabase/migrations/`, RLS habilitado con políticas explícitas, test pgTAP, y regenerar tipos (`pnpm db:types`).
- Montos como `integer` en pesos. Formatear con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`.
- Estado de pedidos solo cambia por webhook verificado o acción de admin; webhooks idempotentes por `provider_payment_id`.
- Mantener URLs `/producto/<slug>` (SEO heredado). Redirecciones en `next.config.ts`.
- Tras editar catálogo desde admin, revalidar por tag (`products`, `product:<slug>`).
- Componentes UI: usar shadcn/ui existentes en `components/ui` antes de crear nuevos. Accesibilidad WCAG 2.2 AA.
- Commits convencionales (`feat:`, `fix:`, `chore:` …). Un PR por tarea del backlog (`docs/05-backlog-tareas.md`), marcando el checkbox al cerrar. Validar en local (`pnpm build && pnpm start`) y CI; no hay previews automáticas.
- MCP de Supabase: usar el proyecto de **staging**; nunca ejecutar escrituras contra producción.
