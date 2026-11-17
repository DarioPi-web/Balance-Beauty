# Contexto del proyecto — leer primero

> Resumen para cualquier persona o sesión de IA (Claude Code, Cursor, etc.) que toma el proyecto desde cero en cualquier PC.
> Detalle por tema en `docs/00`–`16`; estado vivo en [ESTADO.md](ESTADO.md); reglas en [../CLAUDE.md](../CLAUDE.md).
> **Nunca** guardar secretos acá: solo identificadores públicos y dónde vive cada credencial.

## Qué es

E‑commerce de dermocosmética **Balance Beauty** (balancebeauty.com.ar, Argentina). Reemplaza un WordPress + WooCommerce + Elementor en Hostinger. UI en español rioplatense, moneda ARS sin decimales.

## Stack

| Capa          | Tecnología                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Monorepo      | pnpm 10 + Turborepo · Node 22                                                                                     |
| Web           | `apps/web`: Next.js 16 App Router (Cache Components), React 19, TypeScript, Tailwind v4, shadcn/ui, WebGL2 propio |
| Datos         | Supabase (Postgres 17, Auth, Storage) con RLS en todas las tablas                                                 |
| Pagos         | Mercado Pago Checkout Pro (ADR‑002): preferencia + webhook con firma HMAC                                         |
| Hosting web   | Vercel, región `gru1` (São Paulo). **Sin deploys automáticos** (ADR‑010)                                          |
| Integraciones | `apps/integrations` (Hono + BullMQ) en VPS Contabo (Andreani, Correo Argentino, colas)                            |
| Tests         | Vitest (unit), Playwright (9 dispositivos, a11y con axe), Lighthouse CI, size‑limit, pgTAP                        |

## Infraestructura (identificadores, no secretos)

| Recurso             | Valor                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositorio         | https://github.com/DarioPi-web/Balance-Beauty (privado), rama `main`                                                                                                                                                                                                                                                                                                  |
| Supabase staging    | proyecto `tblitemxzgeolktuieph` · región **sa-east-1 (São Paulo)** · https://tblitemxzgeolktuieph.supabase.co                                                                                                                                                                                                                                                         |
| Supabase org        | `keljjwvnsscwqligleil` (plan gratuito)                                                                                                                                                                                                                                                                                                                                |
| Supabase anterior   | `zrkiuflpimebwuswjihv` (us-west-2) — **pausado**, pendiente de borrar desde el panel; reemplazado por el de São Paulo                                                                                                                                                                                                                                                 |
| Supabase producción | todavía no existe (se crea al pasar a producción, también en sa-east-1)                                                                                                                                                                                                                                                                                               |
| Vercel              | proyecto `balance-beauty` (`prj_WR7J2CP7LEqoXjH9cd1G6wkJPO5t`), cuenta `team_jbU1xy9jy1t9OU0V5Fvb7wsc` (`dariopi2012-7192`), funciones en `gru1`, Node 22, root `apps/web`, **sin repo Git vinculado** (deploys solo manuales con `.github/workflows/deploy.yml`, ADR‑010). Variables cargadas: Supabase URL/publishable, `CATALOG_SOURCE`, `CART_SECRET` (sensitive) |
| VPS                 | Contabo Cloud VPS 20 (6 vCPU, 12 GB RAM, 200 GB SSD, región EU, Linux) — docs/13                                                                                                                                                                                                                                                                                      |

## Dónde viven las credenciales

| Variable                                       | Dónde                                                     | ¿Pública?              |
| ---------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`       | `apps/web/.env.local` y Vercel                            | Sí (clave publishable) |
| `SUPABASE_SERVICE_ROLE_KEY`                    | solo Vercel (sensitive) y `.env.local` del dueño          | **No**                 |
| `CART_SECRET`                                  | `.env.local` (generado por PC) y Vercel                   | **No**                 |
| `MERCADOPAGO_ACCESS_TOKEN` / `_WEBHOOK_SECRET` | `.env.local` y Vercel (TEST en staging)                   | **No**                 |
| `CATALOG_SOURCE`                               | `supabase` para leer la base; sin definir = fixture local | Sí                     |

`.env.local` está en `.gitignore`. Plantilla completa: [../.env.example](../.env.example).

## Cómo arrancar en una PC nueva (Windows)

1. Clonar en una ruta corta: `git clone https://github.com/DarioPi-web/Balance-Beauty.git C:\dev\balance-beauty`
2. Doble clic en `instalar-entorno.cmd` (Git, Node 22, pnpm, dependencias).
3. Crear `apps/web/.env.local` copiando `.env.example` y completando URL + clave publishable de Supabase (arriba). Sin ese archivo el sitio igual funciona con el catálogo local (fixture).
4. Doble clic en `iniciar-sitio.cmd` → http://localhost:3000

## Base de datos

- Migraciones: `supabase/migrations/` (esquema, funciones, RLS, endurecimiento). Aplicadas en staging vía MCP de Supabase.
- Catálogo: `apps/web/lib/catalog/fixture.json` es la versión depurada (50 productos, 6 marcas, 16 con foto). `node scripts/generate-catalog-sync-sql.mjs` genera `supabase/staging-sync-catalogo.sql` (idempotente) para volcarla a Supabase.
- Fotos: no están en Supabase Storage; `product_images.storage_path` guarda `/products/...` y el sitio sirve variantes AVIF desde `apps/web/public/img/products` (ADR‑009).
- Con IA + MCP de Supabase: `apply_migration` para DDL, `execute_sql` para datos, `get_advisors` después de cada cambio. **Solo staging**; producción nunca sin aprobación.

## Reglas de trabajo

- No desplegar ni tocar producción sin un "sí" explícito del dueño (ADR‑010). Staging también se pregunta al cerrar cada fase.
- Commits convencionales en español (`feat:`, `fix:`, `chore:` …, asunto en minúscula: lo valida commitlint).
- Actualizar [ESTADO.md](ESTADO.md) en cada commit.
- Presupuestos de performance (docs/11) y accesibilidad WCAG 2.2 AA; nada de texto indexable solo en componentes cliente (docs/16).

## Mapa rápido del código

| Ruta                                    | Qué hay                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/app/(shop)/`                  | Home, tienda, categoría, preocupación, marca, producto, rutina, carrito |
| `apps/web/lib/catalog/`                 | Capa de datos del catálogo (fixture o Supabase)                         |
| `apps/web/lib/cart/`, `actions/cart.ts` | Carrito en cookie firmada (ADR‑019)                                     |
| `apps/web/lib/payments/`                | Mercado Pago (preferencia, firma del webhook)                           |
| `apps/web/lib/validation/`              | Esquemas Zod (checkout)                                                 |
| `apps/web/components/webgl/`            | Hero WebGL "Equilibrio" (ADR‑018)                                       |
| `supabase/`                             | Migraciones, tests pgTAP, SQL de staging                                |
| `scripts/`                              | Generadores de catálogo, seed e imágenes                                |
| `docs/`                                 | Plan completo, ADRs, estado                                             |
