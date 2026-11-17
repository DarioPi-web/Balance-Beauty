# Estado del proyecto — punto de retorno

> Archivo de traspaso: se actualiza en cada commit. Si una sesión se corta (límite de uso, cierre de la app), una sesión nueva retoma leyendo esto primero, luego `CLAUDE.md` y `docs/05-backlog-tareas.md`.

**Última actualización:** 2026-11-18 · F3 catálogo (en curso)

## Dónde estamos

| Fase                | Estado                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0 Descubrimiento   | Plan completo en `docs/`. Preguntas abiertas en `docs/06`                                                                                                                                                                                                                                                                                                         |
| F1 Fundación        | ✅ código y CI. Falta (dueño): Docker Desktop, cuentas GitHub/Vercel/Supabase                                                                                                                                                                                                                                                                                     |
| F2 Diseño           | ✅ Dirección B "Botánica clínica" aplicada (ADR‑017). Pendiente: wireframes/UI completa del resto de pantallas                                                                                                                                                                                                                                                    |
| F3b WebGL           | ✅ Hero "Equilibrio" (ADR‑018, `docs/perf/webgl-hero.md`)                                                                                                                                                                                                                                                                                                         |
| F3 Catálogo         | 🟡 Home, `/tienda` (filtros sin hidratar tarjetas), `/categoria/[slug]`, `/preocupacion/[slug]`, `/producto/[slug]` (84 páginas estáticas), sitemap, robots, JSON‑LD, imágenes AVIF pre‑generadas (ADR‑009). Datos desde `lib/catalog/fixture.json` (sin Docker). Perf en `docs/perf/fase-3-catalogo.md` (presupuestos de laboratorio ajustados: avisar al dueño) |
| F4 Carrito/checkout | 🟡 Carrito completo (cookie firmada ADR‑019, mini‑carrito, `/carrito`, rutina al carrito). **Bloqueado:** checkout y pago → decisión de pasarela (Q‑01) y base de datos (Supabase)                                                                                                                                                                                |

## Próximos pasos (en orden)

1. Cerrar F3: páginas de línea y de activos (S‑03, requieren contenido revisado por profesional), regresión visual (R‑08), View Transitions (F3‑13). Hechos: búsqueda, marcas, quiz `/rutina`, error.tsx, axe.
   - **Antes del checkout:** bajar JS inicial (home 193 KB, carrito 194 KB; tope 195 KB). Candidatos: unificar islas cliente del header/barra inferior, revisar íconos lucide y `cn`.
2. Gate F3 → preguntar al dueño si deploy a staging (requiere cuentas).
3. F4 carrito + checkout (requiere decisión de pasarela Q‑01).

## Datos del catálogo

- Fuente actual: `CATALOG_SOURCE` sin definir → fixture generado con `node scripts/generate-catalog-fixture.mjs <uploads>` desde `supabase/seed/legacy_products.csv` + fotos identificadas (`scripts/catalog-mapping.mjs`).
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
