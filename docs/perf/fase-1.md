# Performance — Fase 1 (baseline)

Fecha: 2026-11-18 · Commit: primer commit de F1 · Entorno: build de producción local (`next build && next start`), Lighthouse CI 3 corridas, mobile simulado (412×823, throttling simulado).

| Métrica                 | Resultado | Presupuesto (docs/11) | Estado |
| ----------------------- | --------- | --------------------- | ------ |
| Lighthouse Performance  | 100       | ≥ 90                  | ✅     |
| Accesibilidad           | 100       | ≥ 95                  | ✅     |
| Best practices          | 100       | —                     | ✅     |
| SEO                     | 100       | ≥ 95                  | ✅     |
| LCP                     | 944 ms    | < 2.000 ms            | ✅     |
| TBT                     | 90 ms     | < 200 ms              | ✅     |
| CLS                     | 0         | < 0,05                | ✅     |
| JS total cliente (gzip) | 188,6 KB  | alarma 200 KB         | ✅     |

Notas:

- La página es un placeholder estático (`○ /`): sin catálogo, sin imágenes ni WebGL. Es la línea base del framework (React 19 + Next 16.4 + Tailwind + fuentes).
- El JS total incluye el runtime de React/Next; el límite de 200 KB es una alarma de regresión. El presupuesto de 120 KB por ruta se medirá con `resource-summary` de Lighthouse cuando existan rutas reales (F3).
- Pendiente: WebPageTest desde AR (requiere deploy a staging) y regresión de queries (requiere Supabase local con Docker).
