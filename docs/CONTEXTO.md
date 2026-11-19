# Contexto del proyecto — leer primero

> Resumen para cualquier persona o sesión de IA (Claude Code, Cursor, etc.) que toma el proyecto
> desde cero en cualquier PC. **Actualizado: 2026‑11‑19** (último commit `b75623c`, v1.2).
> Orden de lectura: este archivo → [ESTADO.md](ESTADO.md) (punto de retorno) →
> [18 Hoja de ruta](18-roadmap-lanzamiento-y-actualizaciones.md) (qué sigue) → [../CLAUDE.md](../CLAUDE.md) (reglas).
> **Nunca** guardar secretos acá: solo identificadores públicos y dónde vive cada credencial.

## Qué es

E‑commerce de dermocosmética **Balance Beauty** (balancebeauty.com.ar, Argentina). Reemplaza un
WordPress + WooCommerce + Elementor en Hostinger. UI en español rioplatense, moneda ARS sin
decimales. 50 productos activos (32 con foto), 6 marcas, 9 preocupaciones.

## En qué punto está (2026‑11‑19)

| Etapa                                                                 | Estado                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tienda (catálogo, ficha, búsqueda, quiz de rutina, carrito, checkout) | ✅ funcionando contra Supabase staging                                                                                                                                                                |
| Pagos                                                                 | ✅ transferencia (con datos bancarios y "Copiar") · 🟡 Mercado Pago: código listo, **faltan credenciales TEST**                                                                                       |
| Admin                                                                 | ✅ inicio "Hoy", pedidos, productos (alta, edición, fotos con AVIF automático, **edición masiva por Excel**), inventario por lote, **vendedoras** (códigos, comisiones, liquidaciones), integraciones |
| Vendedoras                                                            | ✅ panel `/vendedora` (comisiones, códigos, ventas, liquidaciones); código de descuento en el checkout — [guía](GUIA-PLANILLA-Y-VENDEDORAS.md)                                                        |
| Legales                                                               | ✅ Botón de arrepentimiento (Res. 424/2020), precio sin impuestos nacionales (Ley 27.743), páginas de términos/privacidad/devoluciones (**borradores**, falta revisión legal)                         |
| Seguridad                                                             | ✅ revisión L7 hecha (CSP, RLS, secretos, dependencias) — ver docs/10 §1b                                                                                                                             |
| Staging (Vercel)                                                      | 🟡 desplegado el 2026‑11‑18 con una versión **anterior** a L2–v1.2; redeploy pendiente de aprobación                                                                                                  |
| Producción                                                            | ⏳ no existe todavía (L8: dominio, Supabase prod, aprobación del dueño)                                                                                                                               |

**Hoja de ruta vigente:** [docs/18](18-roadmap-lanzamiento-y-actualizaciones.md). v1.0 = lanzamiento
(L1–L9; faltan L6 webhook de MP y L8 salida a producción) · después actualizaciones v1.1 ✅,
v1.2 ✅, v1.3 cuentas de clientes, v1.4 envíos automáticos, v1.5 calidad de catálogo (ANMAT/INCI,
IA), v1.6 crecimiento/SEO, v1.7 administración avanzada, v2.0 ARCA y Mercado Libre.
Plan funcional del catálogo/inventario: [docs/17](17-plan-catalogo-inventario-y-automatizacion.md).

## Stack

| Capa          | Tecnología                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo      | pnpm 10 + Turborepo · Node 22                                                                                                                    |
| Web           | `apps/web`: Next.js 16.4 App Router (**Cache Components**), React 19, TypeScript, Tailwind v4, shadcn/ui (solo button/dialog/sheet/toast), sharp |
| Hero          | video de marca de fondo (AV1 → VP9 → H.264, 720/1080, póster AVIF); el WebGL "Equilibrio" se eliminó                                             |
| Datos         | Supabase (Postgres 17, Auth, Storage, Vault, pg_cron) con RLS en todas las tablas                                                                |
| Pagos         | Mercado Pago Checkout Pro (ADR‑002): preferencia + webhook con firma HMAC                                                                        |
| Emails        | Resend + React Email (sin `RESEND_API_KEY` se registran en el log y no salen)                                                                    |
| Hosting web   | Vercel, región `gru1` (São Paulo). **Sin deploys automáticos** (ADR‑010)                                                                         |
| Integraciones | `apps/integrations` (Hono + `@hono/node-server` 2.x) para el VPS Contabo: cotización Andreani con HMAC (9 tests); falta montar el VPS            |
| Tests         | Vitest (96), Playwright (664 en 9 dispositivos, a11y con axe, CSP, video, legales), visual (`VISUAL=1`), Lighthouse CI, size‑limit, pgTAP        |

## Infraestructura (identificadores, no secretos)

| Recurso             | Valor                                                                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositorio         | https://github.com/DarioPi-web/Balance-Beauty (privado), rama `main`. Rama `feat/inventario-lotes` ya integrada (se puede borrar)                                                                                                                                                         |
| Supabase staging    | proyecto `tblitemxzgeolktuieph` · **sa-east-1** · https://tblitemxzgeolktuieph.supabase.co · migraciones 1–17 aplicadas · bucket `product-images`                                                                                                                                         |
| Supabase org        | `keljjwvnsscwqligleil` (plan gratuito)                                                                                                                                                                                                                                                    |
| Supabase anterior   | `zrkiuflpimebwuswjihv` (us-west-2) — pausado, pendiente de borrar desde el panel                                                                                                                                                                                                          |
| Supabase producción | todavía no existe (se crea al pasar a producción, también en sa-east-1)                                                                                                                                                                                                                   |
| Vercel              | proyecto `balance-beauty` (`prj_WR7J2CP7LEqoXjH9cd1G6wkJPO5t`), equipo `team_jbU1xy9jy1t9OU0V5Fvb7wsc`, root `apps/web`, `gru1`, **sin repo Git vinculado**, previews con protección de Vercel. Último preview: `balance-beauty-37wwrmrx4-dariopi2012-7192.vercel.app` (commit `2985dbe`) |
| VPS                 | Contabo Cloud VPS 20 (6 vCPU, 12 GB RAM, 200 GB SSD, EU) — docs/13; sin montar                                                                                                                                                                                                            |
| Jobs (pg_cron)      | `release-expired-reservations` cada 5 min · `expire-inventory-lots` 03:05 AR                                                                                                                                                                                                              |

## Dónde viven las credenciales

| Dato                                                                                  | Dónde                                                                                                                             | ¿Público? |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` (publishable)                                | `apps/web/.env.local` y Vercel                                                                                                    | Sí        |
| `SUPABASE_SERVICE_ROLE_KEY`                                                           | Vercel (sensitive) y `.env.local` — **todavía no cargada**                                                                        | **No**    |
| `CART_SECRET`, `CHECKOUT_SERVER_KEY`, `REVALIDATE_SECRET`, `INTEGRATIONS_HMAC_SECRET` | `.env.local` y Vercel (sensitive); de `CHECKOUT_SERVER_KEY` Supabase guarda solo el hash (`private.server_keys`)                  | **No**    |
| Mercado Pago, Andreani, Resend, emails de la tienda                                   | **`/admin/integraciones`** → Supabase Vault (nunca se vuelven a mostrar completos); las variables de entorno quedan como respaldo | **No**    |
| Datos bancarios (titular, banco, CBU, alias, CUIT)                                    | `/admin/integraciones` → `store_settings.bank_transfer` (público: se muestra al comprador)                                        | Sí        |
| `CATALOG_SOURCE`                                                                      | `supabase` para leer la base; sin definir = fixture local                                                                         | Sí        |

`.env*` está en `.gitignore` y en `.vercelignore`. Plantilla: [../.env.example](../.env.example).
Guía para el dueño: [INTEGRACIONES.md](INTEGRACIONES.md).

## Cómo arrancar en una PC nueva (Windows)

1. Clonar en una ruta corta: `git clone https://github.com/DarioPi-web/Balance-Beauty.git C:\dev\balance-beauty`
2. Doble clic en `instalar-entorno.cmd` (Git, Node 22, pnpm, dependencias).
3. Crear `apps/web/.env.local` desde `.env.example` (URL + clave publishable de Supabase como mínimo).
4. Doble clic en `iniciar-sitio.cmd` → http://localhost:3000 · admin en `/ingresar`.

Comandos: `pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` ·
`pnpm --filter web test:e2e` (requiere build) · `VISUAL=1 pnpm exec playwright test visual` ·
`pnpm --filter web lhci` · `pnpm --filter integrations test`.

**Particularidades de esta PC (Windows):** usar PowerShell para `pnpm` (en Git Bash falla el PATH);
no hay Python (scripts en Node); el WebKit de Playwright para Windows no decodifica video ni AVIF
(los tests de video se saltean ahí y las capturas de iPhone muestran fotos rotas — limitación del
emulador); Lighthouse local depende de la CPU (`benchmarkIndex` < 2000 duplica el TBT simulado).

## Base de datos (migraciones en `supabase/migrations/`)

| #     | Contenido                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4   | Esquema, funciones, RLS, endurecimiento                                                                                                                                                                       |
| 5–7   | Pedidos (`place_order`, `confirm_payment`, `get_order_summary`), anti‑spam con clave de servidor, admin de pedidos                                                                                            |
| 8     | Integraciones en Vault (`admin_set_integration_secret`, `get_integration_secrets`)                                                                                                                            |
| 10–11 | Admin de productos: bucket `product-images`, `admin_create_product`, `admin_save_product` (si faltan requisitos para publicar, guarda y avisa)                                                                |
| 12–13 | Botón de arrepentimiento (`request_withdrawal`, exige clave de servidor)                                                                                                                                      |
| 14    | Tablero `admin_dashboard`, `admin_withdrawal_handle`, pg_cron de reservas                                                                                                                                     |
| 17    | **Vendedoras y Excel**: sellers, códigos con comisión, `place_order` con cupón, comisiones por estado del pedido, liquidaciones, `admin_bulk_update_products`                                                 |
| 15–16 | **Inventario por lote**: lotes, FEFO, libro de movimientos inmutable, proveedores, OC, historial de precios, datos ANMAT/EAN; stock solo por `admin_inventory_receive/adjust/set_lot_status`; job de vencidos |
| 17    | **Vendedoras y Excel**: sellers, códigos con comisión, `place_order` con cupón, comisiones según el estado del pedido, liquidaciones, `admin_bulk_update_products`                                            |

(La 9 no existe: la etapa A se renumeró a 15.) Tests pgTAP en `supabase/tests/`. Con IA + MCP de
Supabase: `apply_migration` para DDL, `execute_sql` para datos/pruebas (envolver pruebas en un
`do $$ … raise exception … $$` para que siempre se reviertan), `get_advisors` después de cada
cambio, tipos en `apps/web/lib/supabase/database.types.ts`. **Solo staging**; producción nunca
sin aprobación. Detalle del modelo: [03](03-modelo-de-datos.md).

## Mapa rápido del código (`apps/web`)

| Ruta                                                       | Qué hay                                                                                                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(shop)/`                                              | Home (video), tienda, categoría, preocupación, marca, producto, rutina, carrito, checkout, resultado, promociones, contacto, mayorista, FAQ, arrepentimiento, legales |
| `app/admin/`                                               | `page.tsx` inicio "Hoy" · `pedidos/` · `productos/` (listado, editor con fotos e inventario, `planilla/` Excel) · `vendedoras/` · `integraciones/`                    |
| `app/vendedora/`                                           | Panel de cada vendedora (layout propio; guard en `lib/seller/server.ts`)                                                                                              |
| `actions/`                                                 | Server Actions (Zod + sesión/rol): carrito, checkout, auth, admin de pedidos/productos/inventario/integraciones, arrepentimiento                                      |
| `lib/catalog/`                                             | Catálogo cacheado (`"use cache"` + tag `catalog`; el admin hace `updateTag`)                                                                                          |
| `lib/admin/`                                               | `requireAdmin` (sesión + `is_admin()` en la base), rutas de imágenes del bucket                                                                                       |
| `lib/payments/`, `lib/orders/`, `lib/email/`, `emails/`    | Mercado Pago, pedidos/notificaciones, Resend + plantillas                                                                                                             |
| `lib/settings/`                                            | Integraciones (Vault con respaldo en env), datos bancarios                                                                                                            |
| `lib/site-url.ts`, `lib/pricing.ts`, `lib/image-loader.ts` | URL pública por entorno, precios (incl. sin impuestos nacionales), loader AVIF                                                                                        |
| `components/admin/`                                        | Subida de fotos (achica en el navegador), sección de inventario                                                                                                       |
| `next.config.ts`                                           | CSP y encabezados de seguridad, redirecciones 301 de WooCommerce, caché de `/public`                                                                                  |
| `tests/`                                                   | `unit/` (Vitest) y `e2e/` (Playwright; `routes.ts` = rutas de la matriz responsive)                                                                                   |

Fuera de la web: `apps/integrations/` (servicio del VPS), `supabase/` (migraciones y pgTAP),
`scripts/` (catálogo e imágenes), `docs/` (plan completo, ADRs, estado).

## Reglas de trabajo (resumen de CLAUDE.md)

- **Deploy:** nunca automático ni por iniciativa propia (Vercel, `supabase db push`, VPS). Staging
  con "sí" explícito del dueño; producción con una segunda aprobación.
- Cambios de stock solo por las RPC de inventario; precios y stock siempre recalculados en la base.
- Toda tabla nueva: migración + RLS + pgTAP + tipos. Lógica multi‑paso en RPC.
- Commits convencionales en español (asunto en minúscula, cuerpo ≤ 100 caracteres por línea:
  lo valida commitlint), con los hooks activos. Actualizar [ESTADO.md](ESTADO.md) en cada commit.
- Mobile‑first, objetivos táctiles ≥ 44 px, WCAG 2.2 AA; nada de texto indexable solo en
  componentes cliente; tokens del design system (nunca hex sueltos).
- Textos de productos sin promesas terapéuticas (ANMAT: "ayuda a", nunca "cura/trata/elimina").

## Pendientes del dueño (para lanzar)

Credenciales TEST de Mercado Pago (cargar en `/admin/integraciones`) · datos bancarios ·
cuenta de Resend + DNS del dominio · `SUPABASE_SERVICE_ROLE_KEY` en Vercel · tarifas de envío
definitivas · textos legales revisados · fotos y descripciones faltantes (18 sin foto) ·
rotar credenciales del WordPress viejo · activar "Leaked password protection" en Supabase Auth
(plan Pro) · aprobación para actualizar staging y, después, producción. Detalle: docs/18 (D1–D9).
