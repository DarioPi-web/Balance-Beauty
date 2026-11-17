# Balance Beauty — Replataforma (Next.js + Supabase + Vercel)

Reconstrucción desde cero de **balancebeauty.com.ar**, hoy un WordPress 6.8 + WooCommerce 10.7 + Elementor Pro + Astra alojado en Hostinger, hacia un stack moderno, propio y mantenible.

> Fuente de contexto: backup completo del hosting (`archive.zip` → `public_html` + backup UpdraftPlus de la base del 28/06/2026). El análisis está en [docs/00-auditoria-sitio-actual.md](docs/00-auditoria-sitio-actual.md).

## Mapa de la documentación

| #   | Documento                                                                    | Para qué sirve                                                                                         |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 00  | [Auditoría del sitio actual](docs/00-auditoria-sitio-actual.md)              | Qué hay hoy, qué se migra, qué se descarta                                                             |
| 01  | [Visión, alcance y requisitos](docs/01-vision-alcance-requisitos.md)         | Objetivos de negocio, MVP vs. fases siguientes, requisitos funcionales y no funcionales                |
| 02  | [Arquitectura](docs/02-arquitectura.md)                                      | Stack, diagrama, estructura de carpetas, patrones y convenciones                                       |
| 03  | [Modelo de datos (Supabase)](docs/03-modelo-de-datos.md)                     | Esquema Postgres, RLS, funciones, storage                                                              |
| 04  | [Fases y roadmap](docs/04-fases-roadmap.md)                                  | Fases, hitos, criterios de salida, cronograma                                                          |
| 05  | [Backlog de tareas](docs/05-backlog-tareas.md)                               | Tareas accionables con checkbox, por fase                                                              |
| 06  | [Pendientes, decisiones y riesgos](docs/06-pendientes-decisiones-riesgos.md) | Preguntas abiertas al cliente, ADRs, riesgos                                                           |
| 07  | [Dependencias y servicios](docs/07-dependencias-servicios.md)                | Paquetes npm, servicios SaaS, variables de entorno, costos                                             |
| 08  | [Skills, herramientas y equipo](docs/08-skills-herramientas-equipo.md)       | Plugins/skills de Claude Code, MCPs, roles humanos                                                     |
| 09  | [Migración de datos y SEO](docs/09-migracion-seo.md)                         | Migración de catálogo e imágenes, redirecciones 301, cutover DNS                                       |
| 10  | [Seguridad, legal y QA](docs/10-seguridad-legal-qa.md)                       | Seguridad, normativa argentina, testing, checklist de lanzamiento                                      |
| 11  | [Performance y costos](docs/11-performance-y-costos.md)                      | Presupuestos de velocidad, tests de performance, optimización de queries y costos de Supabase y Vercel |
| 12  | [Deploy y entornos](docs/12-deploy-y-entornos.md)                            | **Sin deploys automáticos**: gate de fin de fase y aprobación del dueño                                |
| 13  | [VPS Contabo — integraciones](docs/13-vps-contabo-integraciones.md)          | Servicio de integraciones (Andreani, Correo Argentino, colas, imágenes, backups)                       |
| 14  | [Frontend, UX/UI y WebGL](docs/14-frontend-ux-ui-webgl.md)                   | Investigación del nicho, concepto creativo, UX por página, WebGL y motion                              |
| 15  | [Responsive y app instalable](docs/15-responsive-y-app-instalable.md)        | Reglas responsive, matriz de dispositivos con tests, PWA para Android/iOS                              |
| 16  | [SEO y posicionamiento en IAs](docs/16-seo-y-posicionamiento-en-ia.md)       | Frameworks y SEO, Google + IAs (GEO), keywords por nivel, plan de contenido, KPIs                      |

Archivos de soporte:

- **[docs/SETUP-LOCAL.md](docs/SETUP-LOCAL.md) — cómo levantar el sitio en esta PC** (doble clic en `iniciar-sitio.cmd`).
- [docs/ESTADO.md](docs/ESTADO.md) — punto de retorno: dónde quedó el desarrollo y qué sigue.
- [CLAUDE.md](CLAUDE.md) — reglas del proyecto para sesiones de Claude Code.
- [.env.example](.env.example) — variables de entorno necesarias.
- [supabase/seed/legacy_products.csv](supabase/seed/legacy_products.csv) — catálogo exportado del WooCommerce actual (53 productos) para seed/migración.

## Resumen ejecutivo

- **Hoy**: tienda chica (53 productos dermocosméticos, 1 sola categoría "Sin categorizar"), 13 plugins (varios premium), 0 pedidos en la base al momento del backup, pago con **Getnet**, seguimiento de envío manual a **Correo Argentino / Andreani**, promociones de **cuotas sin interés** y **10% off por transferencia/QR**, enlace a **Mayorista** sin implementar.
- **Objetivo**: e‑commerce propio en **Next.js (App Router) + Supabase (Postgres/Auth/Storage) + Vercel**, con panel de administración a medida, pagos online (Getnet y/o Mercado Pago), cálculo de envío, SEO preservado y cumplimiento legal argentino (Botón de arrepentimiento, Ley 27.743 de transparencia fiscal, Ley 25.326).
- **Infraestructura**: Vercel (frontend, sin deploys automáticos), Supabase (datos) y un **VPS Contabo** propio para integraciones de envío, colas, imágenes y backups.
- **Diferencial**: diseño de autor con concepto "Equilibrio" y WebGL medido (solo donde aporta), navegación por preocupación de la piel y rutinas.
- **Esfuerzo estimado**: 13–15 semanas con 1 dev full‑stack senior + diseño part‑time (incluye diseño UX/UI ampliado, WebGL y VPS); 9–10 semanas con 2 devs. Detalle en [04](docs/04-fases-roadmap.md).
- **Bloqueantes principales**: elección de pasarela, credenciales de APIs de envío, contenido faltante (26 productos sin descripción, 15 sin imagen, 2 sin precio), validación regulatoria de productos magistrales. Ver [06](docs/06-pendientes-decisiones-riesgos.md).
