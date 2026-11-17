# Estado del proyecto — punto de retorno

> Archivo de traspaso: se actualiza en cada commit. Si una sesión se corta (límite de uso, cierre de la app), una sesión nueva retoma leyendo esto primero, luego `CLAUDE.md` y `docs/05-backlog-tareas.md`.

**Última actualización:** 2026-11-17 · F4 checkout funcionando contra Supabase staging (transferencia probada de punta a punta; tarjeta espera credenciales TEST de Mercado Pago) · sin deploys

> Contexto general (stack, identificadores, credenciales): [CONTEXTO.md](CONTEXTO.md).

## Dónde estamos

| Fase                | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0 Descubrimiento   | Plan completo en `docs/`. Preguntas abiertas en `docs/06`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| F1 Fundación        | ✅ código y CI. GitHub `DarioPi-web/Balance-Beauty`. **Supabase staging en sa-east-1** (`tblitemxzgeolktuieph`): 4 migraciones + catálogo (50 productos, 6 marcas, 16 con foto), advisors de seguridad resueltos. Vercel: proyecto `balance-beauty` en `gru1`, Node 22, variables cargadas, sin Git vinculado y **sin deploys** (ver CONTEXTO.md). Docker local no hace falta                                                                                                                                                                                 |
| F2 Diseño           | ✅ Dirección B "Botánica clínica" aplicada (ADR‑017). Pendiente: wireframes/UI completa del resto de pantallas                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| F3b WebGL           | ✅ Hero "Equilibrio" (ADR‑018, `docs/perf/webgl-hero.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| F3 Catálogo         | 🟡 Home, `/tienda` (filtros sin hidratar tarjetas), `/categoria/[slug]`, `/preocupacion/[slug]`, `/producto/[slug]` (84 páginas estáticas), sitemap, robots, JSON‑LD, imágenes AVIF pre‑generadas (ADR‑009). Datos desde `lib/catalog/fixture.json` (sin Docker). Perf en `docs/perf/fase-3-catalogo.md` (presupuestos de laboratorio ajustados: avisar al dueño)                                                                                                                                                                                             |
| F4 Carrito/checkout | 🟡 Carrito (cookie firmada ADR‑019). **Checkout:** `/checkout` (formulario progresivo, Server Action `actions/checkout.ts`) → RPC `place_order` (precios, 10 % transferencia, envío y stock calculados en la base; reserva 30 min) → `/checkout/resultado` (`get_order_summary` por uuid; reintento de pago). Webhook MP → `confirm_payment` (idempotente, solo service_role). Probado: pgTAP + E2E con pedido real en staging (borrado después). **Falta:** credenciales TEST de MP, `SUPABASE_SERVICE_ROLE_KEY`, datos bancarios para transferencia, emails |

## Próximos pasos (en orden)

1. Cerrar F3: páginas de línea y de activos (S‑03, requieren contenido revisado por profesional), regresión visual (R‑08), View Transitions (F3‑13). Hechos: búsqueda, marcas, quiz `/rutina`, error.tsx, axe.
2. ✅ JS inicial bajo el tope (2026‑11‑17): todas las rutas ≤ 190.507 bytes (home 185.743). Se quitó `sonner`/`next-themes` y el paquete `cn`; Lighthouse CI ahora sí ejecuta las aserciones (antes fallaba la config). Detalle en `docs/perf/fase-3-catalogo.md`.
3. F4: probar tarjeta con credenciales TEST; datos bancarios en `store_settings`; emails (F4‑11); rate limiting / Turnstile en `place_order` (F4‑13; hoy un anónimo puede crear pedidos).
4. Gate de fase → preguntar al dueño si deploy a staging (requiere `VERCEL_TOKEN` en GitHub).

## Pendientes del dueño

- Credenciales **de prueba** de Mercado Pago (Public Key + Access Token TEST) y la clave secreta del webhook → van en `apps/web/.env.local` y en Vercel, nunca en el repo.
- `SUPABASE_SERVICE_ROLE_KEY` del proyecto de São Paulo → cargarla en Vercel (sensitive) y en `.env.local`; la necesitan los pedidos (`place_order`/`confirm_payment`).
- Para deploys con `deploy.yml`: crear un token en Vercel (Account Settings → Tokens) y cargarlo como secreto `VERCEL_TOKEN` en GitHub, junto a `VERCEL_ORG_ID=team_jbU1xy9jy1t9OU0V5Fvb7wsc` y `VERCEL_PROJECT_ID=prj_WR7J2CP7LEqoXjH9cd1G6wkJPO5t`. Opcional: vincular GitHub en Vercel (Account Settings → Login Connections) si se quiere ver el repo desde el panel.
- Borrar el proyecto Supabase viejo `zrkiuflpimebwuswjihv` (us-west-2): ya está **pausado**; el borrado definitivo se hace en el panel (Project Settings → General → Delete project).

## Pendientes técnicos de la base

- Advisors de rendimiento: índices de claves foráneas **resueltos** (migración 5). Quedan las políticas "admin all" superpuestas con las públicas: separar por acción antes de producción.
- Tarifas de envío en staging son **provisorias** (domicilio $7.500, sucursal $5.500, gratis desde $150.000) hasta definir Q‑04 / matriz del VPS.
- Datos bancarios para transferencia: cargar en `store_settings` (clave `bank_transfer`, pública) y mostrarlos en `/checkout/resultado`; hoy el texto dice que se envían por email/WhatsApp.
- `/terminos` y `/privacidad` son **borradores** (`noindex`, aviso visible) hasta revisión legal.
- Habilitar el hook `custom_access_token_hook` en Supabase Auth cuando se implemente el login.

## Datos del catálogo

- En esta PC `CATALOG_SOURCE=supabase` (lee staging en São Paulo; build y páginas verificadas). Sin `.env.local` se usa el fixture.
- Sincronizar cambios del fixture a la base: `node scripts/generate-catalog-sync-sql.mjs` → aplicar `supabase/staging-sync-catalogo.sql` (idempotente).
- Fixture generado con `node scripts/generate-catalog-fixture.mjs <uploads>` desde `supabase/seed/legacy_products.csv` + fotos identificadas (`scripts/catalog-mapping.mjs`).
- Fotos: originales en `assets/products/`; variantes servidas con `node scripts/optimize-product-images.mjs` → `apps/web/public/img/products/` (loader `lib/image-loader.ts`).
- 50 productos activos, 16 con foto. Marca mayoritaria: **Sulderm**. Hay productos nuevos (Mary & May) que no están en la base de junio → re‑exportar del sitio en vivo.

## Entorno local

Ver `docs/SETUP-LOCAL.md`. Doble clic en `iniciar-sitio.cmd` levanta `localhost:3000`. Base: Supabase staging en la nube (sin Docker). E2E que crea un pedido real: `E2E_ORDERS=1 pnpm --filter web exec playwright test tests/e2e/checkout.spec.ts` (borrar después los pedidos `@balancebeauty.test`).

## Cómo verificar

```
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
pnpm --filter web build && pnpm --filter web test:e2e
```

Servidor local: `pnpm --filter web dev --port 3000` (si no aparecen clases nuevas de Tailwind, borrar `apps/web/.next`).

## Reglas que no se rompen

- Nunca deployar sin aprobación explícita del dueño (ADR‑010).
- Presupuestos de performance de `docs/11` y `apps/web/lighthouserc.json` (home ≥ 90 / LCP < 2 s; catálogo ≥ 85 / LCP lab < 3,6 s; CLS < 0,05; JS total < 230 KB; campo: LCP p75 < 2,5 s).
- Commits con `git -c user.name="dariopi2012" -c user.email=…` (sin identidad global en la máquina).
