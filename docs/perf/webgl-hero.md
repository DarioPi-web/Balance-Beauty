# Performance — Hero WebGL "Equilibrio"

Fecha: 2026-11-18 · Build de producción local · Lighthouse CI mobile (3 corridas) · Playwright Chromium headless (render por CPU/SwiftShader, peor caso).

## Resultado final

| Métrica                       | Resultado    | Presupuesto    | Estado |
| ----------------------------- | ------------ | -------------- | ------ |
| Lighthouse Performance (home) | 98–99        | ≥ 85 con WebGL | ✅     |
| LCP                           | 933–1.076 ms | < 2.500 ms     | ✅     |
| TBT                           | 95–181 ms    | < 200 ms       | ✅     |
| CLS                           | 0            | < 0,05         | ✅     |
| Chunk WebGL (gzip)            | **2,8 KB**   | ≤ 180 KB       | ✅     |
| JS total cliente (gzip)       | 198,9 KB     | alarma 200 KB  | ✅     |
| FPS headless por CPU          | 53,7–56,8    | > 20 (CPU)     | ✅     |
| Tarea larga máxima            | 63–69 ms     | < 250 ms       | ✅     |

## Iteraciones

| Cambio                                                                          | Efecto                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------- |
| WebGL2 directo en vez de three.js + R3F                                         | ~190 KB → 2,8 KB de JS para el efecto          |
| Campo 1/r² → gaussiano                                                          | Normales suaves (el centro se veía gris)       |
| Normal por diferencias finitas (5 evaluaciones/píxel) → gradiente analítico (1) | 18,4 → 56,8 fps en CPU                         |
| Resolución interna 1,25× (gama alta) / 0,75× (gama baja)                        | Menos GPU/batería; no se nota en gotas difusas |
| Compilación sincrónica → `KHR_parallel_shader_compile`                          | TBT 358 → 95–181 ms                            |
| Retiro de `/estilos`                                                            | JS total 204,6 → 198,9 KB                      |

## Comportamiento por dispositivo

- **Movimiento reducido / ahorro de datos / 2G / sin WebGL2** → solo póster CSS (test automático).
- **Táctil, ≤ 4 núcleos o ≤ 3 GB de RAM** → 0,75× y 30 fps máx.
- **Desktop potente** → hasta 1,25× y 60 fps.
- Si el frame promedio supera 40 ms de forma sostenida: baja resolución; si sigue lento, se apaga y queda el póster.
- Se pausa fuera de la vista y con la pestaña oculta.

Pendiente: medir en dispositivos reales (iPhone, Android gama media y baja, in‑app de Instagram) al cerrar F3 (R‑13).
