# 12 — Política de deploy y entornos

## Regla principal

**Nada se despliega automáticamente.** Se trabaja y se prueba en local; al **terminar cada fase** se corre el gate de calidad y se **pregunta al dueño del proyecto** si se hace deploy. Solo con un "sí" explícito se despliega, primero a staging y después a producción.

Aplica a los tres destinos: **Vercel** (frontend), **Supabase** (migraciones) y **VPS Contabo** (servicios de integración).

## Configuración que lo garantiza

### Vercel

`vercel.json`:

```json
{
  "git": { "deploymentEnabled": false },
  "regions": ["gru1"]
}
```

- Con `deploymentEnabled: false` el push a GitHub **no** genera builds ni previews.
- Los deploys se hacen solo con el workflow manual `deploy.yml` (GitHub Actions, `workflow_dispatch`) o con la CLI:
  - Staging: `vercel build` + `vercel deploy --prebuilt` (genera una URL de preview protegida).
  - Producción: `vercel build --prod` + `vercel deploy --prebuilt --prod` **del mismo commit** validado en staging (el SHA queda registrado en el changelog de la fase).
- Environments de GitHub `staging` y `production` con **reviewer obligatorio** (el dueño del proyecto): el job no corre sin aprobación.
- Deployment Protection activado en previews (solo con login de Vercel o link con bypass).

### Supabase

- Las migraciones **no** se aplican en CI automáticamente. El workflow `deploy.yml` tiene un paso `supabase db push` contra staging/prod que depende de la misma aprobación.
- Antes de `db push` a prod: backup manual (`pg_dump`) guardado en el VPS.

### VPS

- Imágenes Docker se construyen en CI y se publican en GHCR; el VPS solo actualiza con `docker compose pull && docker compose up -d` disparado por el workflow manual `deploy-vps.yml` (SSH con clave dedicada) tras aprobación.

## CI (sí corre siempre, no despliega)

En cada push/PR: lint, typecheck, unit tests, pgTAP, build, Lighthouse CI local, size‑limit, E2E contra `next start` local + Supabase local en Docker. CI es gratis/barato y no consume Vercel.

## Gate de fin de fase (checklist antes de preguntar)

1. Todas las tareas P0 de la fase cerradas en [05](05-backlog-tareas.md).
2. CI en verde en `main`.
3. Reporte de performance `docs/perf/fase-N.md` dentro de presupuesto ([11](11-performance-y-costos.md)).
4. Migraciones revisadas (sin pérdida de datos) y probadas con `supabase db reset` local.
5. Changelog de la fase (`CHANGELOG.md`): qué cambió, riesgos, cómo hacer rollback.
6. Estimación de impacto en costos (nuevas funciones, crons, storage).
7. **Pregunta al dueño**: "Fase N lista. ¿Hacemos deploy a staging?" → validación del dueño en la URL de staging → "¿Promovemos a producción?".

## Entornos

| Entorno    | Frontend                                | Base                               | Integraciones                                      | Pagos      | Quién despliega              |
| ---------- | --------------------------------------- | ---------------------------------- | -------------------------------------------------- | ---------- | ---------------------------- |
| Local      | `pnpm dev` / `pnpm build && pnpm start` | Supabase local (Docker)            | Docker Compose local del servicio de integraciones | sandbox    | dev, libre                   |
| Staging    | Preview de Vercel (manual, protegida)   | Proyecto Supabase `staging` (Free) | VPS: stack `staging` en puerto/subdominio aparte   | sandbox    | workflow manual + aprobación |
| Producción | Vercel prod (`balancebeauty.com.ar`)    | Supabase `prod` (Pro, `sa-east-1`) | VPS: stack `prod`                                  | producción | workflow manual + aprobación |

## Rollback

- Frontend: `vercel rollback` (instantáneo, vuelve al deploy anterior).
- Base: migraciones con script `down` documentado; si no es posible, restaurar backup previo al push.
- VPS: tag de imagen anterior → `docker compose up -d`.

## Hotfixes

Un bug crítico en producción (pagos caídos, checkout roto) **también requiere aprobación**, pero se usa el atajo: fix → CI → "¿Deploy de hotfix?" → producción directa con preview validada.
