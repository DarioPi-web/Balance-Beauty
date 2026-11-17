# 04 — Fases y roadmap

Estimación para **1 dev full‑stack senior** + diseñador/a UI part‑time + cliente disponible para validar. Con 2 devs (uno en catálogo/checkout/WebGL, otro en admin/VPS) el total baja a ~9–10 semanas.

**Regla de oro**: cada fase termina en un **gate de deploy** ([12](12-deploy-y-entornos.md)). Nada sale a staging ni a producción sin que el dueño del proyecto lo apruebe. 🚦 = punto donde se pregunta "¿Hacemos deploy?".

```
Semana          1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
F0 Descubrim.   ███
F1 Fundación        ████                                                    🚦 (staging técnico)
F2 UX/UI+motion ░░░█████████████                                           (diseño, sin deploy)
F3 Catálogo                 ████████                                        🚦
F3b WebGL hero                  ████████                                    🚦 (junto con F3 o aparte)
V  VPS integr.          ████        ████████                                🚦 (VPS staging)
F4 Checkout+Pagos                       ████████████                        🚦
F5 Cuenta                                       ████                        🚦
F6 Admin                                ████████████████                    🚦
F7 Contenido+SEO                                        ████████            🚦
P  Performance        ─ ─ ─ ─ ─ continuo en cada fase ─ ─ ─ ─ ─ ████        (auditoría final)
F8 QA+Lanzamiento                                               ████████    🚦🚦 (staging final → producción)
F9 Post‑lanzam.                                                         ►
```

---

## F0 — Descubrimiento y decisiones (semana 1)

- Workshop con cliente; resolver preguntas **bloqueantes** de [06](06-pendientes-decisiones-riesgos.md).
- Definir taxonomía: categorías, **preocupaciones**, líneas, activos.
- Datos del VPS Contabo (plan, región, SO, accesos) y credenciales de transportistas.
- Alta de cuentas (GitHub, Vercel, Supabase, Resend, Sentry, pasarela sandbox).
- Rotar credenciales expuestas en el zip.

**Salida**: ADRs aprobados, cuentas creadas, backlog priorizado. _Sin deploy._

## F1 — Fundación técnica (semana 2)

- Monorepo (pnpm + Turborepo), Next.js 16, TS estricto, Tailwind v4, shadcn/ui, lint/format/hooks.
- Supabase local + staging; migraciones `0001_init` + taxonomía extendida (preocupaciones, activos, rutina); RLS; seed.
- `vercel.json` con **deploys automáticos desactivados**; workflows manuales `deploy.yml` / `deploy-vps.yml` con environments protegidos.
- CI completo (lint, typecheck, tests, build, **Lighthouse CI + size‑limit** con presupuestos de [11](11-performance-y-costos.md)).
- Sentry, Speed Insights.

**Salida**: CI verde con presupuestos de performance activos. 🚦 _¿Primer deploy técnico a staging?_

## F2 — UX/UI, design system y motion (semanas 1–4, en paralelo)

Detalle completo en [14](14-frontend-ux-ui-webgl.md) §8: benchmark e investigación, journey, arquitectura de información, moodboard + style tiles, wireframes, **spike técnico del hero WebGL medido en celular real**, UI final, motion spec, tokens, guía de voz, test de usabilidad con 5 usuarias.

**Salida**: diseño aprobado + tokens implementados + go/no‑go del WebGL.

## V — VPS de integraciones (semanas 3 y 6–8)

- V1 (sem. 3): hardening del VPS, Docker, Caddy, Uptime Kuma, backups `pg_dump` nocturnos.
- V2 (sem. 6–8): servicio `integrations` (Hono + BullMQ + Redis), proveedores Andreani y MiCorreo (sandbox), caché de cotizaciones, firma HMAC, tracking sync, procesamiento de imágenes, feeds.

**Salida**: cotización real por CP desde el checkout de staging con fallback probado. 🚦 _¿Deploy del VPS a staging/prod?_

## F3 — Catálogo público (semanas 4–5) + F3b WebGL (semanas 5–6)

- Layout, home, listados por categoría/preocupación/línea, ficha completa (activos, modo de uso, rutina), búsqueda, quiz "Armá tu rutina" (versión base).
- Catálogo 100 % estático con revalidación on‑demand; imágenes con loader propio.
- F3b: hero "Equilibrio" en WebGL con tiers, póster LCP, pausa fuera de vista; bloque "Activo protagonista"; transiciones con View Transitions.

**Salida**: catálogo en presupuesto de performance (Lighthouse ≥ 90, home ≥ 85 con WebGL). 🚦 _¿Deploy a staging para revisar diseño en dispositivos reales?_

## F4 — Carrito, checkout y pagos (semanas 6–8)

- Carrito persistente, barra de progreso a 12 cuotas / envío gratis, checkout 1 página con cotización del VPS, `place_order`, pasarela sandbox + webhook idempotente, transferencia/QR, emails.
- **k6** de checkout y regresión de queries.

**Salida**: compra E2E sandbox, p95 `place_order` < 300 ms. 🚦

## F5 — Cuenta de cliente (semana 8)

Login/registro, pedidos con tracking (alimentado por el VPS), direcciones, datos, baja. 🚦

## F6 — Panel de administración (semanas 6–10)

Dashboard (vista materializada), productos (tabla editable, activos, preocupaciones, imágenes → procesadas en el VPS), pedidos (generar etiqueta Andreani/Correo desde el admin), promociones, banners, FAQ, envíos, ajustes, audit log. 🚦

## F7 — Contenido, SEO y migración (semanas 10–11)

Contenido faltante, fotos nuevas, migración de imágenes (vía worker del VPS), redirecciones, sitemap, JSON‑LD, consentimiento de cookies. 🚦

## P — Performance y costos (continuo + auditoría semana 12)

En cada fase: reporte `docs/perf/fase-N.md`. Auditoría final: WebPageTest desde AR, k6 completo, Advisors de Supabase, revisión de _Usage_ de Vercel y Supabase, Spend Management.

## F8 — QA, legal y lanzamiento (semanas 12–14)

E2E completos, a11y, seguridad, legal, pasarela productiva, compra real.
🚦 _¿Deploy final a staging?_ → validación del dueño → 🚦 _¿Promovemos a producción y hacemos el cambio de DNS?_ → monitoreo 72 h.

## F9 — Post‑lanzamiento (semana 15 →)

Hypercare 2 semanas; fase 2 (mayorista, reseñas, ARCA en el VPS, blog "Aprendé", carrito abandonado). Cada entrega con su propio gate.

## Hitos y aprobaciones del cliente

| Hito                                      | Semana | Aprobación                     |
| ----------------------------------------- | ------ | ------------------------------ |
| H1 Decisiones cerradas                    | 1      | ADRs firmados                  |
| H2 Style tile + go/no‑go WebGL            | 3      | Elección de dirección visual   |
| H3 Diseño final aprobado                  | 4      | Figma/prototipo                |
| H4 Catálogo + hero en staging             | 6      | 🚦 Demo en dispositivos reales |
| H5 Compra E2E sandbox con cotización real | 8      | 🚦 Demo                        |
| H6 Admin operativo                        | 10     | 🚦 Capacitación                |
| H7 Contenido completo                     | 11     | Checklist de contenido         |
| H8 Auditoría de performance y costos OK   | 12     | Reporte                        |
| H9 Go‑live                                | 14     | 🚦 Go/No‑Go                    |
