# 10 — Seguridad, legal y QA

## 1. Seguridad

### Aplicación

- [ ] RLS habilitado en **todas** las tablas; Security Advisor de Supabase sin alertas.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en módulos `server-only`; ningún `NEXT_PUBLIC_` con secretos.
- [ ] Toda Server Action valida input con Zod y verifica sesión/rol (no confiar solo en el middleware).
- [ ] Precios y stock recalculados en servidor (`place_order`); el cliente nunca envía montos.
- [ ] Webhooks: verificación de firma + re‑consulta del pago al proveedor + idempotencia.
- [ ] Rate limiting (Upstash) en login, registro, checkout, contacto, arrepentimiento.
- [ ] Turnstile en formularios públicos.
- [ ] Headers: CSP (permitir dominios de pasarela, GA, Meta, Supabase), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] HTML de descripciones sanitizado (DOMPurify).
- [ ] Uploads: validación de tipo/tamaño; comprobantes en bucket privado con signed URLs de corta duración.
- [ ] Auth: confirmación de email, contraseñas ≥ 8, protección de contraseñas filtradas (Supabase), MFA para admins.
- [ ] Vercel Firewall / Attack Challenge Mode disponible para picos de bots.
- [ ] Dependabot/Renovate + `pnpm audit` en CI.
- [ ] `/security-review` de Claude Code antes de go‑live.

### Operación

- [ ] Supabase Pro con backups diarios + PITR; prueba de restauración documentada.
- [ ] Accesos: 2FA en GitHub, Vercel, Supabase, pasarela, registrador de dominio.
- [ ] Principio de mínimo privilegio: rol `staff` (pedidos) vs. `admin` (todo).
- [ ] Rotar credenciales del WordPress actual (expuestas en el zip).

## 2. Cumplimiento legal (Argentina) — validar con asesor

| Requisito                                                      | Norma                                                      | Implementación                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Botón de arrepentimiento** visible en home                   | Res. SCI 424/2020                                          | Link en footer → `/arrepentimiento`, form, código de trámite por email en 24 h |
| Derecho de revocación 10 días                                  | Ley 24.240 art. 34                                         | Política de devoluciones                                                       |
| Información clara de precio final                              | Ley 24.240, Res. 4/2025 y conc.                            | Precio final ARS visible; costos de envío antes de pagar                       |
| **Precio sin impuestos nacionales**                            | Ley 27.743 (Régimen de Transparencia Fiscal al Consumidor) | Mostrar en ficha/listado según definición del contador                         |
| Link a Defensa del Consumidor / libro de quejas online         | Res. 271/2020 y normativa provincial (CABA/PBA)            | Footer                                                                         |
| Datos del proveedor (razón social, CUIT, domicilio)            | Ley 24.240 / Ley 25.326                                    | Footer + términos                                                              |
| Formulario QR **Data Fiscal** (ARCA)                           | RG AFIP 1.415 y modif.                                     | Footer                                                                         |
| Protección de datos personales, consentimiento y derechos ARCO | Ley 25.326                                                 | Política de privacidad, exportar/eliminar cuenta, opt‑in de marketing separado |
| Cookies / tracking                                             | Buenas prácticas + Ley 25.326                              | Banner de consentimiento; GA/Pixel solo tras aceptar                           |
| Venta de medicamentos / magistrales                            | ANMAT (venta por internet restringida)                     | Ver R‑04: no permitir compra online de productos que lo requieran              |
| Cuotas sin interés                                             | Ley 24.240 art. 36 (operaciones de crédito)                | Mostrar CFT/TEA = 0 % cuando corresponda                                       |

## 3. Estrategia de testing

| Nivel       | Herramienta                                                                             | Qué cubre                                                                                     | Meta                                   |
| ----------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| Unit        | Vitest                                                                                  | `pricing.ts`, validaciones Zod, helpers, adaptadores de pago (con fixtures de webhooks)       | 90 % en `lib/pricing` y `lib/payments` |
| Componentes | Testing Library                                                                         | PriceTag, CartSheet, formulario de checkout                                                   | flujos críticos                        |
| DB          | pgTAP (`supabase test db`)                                                              | RLS por rol, `place_order`, `confirm_payment`, reservas                                       | todos los casos de RLS                 |
| E2E         | Playwright (en CI contra `next start` + Supabase local; al cerrar fase, contra staging) | Compra tarjeta aprobada/rechazada, transferencia, login, admin cambia estado, arrepentimiento | en cada PR a `main` + gate de fase     |
| A11y        | @axe-core/playwright                                                                    | Páginas públicas y checkout                                                                   | 0 violaciones serias                   |
| Performance | Lighthouse CI + Speed Insights                                                          | Home, listado, ficha                                                                          | ≥ 90 mobile                            |
| Manual      | Dispositivos reales                                                                     | iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari/Edge                                | checklist                              |

## 4. Checklist de lanzamiento (Go/No‑Go)

- [ ] Todos los P0 del backlog cerrados.
- [ ] Compra real con tarjeta + reembolso exitoso en producción.
- [ ] Transferencia: flujo completo con confirmación manual.
- [ ] Emails llegan a Gmail/Outlook/Hotmail (no spam); SPF/DKIM/DMARC OK.
- [ ] Redirecciones verificadas con la lista de URLs viejas.
- [ ] Sitemap y robots correctos; previews con `noindex`.
- [ ] Analytics y conversiones registrando (GA4 DebugView, Meta Events Manager).
- [ ] Sentry recibe errores de prod; alertas configuradas.
- [ ] Textos legales publicados y aprobados; footer con todos los requisitos.
- [ ] Backup y PITR activos; restauración probada.
- [ ] Capacitación del equipo hecha y manual entregado.
- [ ] Plan de rollback documentado (DNS al WP viejo).
