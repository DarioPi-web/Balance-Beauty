# 07 — Dependencias y servicios

> Versiones: fijar las últimas estables al momento del `pnpm install` y bloquearlas con `pnpm-lock.yaml`. Renovate/Dependabot semanal para actualizaciones.

## 1. Herramientas de desarrollo (máquina local)

| Herramienta           | Versión | Instalación (Windows)                                                   |
| --------------------- | ------- | ----------------------------------------------------------------------- |
| Git                   | última  | `winget install Git.Git`                                                |
| Node.js               | 22 LTS  | `winget install OpenJS.NodeJS.LTS`                                      |
| pnpm                  | 10.x    | `corepack enable` y luego `corepack prepare pnpm@latest --activate`     |
| Docker Desktop        | última  | `winget install Docker.DockerDesktop` (necesario para `supabase start`) |
| Supabase CLI          | última  | `pnpm add -D supabase` (se usa vía `pnpm supabase …`)                   |
| Vercel CLI            | última  | `pnpm add -g vercel`                                                    |
| VS Code + extensiones | —       | ESLint, Prettier, Tailwind CSS IntelliSense, Supabase, Playwright       |

## 2. Dependencias npm

### Runtime

```bash
pnpm add next react react-dom
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add zod react-hook-form @hookform/resolvers
pnpm add @t3-oss/env-nextjs server-only
pnpm add tailwind-merge clsx class-variance-authority lucide-react tw-animate-css
pnpm add sonner vaul cmdk embla-carousel-react
pnpm add @tanstack/react-table
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit
pnpm add resend @react-email/components
pnpm add mercadopago                        # si ADR-002 = Mercado Pago
pnpm add @upstash/ratelimit @upstash/redis
pnpm add @sentry/nextjs
pnpm add @vercel/analytics @vercel/speed-insights
pnpm add @marsidev/react-turnstile
pnpm add papaparse                          # import/export CSV admin
pnpm add browser-image-compression          # compresión de imágenes en uploader
pnpm add date-fns
pnpm add isomorphic-dompurify               # sanitizar HTML de descripciones
pnpm add nuqs                               # estado de filtros en la URL

# Motion y WebGL (ver docs/14)
pnpm add three @react-three/fiber @react-three/drei
pnpm add gsap @gsap/react                   # ScrollTrigger incluido
pnpm add motion                             # microinteracciones (ex Framer Motion)
pnpm add lenis                              # smooth scroll solo en home/landings
pnpm add detect-gpu                         # tiers de dispositivo
```

### Servicio de integraciones del VPS (`apps/integrations`)

```bash
pnpm add hono @hono/node-server @hono/zod-validator zod
pnpm add bullmq ioredis
pnpm add sharp                              # pipeline de imágenes
pnpm add postgres                           # cliente SQL vía pooler (o @supabase/supabase-js)
pnpm add pino pino-pretty @sentry/node
pnpm add opossum                            # circuit breaker hacia APIs de transportistas
pnpm add -D tsx tsup vitest @types/node
```

Infra del VPS (Docker): `caddy:2`, `redis:7-alpine`, `louislam/uptime-kuma`, `amir20/dozzle`, `restic` para backups.
Componentes shadcn (se copian al repo, no son dependencia): `pnpm dlx shadcn@latest init` y luego `add button input label form select checkbox radio-group textarea sheet dialog dropdown-menu navigation-menu command table tabs badge card skeleton sonner breadcrumb pagination carousel accordion separator avatar tooltip popover calendar`.

### Desarrollo

```bash
pnpm add -D typescript @types/node @types/react @types/react-dom
pnpm add -D tailwindcss @tailwindcss/postcss
pnpm add -D eslint eslint-config-next prettier prettier-plugin-tailwindcss
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm add -D supabase
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
pnpm add -D @playwright/test @axe-core/playwright
pnpm add -D react-email                     # preview de plantillas
pnpm add -D tsx                             # scripts de migración
pnpm add -D @lhci/cli                       # Lighthouse CI
pnpm add -D size-limit @size-limit/preset-app @next/bundle-analyzer
pnpm add -D turbo                           # monorepo
pnpm add -D @types/three
# k6 se instala como binario (winget install k6 / imagen grafana/k6 en CI), no por npm
```

### Scripts `package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:diff": "supabase db diff -f",
    "db:push": "supabase db push",
    "db:types": "supabase gen types typescript --local > lib/supabase/database.types.ts",
    "email:dev": "email dev --dir lib/email/templates",
    "migrate:products": "tsx scripts/migrate-products.ts",
    "migrate:images": "tsx scripts/migrate-images.ts"
  }
}
```

## 3. Servicios externos

| Servicio                                        | Uso                                     | Plan sugerido           | Costo aprox. (USD/mes) |
| ----------------------------------------------- | --------------------------------------- | ----------------------- | ---------------------- |
| Vercel                                          | Hosting, CDN, previews, cron, analytics | Pro (1 seat)            | 20                     |
| Supabase                                        | Postgres, Auth, Storage, PITR           | Pro (+ PITR opcional)   | 25 (+ add‑ons)         |
| Resend                                          | Emails transaccionales                  | Free (3.000/mes) → Pro  | 0–20                   |
| Sentry                                          | Errores                                 | Developer (free)        | 0                      |
| Upstash Redis                                   | Rate limiting                           | Free / pay‑as‑you‑go    | 0–5                    |
| Cloudflare Turnstile                            | Antispam                                | Free                    | 0                      |
| Mercado Pago / Getnet                           | Pagos                                   | Comisión por venta      | % por transacción      |
| Correo Argentino / Andreani                     | Envíos (fase 2 API)                     | Cuenta corporativa      | por envío              |
| Google Workspace / dominio                      | Email del dominio                       | existente               | —                      |
| GitHub                                          | Repo + Actions                          | Free / Team             | 0–4                    |
| Figma                                           | Diseño                                  | Professional (1 editor) | 15                     |
| VPS Contabo                                     | Integraciones, colas, imágenes, backups | ya disponible           | costo actual del VPS   |
| Object storage offsite (Backblaze B2 / Contabo) | Backups cifrados                        | pay‑as‑you‑go           | 1–5                    |

**Total fijo estimado**: ~USD 60–90/mes + VPS existente (vs. hosting Hostinger + licencias premium de 6 plugins). Con deploys manuales, catálogo estático e imágenes pre‑generadas, el objetivo es **no pagar excedentes** de Vercel ni Supabase (ver [11](11-performance-y-costos.md)).

## 4. Variables de entorno

Ver [.env.example](../.env.example). Regla: todo lo que no empiece con `NEXT_PUBLIC_` es **solo servidor**; `SUPABASE_SERVICE_ROLE_KEY` nunca se importa desde un componente cliente (`server-only`).

| Variable                                                                                                                                                         | Entorno | Público |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| `NEXT_PUBLIC_SITE_URL`                                                                                                                                           | todos   | sí      |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o publishable key)                                                                                 | todos   | sí      |
| `SUPABASE_SERVICE_ROLE_KEY` (o secret key)                                                                                                                       | todos   | **no**  |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`                                                                   | todos   | parcial |
| `GETNET_CLIENT_ID`, `GETNET_CLIENT_SECRET`, `GETNET_WEBHOOK_SECRET`, `GETNET_ENV`                                                                                | todos   | no      |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                                                                                                   | todos   | no      |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                                             | todos   | no      |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                                                                                         | todos   | parcial |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                                                                                                                | todos   | no      |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN`                                                                                              | prod    | parcial |
| `CRON_SECRET`, `REVALIDATE_SECRET`                                                                                                                               | todos   | no      |
| `INTEGRATIONS_URL`, `INTEGRATIONS_HMAC_SECRET` (Vercel → VPS)                                                                                                    | todos   | no      |
| En el VPS: `SUPABASE_DB_POOLER_URL`, `SUPABASE_VPS_SECRET_KEY`, `ANDREANI_USER/PASSWORD/CONTRACT`, `MICORREO_USER/PASSWORD/CUSTOMER_ID`, `REDIS_URL`, `RESTIC_*` | VPS     | no      |
