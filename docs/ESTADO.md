# Estado del proyecto — punto de retorno

> Archivo de traspaso: se actualiza en cada commit. Si una sesión se corta (límite de uso, cierre de la app), una sesión nueva retoma leyendo esto primero, luego `CLAUDE.md` y `docs/05-backlog-tareas.md`.

**Última actualización:** 2026-11-17 · Infraestructura en São Paulo (Supabase staging y proyecto Vercel listos, sin deploys) · F4 pagos en curso

> Contexto general (stack, identificadores, credenciales): [CONTEXTO.md](CONTEXTO.md).

## Dónde estamos

| Fase                | Estado                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0 Descubrimiento   | Plan completo en `docs/`. Preguntas abiertas en `docs/06`                                                                                                                                                                                                                                                                                                                     |
| F1 Fundación        | ✅ código y CI. GitHub `DarioPi-web/Balance-Beauty`. **Supabase staging en sa-east-1** (`tblitemxzgeolktuieph`): 4 migraciones + catálogo (50 productos, 6 marcas, 16 con foto), advisors de seguridad resueltos. Vercel: proyecto `balance-beauty` en `gru1`, Node 22, variables cargadas, sin Git vinculado y **sin deploys** (ver CONTEXTO.md). Docker local no hace falta |
| F2 Diseño           | ✅ Dirección B "Botánica clínica" aplicada (ADR‑017). Pendiente: wireframes/UI completa del resto de pantallas                                                                                                                                                                                                                                                                |
| F3b WebGL           | ✅ Hero "Equilibrio" (ADR‑018, `docs/perf/webgl-hero.md`)                                                                                                                                                                                                                                                                                                                     |
| F3 Catálogo         | 🟡 Home, `/tienda` (filtros sin hidratar tarjetas), `/categoria/[slug]`, `/preocupacion/[slug]`, `/producto/[slug]` (84 páginas estáticas), sitemap, robots, JSON‑LD, imágenes AVIF pre‑generadas (ADR‑009). Datos desde `lib/catalog/fixture.json` (sin Docker). Perf en `docs/perf/fase-3-catalogo.md` (presupuestos de laboratorio ajustados: avisar al dueño)             |
| F4 Carrito/checkout | 🟡 Carrito completo (cookie firmada ADR‑019, mini‑carrito, `/carrito`, rutina al carrito). Pasarela: **Mercado Pago Checkout Pro** (ADR‑002): preferencia, webhook con firma HMAC y validación del checkout hechos con tests. **Bloqueado:** credenciales TEST de MP y base de datos (Supabase) para pedidos                                                                  |

## Próximos pasos (en orden)

1. Cerrar F3: páginas de línea y de activos (S‑03, requieren contenido revisado por profesional), regresión visual (R‑08), View Transitions (F3‑13). Hechos: búsqueda, marcas, quiz `/rutina`, error.tsx, axe.
   - **Antes del checkout:** bajar JS inicial (home 193 KB, carrito 194 KB; tope 195 KB). Candidatos: unificar islas cliente del header/barra inferior, revisar íconos lucide y `cn`.
2. Gate F3 → preguntar al dueño si deploy a staging (requiere cuentas).
3. F4 checkout: formulario (usa `lib/validation/checkout.ts`), `/checkout/resultado`, `place_order` + `confirm_payment` en Supabase (TODO en `lib/orders/payment-events.ts`), prueba de punta a punta con credenciales TEST.

## Pendientes del dueño

- Credenciales **de prueba** de Mercado Pago (Public Key + Access Token TEST) y la clave secreta del webhook → van en `apps/web/.env.local` y en Vercel, nunca en el repo.
- `SUPABASE_SERVICE_ROLE_KEY` del proyecto de São Paulo → cargarla en Vercel (sensitive) y en `.env.local`; la necesitan los pedidos (`place_order`/`confirm_payment`).
- Para deploys con `deploy.yml`: crear un token en Vercel (Account Settings → Tokens) y cargarlo como secreto `VERCEL_TOKEN` en GitHub, junto a `VERCEL_ORG_ID=team_jbU1xy9jy1t9OU0V5Fvb7wsc` y `VERCEL_PROJECT_ID=prj_WR7J2CP7LEqoXjH9cd1G6wkJPO5t`. Opcional: vincular GitHub en Vercel (Account Settings → Login Connections) si se quiere ver el repo desde el panel.
- Borrar el proyecto Supabase viejo `zrkiuflpimebwuswjihv` (us-west-2): ya está **pausado**; el borrado definitivo se hace en el panel (Project Settings → General → Delete project).

## Pendientes técnicos de la base

- Advisors de rendimiento (informativos): 6 claves foráneas sin índice (`cart_items.product_id`, `order_items.product_id`, `orders.coupon_id`, `product_prices.product_id`, `related_products.related_id`, `categories.parent_id`) y políticas "admin all" superpuestas con las públicas. Resolver antes de producción (índices + políticas de admin separadas por acción).
- Habilitar el hook `custom_access_token_hook` en Supabase Auth cuando se implemente el login.

## Datos del catálogo

- En esta PC `CATALOG_SOURCE=supabase` (lee staging en São Paulo; build y páginas verificadas). Sin `.env.local` se usa el fixture.
- Sincronizar cambios del fixture a la base: `node scripts/generate-catalog-sync-sql.mjs` → aplicar `supabase/staging-sync-catalogo.sql` (idempotente).
- Fixture generado con `node scripts/generate-catalog-fixture.mjs <uploads>` desde `supabase/seed/legacy_products.csv` + fotos identificadas (`scripts/catalog-mapping.mjs`).
- Fotos: originales en `assets/products/`; variantes servidas con `node scripts/optimize-product-images.mjs` → `apps/web/public/img/products/` (loader `lib/image-loader.ts`).
- 50 productos activos, 16 con foto. Marca mayoritaria: **Sulderm**. Hay productos nuevos (Mary & May) que no están en la base de junio → re‑exportar del sitio en vivo.

## Entorno local

Ver `docs/SETUP-LOCAL.md`. Doble clic en `iniciar-sitio.cmd` levanta `localhost:3000`. Falta (dueño): elegir Supabase en la nube (recomendado, 8 GB de RAM) o instalar WSL + Docker.

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
