# Performance — Fase 3 (catálogo)

Fecha: 2026-11-18 · Build de producción local · Lighthouse CI mobile (3 corridas, 4G lento simulado + CPU 4×).

## Resultado final

| Página                      | Perf   | A11y | SEO | LCP (lab)      | TBT        | CLS |
| --------------------------- | ------ | ---- | --- | -------------- | ---------- | --- |
| `/` (LCP = titular)         | 96–100 | 100  | 100 | 920–940 ms     | 61–233 ms  | 0   |
| `/tienda` (50 productos)    | 87–90  | 100  | 100 | 3.410–3.538 ms | 106–221 ms | 0   |
| `/preocupacion/manchas`     | 93–95  | 100  | 100 | 2.988–3.132 ms | 32–101 ms  | 0   |
| `/producto/rosatopis-serum` | 91–93  | 100  | 100 | 3.217–3.370 ms | 31–125 ms  | 0   |

E2E: 230 tests OK en 9 dispositivos + proyectos WebGL.

## Problemas encontrados y cómo se resolvieron

| Problema (primera medición)                          | Causa                                                      | Solución                                                                                                | Efecto                       |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `/tienda` perf 74–87, TBT hasta 578 ms               | Filtros como componente cliente: hidrataba las 50 tarjetas | Grilla 100 % HTML del servidor; el cliente solo oculta/reordena nodos (`data-*`) + `content-visibility` | perf 87–90, TBT 106–221 ms   |
| LCP de fotos lento                                   | `next/image` generaba AVIF en cada primer pedido           | **ADR‑009 implementado**: variantes AVIF pre‑generadas (256–1080 px) + loader propio. 640 px ≈ 12 KB    | Sin costo de optimización    |
| La foto LCP sin prioridad                            | `priority` quedó deprecado en Next 16                      | `fetchPriority="high"` + `loading="eager"`                                                              | Prioridad alta confirmada    |
| CLS 0,052 en páginas con breadcrumb                  | Reacomodo al cambiar de fuente de respaldo a fuente web    | Geist con `display: optional` y sin preload (Cormorant sigue en `swap`)                                 | CLS 0                        |
| A11y 95–96                                           | Contraste del placeholder; títulos h3 sin h2 previo        | Texto `leaf` pleno; nivel de encabezado configurable en la tarjeta                                      | A11y 100                     |
| Prefetch de 13 links visibles compitiendo con el LCP | `Link` precarga todo lo visible                            | Tarjetas y footer precargan al pasar el mouse/tocar                                                     | 8–12 pedidos menos al inicio |
| Desborde horizontal en `/tienda` (mobile)            | `<fieldset>` mide `min-content` por defecto                | `min-w-0`                                                                                               | 0 px de desborde             |

## Segunda medición (búsqueda + marcas, 5 corridas por URL)

| Página                      | Perf (mediana) | TBT (mediana) | JS inicial |
| --------------------------- | -------------- | ------------- | ---------- |
| `/`                         | 100            | 80 ms         | 186 KB     |
| `/tienda`                   | 89–90          | 128 ms        | 183 KB     |
| `/preocupacion/manchas`     | 94             | 30 ms         | 183 KB     |
| `/producto/rosatopis-serum` | 93             | 29 ms         | 183 KB     |

- En esta PC aparecen corridas aisladas con TBT 1,5–2 s **en todas las páginas, incluida la home** (que en el resto da 30–80 ms): ruido del sistema. Lighthouse CI evalúa la **corrida mediana** (`aggregationMethod: median-run`).
- El diálogo de búsqueda (cmdk, ~40 KB) se descarga solo al tocar la lupa: no suma al JS inicial.
- Control de peso: el JS **inicial por ruta** lo verifica Lighthouse CI (≤ 195 KB); `size-limit` queda como alarma del total de chunks incluidos los diferidos (270 KB).
- Lección: no correr `lhci` con el servidor de desarrollo ocupando el puerto 3000 (mide el modo dev). Usar `--collect.startServerCommand="pnpm start --port 3200"`.

## Actualización 2026‑11‑17 (checkout, F4)

- **Corrección de unidades:** varias cifras previas se leyeron en KiB desde el informe de Lighthouse; la aserción `resource-summary:script:size ≤ 195000` es en **bytes**. Además, la aserción de Lighthouse CI **no se estaba ejecutando** (error de config: `aggregationMethod` junto a `assertMatrix`); ahora va dentro de cada entrada de la matriz y se verifica.
- **Recortes:** `sonner` + `next-themes` reemplazados por `components/ui/toast.tsx` (~11 KB menos por ruta); paquete `cn` reemplazado por `clsx` + `tailwind-merge` (~1 KB más).
- **Resultado (bytes transferidos, mediana de 3):**

| Página                      | Perf | JS inicial (bytes) |
| --------------------------- | ---- | ------------------ |
| `/`                         | 99   | 185.743            |
| `/carrito`                  | 99   | 186.560            |
| `/checkout`                 | 97   | 190.507            |
| `/producto/rosatopis-serum` | 92   | 183.633            |
| `/preocupacion/manchas`     | 93   | 182.127            |
| `/tienda`                   | 90   | 182.127            |

- `size-limit` (total de chunks, incluidos diferidos): alarma subida a **280 KB** por el código del checkout que solo se descarga en esa ruta (272,5 KB hoy).

## Ajuste de presupuestos (docs/11)

- **Piso del framework**: React 19 + Next 16 ≈ 150 KB gzip de JS base; las páginas del catálogo transfieren ~180 KB. El presupuesto original de **120 KB por ruta no es alcanzable** con este stack → nuevo presupuesto **≤ 190 KB por ruta**, alarma de JS total en **230 KB**.
- **LCP de laboratorio** en páginas cuyo LCP es una foto: con 4G lento simulado + CPU 4× el piso medido es ~3,0–3,5 s → presupuesto de laboratorio **≤ 3,6 s** y Lighthouse **≥ 85**. La home se mantiene en ≤ 2,0 s y ≥ 90.
- **El presupuesto que manda es el de campo**: LCP p75 < 2,5 s con Vercel Speed Insights (usuarios reales). Se mide al primer deploy a staging/producción.

## Próximas palancas (si el campo lo pide)

1. Fotos de producto recortadas al producto (menos píxeles útiles por byte) desde el worker del VPS.
2. Mover el contador del carrito y la barra inferior a un único island cliente.
3. Evaluar `use cache: remote` / CDN para el RSC payload de la tienda si crece el catálogo (> 200 productos → paginar).
