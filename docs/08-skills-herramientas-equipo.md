# 08 — Skills, herramientas y equipo

## 1. Plugins y skills de Claude Code recomendados

Disponibles en el directorio de plugins de Anthropic (claude.ai). Instalarlos antes de empezar F1.

| Plugin              | Publicador         | Qué aporta                                                                                                                                                                                                                                                                            | Fases         |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Vercel**          | Vercel (partner)   | Skills `nextjs`, `next-best-practices`, `next-cache-components`, `react-best-practices`, `shadcn`, `routing-middleware`, `env-vars`, `deployments-cicd`, `vercel-functions`, `vercel-firewall`, `cdn-caching`, `verification` + MCP de Vercel + comandos `/deploy`, `/env`, `/status` | F1–F8         |
| **Supabase**        | Supabase (partner) | Skills `supabase` y `supabase-postgres-best-practices` + MCP de Supabase (migraciones, SQL, logs, advisors, tipos)                                                                                                                                                                    | F1, F3–F6, F8 |
| **frontend-design** | Anthropic          | Diseño UI de calidad en código (evita el look genérico)                                                                                                                                                                                                                               | F2–F3         |
| **Design**          | Anthropic          | `design-system`, `accessibility-review`, `ux-copy`, `design-critique`, `design-handoff` (+ MCP de Figma)                                                                                                                                                                              | F2, F8        |
| **SEO Audit**       | Comunidad          | `technical-seo-code-audit`, `seo-page-audit`, `seo-fix-plan`, revisión de Search Console                                                                                                                                                                                              | F7–F9         |

Uso específico de las skills del plugin de Vercel para los nuevos frentes: `next-cache-components` y `cdn-caching` (catálogo estático, [11](11-performance-y-costos.md)), `vercel-cli` y `deployments-cicd` (workflows manuales, [12](12-deploy-y-entornos.md)), `vercel-firewall` (bots), `verification`. Del plugin de Supabase: `supabase-postgres-best-practices` para índices, RLS performante y revisión de queries. `frontend-design` + `Design` para el plan de [14](14-frontend-ux-ui-webgl.md).

> Nota: el comando `/deploy` del plugin de Vercel **no se usa sin aprobación explícita del dueño** (ADR‑010).

Opcionales: _RLS Schema Explorer for Supabase_ (lectura de RLS antes de escribir queries; redundante si se instala el plugin oficial de Supabase).

### Skills ya incluidas en Claude Code útiles para este proyecto

| Skill / comando    | Uso                                                           |
| ------------------ | ------------------------------------------------------------- |
| `/init`            | Regenerar `CLAUDE.md` cuando el código exista                 |
| `/code-review`     | Revisión de cada PR (nivel medium/high)                       |
| `/security-review` | Antes de go‑live y en PRs de auth/pagos/RLS                   |
| `/simplify`        | Limpieza de código tras features grandes                      |
| `run`              | Levantar la app y verificar cambios en el navegador integrado |
| `dataviz`          | Gráficos del dashboard admin                                  |
| `xlsx`             | Leer planillas de precios/stock del cliente para importar     |

### MCP servers

| MCP                       | Uso                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Supabase (vía plugin)     | Aplicar migraciones, ejecutar SQL de solo lectura, ver advisors de seguridad/performance, generar tipos |
| Vercel (vía plugin)       | Deployments, logs, variables de entorno                                                                 |
| Figma (vía plugin Design) | Leer diseños para implementar                                                                           |
| Navegador integrado       | QA visual, flujos de checkout en preview                                                                |

> **Seguridad con MCP**: conectar el MCP de Supabase **solo al proyecto de staging** o en modo read‑only para producción. Nunca darle la service role de prod a una herramienta automatizada.

## 2. Competencias técnicas necesarias (equipo humano)

| Área                     | Nivel        | Detalle                                                                                                       |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------- |
| Next.js App Router       | Senior       | RSC, Server Actions, caché/revalidación, middleware, metadata, ISR                                            |
| React + TypeScript       | Senior       | Tipado estricto, hooks, formularios, accesibilidad                                                            |
| Postgres / Supabase      | Semi‑senior+ | Modelado, RLS, funciones `plpgsql`, transacciones, índices, pg_cron, Auth hooks                               |
| Pagos AR                 | Semi‑senior  | Mercado Pago / Getnet: preferencias, webhooks, conciliación, reembolsos                                       |
| UI/UX e‑commerce         | Senior       | Investigación, arquitectura de información, mobile‑first, checkout, design system, Figma, tests de usabilidad |
| Creative dev / WebGL     | Semi‑senior+ | three.js / R3F, GLSL (SDF, metaballs, refracción), GSAP, performance en GPU móviles                           |
| Performance web          | Semi‑senior+ | Core Web Vitals, caching de Next.js, Lighthouse CI, k6, análisis de queries Postgres                          |
| Linux / Docker (VPS)     | Semi‑senior  | Hardening Ubuntu, Docker Compose, Caddy, Redis/BullMQ, backups con restic                                     |
| SEO técnico              | Semi‑senior  | Migraciones, 301, schema.org, CWV                                                                             |
| QA                       | Semi‑senior  | Playwright, pruebas exploratorias, cross‑device                                                               |
| DevOps liviano           | Semi‑senior  | Vercel, GitHub Actions, DNS, SPF/DKIM/DMARC                                                                   |
| Legal/Contable (externo) | —            | Defensa del consumidor, datos personales, ANMAT, facturación                                                  |

## 3. Roles y dedicación sugerida

| Rol                                 | Dedicación             | Responsabilidades                                   |
| ----------------------------------- | ---------------------- | --------------------------------------------------- |
| Tech lead / full‑stack              | 100 %                  | Arquitectura, desarrollo, code review, deploy       |
| Full‑stack #2 (opcional)            | 100 % F3–F6            | Admin y cuenta de cliente en paralelo               |
| Diseñador/a UI                      | 30–50 % F2, 10 % resto | Design system, pantallas, assets                    |
| Product owner (cliente)             | 10–20 %                | Decisiones, validaciones, contenido                 |
| Redactor/a + fotografía de producto | según faltantes        | 26 descripciones, 15 imágenes                       |
| Asesor legal / contador             | puntual                | Políticas, ANMAT, precio sin impuestos, facturación |

## 4. Instalación de plugins

Desde el directorio de plugins de claude.ai (o la tarjeta de instalación que ofrece Claude Code), buscando: "Vercel", "supabase", "frontend-design", "Design", "SEO Audit". Después de instalar el de Supabase y el de Vercel, autenticar sus MCP con las cuentas del proyecto (staging primero).
