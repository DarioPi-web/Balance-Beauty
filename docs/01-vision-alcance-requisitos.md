# 01 — Visión, alcance y requisitos

## Visión

Una tienda de dermocosmética rápida, confiable y fácil de operar por el equipo de Balance Beauty sin depender de plugins de terceros, con el control total del código, los datos y la experiencia de compra.

## Objetivos de negocio (medibles)

| Objetivo                       | Métrica                                | Meta a 90 días de lanzamiento        |
| ------------------------------ | -------------------------------------- | ------------------------------------ |
| Vender online de punta a punta | Pedidos pagados online / mes           | > 0 → baseline + crecimiento mensual |
| Mejor conversión mobile        | Tasa de conversión mobile              | ≥ 1,5 %                              |
| Velocidad                      | LCP p75 mobile (Vercel Speed Insights) | < 2,5 s; INP < 200 ms; CLS < 0,1     |
| Operación autónoma             | Tiempo para cargar/editar un producto  | < 2 min, sin soporte técnico         |
| SEO sin pérdidas               | Clics orgánicos (Search Console)       | ≥ 100 % del baseline previo          |

## Alcance

### MVP (lanzamiento)

1. **Catálogo**: listado con filtros por categoría/línea, orden por precio/novedad, búsqueda instantánea, ficha de producto con galería, precio, precio con descuento por transferencia, cuotas, stock, relacionados.
2. **Carrito** persistente (invitado y logueado), mini‑cart en header.
3. **Checkout** en 1 página: datos de contacto, envío (domicilio / retiro), pago; checkout como invitado.
4. **Pagos**: tarjeta (Getnet o Mercado Pago), transferencia bancaria / QR con 10 % off y confirmación manual.
5. **Envíos**: tarifas por zona (CABA/GBA/Interior) con tabla editable + retiro en local; número de seguimiento cargable por admin y visible por el cliente.
6. **Cuenta de cliente**: registro/login (email + magic link, Google opcional), historial de pedidos, direcciones.
7. **Panel admin** (`/admin`): productos (CRUD, imágenes, edición masiva, import/export CSV), categorías, pedidos (estados, tracking, notas), clientes, banners de home, promociones/cupones, FAQ, ajustes de tienda.
8. **Emails transaccionales**: confirmación de pedido, pago aprobado, transferencia pendiente, pedido enviado (con tracking), bienvenida, magic link.
9. **Contenido**: Home, Tienda, FAQ, Sobre nosotros, Dónde estamos, Contacto (form + WhatsApp), Políticas (privacidad, devoluciones, términos), Botón de arrepentimiento.
10. **SEO**: metadata, sitemap, robots, JSON‑LD Product/Organization/Breadcrumb, redirecciones 301 desde URLs de WooCommerce.
11. **Analytics** con consentimiento: Vercel Analytics, GA4, Meta Pixel + Conversions API.

### Fase 2 (post‑lanzamiento)

- **Mayorista (B2B)**: rol `wholesale` aprobado manualmente, lista de precios mayorista, mínimo de compra.
- Cotización automática por API de **Correo Argentino (MiCorreo)** y **Andreani**; generación de etiquetas.
- Reseñas de productos, wishlist, "avisame cuando haya stock".
- Rutinas / kits (bundles), recomendador por tipo de piel.
- Facturación electrónica AFIP/ARCA (vía Tusfacturas / Facturante / SDK propio).
- Blog / contenido educativo con MDX o CMS headless.

### Fuera de alcance

App mobile nativa, marketplace multi‑vendedor, multi‑moneda, multi‑idioma.

## Requisitos funcionales clave

- RF‑01 El precio se muestra en ARS sin decimales, con el **precio sin impuestos nacionales** (Ley 27.743).
- RF‑02 El precio por transferencia/QR = precio × 0,90 y se muestra en la ficha y el carrito (configurable).
- RF‑03 Las cuotas sin interés se muestran según promoción vigente (configurable por rango de fechas y monto mínimo, p. ej. 12 cuotas desde $150.000).
- RF‑04 El stock se reserva al iniciar el pago y se libera si el pago no se aprueba en N minutos.
- RF‑05 Un pedido sigue la máquina de estados: `pending_payment → paid → preparing → shipped → delivered` / `cancelled` / `refunded`.
- RF‑06 El admin puede cargar código de seguimiento y transportista; el cliente recibe email y lo ve en "Mis pedidos".
- RF‑07 Botón de arrepentimiento accesible desde el footer, con formulario y número de trámite (Res. 424/2020).
- RF‑08 Los SKUs se generan automáticamente si no se cargan.

## Requisitos no funcionales

- **Performance**: Core Web Vitals en verde; páginas de catálogo estáticas/ISR con revalidación por tag al editar.
- **Disponibilidad**: 99,9 % (Vercel + Supabase plan Pro).
- **Seguridad**: RLS en todas las tablas, secretos solo en servidor, webhooks firmados, rate limiting, OWASP Top 10.
- **Accesibilidad**: WCAG 2.2 AA.
- **Mantenibilidad**: TypeScript estricto, tipos generados desde Supabase, tests en CI, deploys manuales por fase con aprobación ([12](12-deploy-y-entornos.md)).
- **Performance y costo**: presupuestos de velocidad verificados en CI y sin excedentes de Vercel/Supabase ([11](11-performance-y-costos.md)).
- **Observabilidad**: Sentry (errores), logs de Vercel, alertas de pagos fallidos.
- **Backups**: diarios + PITR (Supabase Pro), export semanal de catálogo y pedidos.
