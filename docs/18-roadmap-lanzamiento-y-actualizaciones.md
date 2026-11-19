# 18 — Hoja de ruta: lanzamiento primero, mejoras por actualizaciones

> Pedido del dueño (2026‑11‑18): "catalogar lo prioritario para que funcione lo antes posible y
> agregar las mejoras en fases, como actualizaciones". Este documento **manda sobre el orden** del
> backlog ([05](05-backlog-tareas.md)): las tareas P0 de 05 que no están en la v1.0 pasan a una
> actualización. Se actualiza en cada commit junto con [ESTADO](ESTADO.md).

Leyenda: ✅ hecho · 🟡 en curso · ⏳ pendiente · 👤 depende del dueño · ⚙️ desarrollo

---

## v1.0 — Lanzamiento: vender de verdad, seguro y legal

Criterio para entrar acá: **sin esto no se puede abrir la tienda** (no se cobra, no se gestiona,
no es legal o rompe el SEO heredado). Todo lo demás espera.

### Ya funciona

✅ Catálogo (50 productos, 32 con foto), fichas, preocupaciones, marcas, búsqueda, quiz de rutina ·
✅ Carrito y checkout con transferencia (pedido real probado en staging) · ✅ Mercado Pago
Checkout Pro (código; faltan credenciales) · ✅ Admin de pedidos (acreditar, despachar, cancelar)
· ✅ `/admin/integraciones` (MP, Andreani, Resend, banco) · ✅ Emails de pedido (código; falta
Resend) · ✅ Header, video del hero, PWA, performance y accesibilidad en verde · ✅ Redirecciones
301 de WooCommerce · ✅ Deploy de staging.

### Lo que falta — desarrollo (⚙️, lo hace Claude)

| #   | Tarea                                                                                                                                    | Por qué bloquea                                                 | Est.   | Estado                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | URL pública correcta en cada entorno (sitemap, canonical, links de emails, `back_urls` de MP)                                            | En staging el sitio se presenta como `localhost`                | 0,25 d | ✅ código + tests; visible en el próximo deploy                                                                                                                      |
| L2  | **Admin de productos mínimo:** listado con búsqueda, editar precio/stock/estado, textos, categorías y **fotos** (subir, ordenar, alt)    | Sin esto el dueño no puede mantener el catálogo                 | 2,5 d  | ✅ probado en el navegador con sesión de admin (alta, guardar, publicar, fotos, orden, alt, borrar)                                                                  |
| L3  | Datos bancarios en `/checkout/resultado` y en el email de "pedido recibido"                                                              | Quien paga por transferencia no sabe a dónde                    | 0,25 d | ✅ caja con titular, banco, CBU, alias, CUIT y monto + botones Copiar (aparece cuando el dueño carga D2)                                                             |
| L4  | **Botón de arrepentimiento** (link visible en el footer + formulario → `withdrawal_requests` + aviso al admin)                           | Obligatorio para comercio electrónico en Argentina              | 0,5 d  | ✅ `/arrepentimiento` en la primera pantalla (header mobile y desktop) y footer; RPC `request_withdrawal` (migración 12) con código, emails al cliente y a la tienda |
| L5  | Páginas `/legales/devoluciones` y `/legales/privacidad` (o redirigir a las existentes)                                                   | Las 301 heredadas hoy terminan en 404                           | 0,25 d | ✅ `/devoluciones` (borrador legal) y 301 corregidas: `/reembolso_devoluciones` → `/devoluciones`, `/privacy-policy` → `/privacidad`                                 |
| L6  | Webhook de MP alcanzable: bypass de protección de Vercel en staging; en producción sin protección                                        | Sin webhook el pedido con tarjeta no pasa a "pagado"            | 0,25 d | ⏳                                                                                                                                                                   |
| L7  | Revisión de seguridad final (secretos, headers, RLS, dependencias) y tests E2E del flujo de compra con MP sandbox                        | Cobrar con tarjeta sin probar el circuito completo es un riesgo | 1 d    | ⏳                                                                                                                                                                   |
| L8  | Producción: proyecto Supabase prod (o promover staging), Vercel prod, dominio y SSL, Search Console con el sitemap nuevo, monitoreo 72 h | Es la salida al aire                                            | 1 d    | ⏳ (con aprobación)                                                                                                                                                  |
| L9  | **Precio sin impuestos nacionales** visible junto a cada precio (ficha y tarjetas), en letra menor                                       | Ley 27.743 art. 99: obligatorio en exhibición y publicidad      | 0,25 d | ✅                                                                                                                                                                   |

**Total desarrollo v1.0: ~6 días.** (L9 se agregó al detectarlo durante la prueba de L2.)

### Lo que falta — dueño (👤)

| #   | Qué                                                                                                | Para qué                 |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| D1  | Credenciales de **Mercado Pago** (prueba y después productivas) → cargar en `/admin/integraciones` | Cobrar con tarjeta       |
| D2  | **Datos bancarios** (titular, banco, CBU, alias, CUIT) → `/admin/integraciones`                    | Cobrar por transferencia |
| D3  | Cuenta de **Resend** + acceso al DNS del dominio para verificarlo                                  | Que salgan los emails    |
| D4  | `SUPABASE_SERVICE_ROLE_KEY` en Vercel (Sensitive)                                                  | Webhook de pagos         |
| D5  | **Tarifas de envío** definitivas (domicilio, sucursal, envío gratis desde $…)                      | Hoy son provisorias      |
| D6  | **Textos legales** revisados (términos, privacidad, devoluciones)                                  | Hoy son borradores       |
| D7  | Fotos y descripciones faltantes (o decidir ocultar esos productos al lanzar)                       | 18 productos sin foto    |
| D8  | Rotar las contraseñas del WordPress viejo (estaban en el zip)                                      | Seguridad                |
| D9  | Acceso al **DNS** de balancebeauty.com.ar y "sí" para producción                                   | Salir al aire            |

---

## Actualizaciones después del lanzamiento

Cada actualización es chica, se prueba en staging y sale con aprobación (docs/12).

| Versión  | Tema                             | Contenido                                                                                                                                                                                                                                               | Est.      |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **v1.1** | Operación diaria                 | Dashboard "Hoy" (para despachar, stock bajo, ventas) · emails que faltan (enviado, cancelado) · cron de reservas · contacto con formulario                                                                                                              | 2 d       |
| **v1.2** | Inventario por lote              | **Etapa A ya escrita** (rama `feat/inventario-lotes`; al retomarla, renumerar su migración después de la 10): lotes con vencimiento, FEFO, movimientos, proveedores, historial de precios · recepción desde el celular · alertas de vencimiento y stock | 4 d       |
| **v1.3** | Clientes                         | Login, "Mis pedidos" con seguimiento, direcciones guardadas · "Avisame cuando vuelva"                                                                                                                                                                   | 3 d       |
| **v1.4** | Envíos automáticos               | VPS + Andreani/Correo: cotización en vivo por CP, etiqueta y tracking desde el pedido (requiere pesos/medidas)                                                                                                                                          | 4 d       |
| **v1.5** | Calidad de catálogo              | Ficha estructurada, datos ANMAT/INCI, completitud, verificador de claims, asistente IA de descripciones, pipeline de imágenes                                                                                                                           | 5 d       |
| **v1.6** | Crecimiento                      | Páginas de activos y guías (SEO), Google Merchant Center, IndexNow, reseñas post‑compra, cupones y promociones                                                                                                                                          | 4 d       |
| **v1.7** | Administración avanzada          | Precios masivos ± %, import/export y listas de proveedores, órdenes de compra, punto de pedido, resumen diario                                                                                                                                          | 3 d       |
| **v2.0** | Integraciones fiscales y canales | Factura electrónica ARCA · Mercado Libre (stock único) · mayoristas                                                                                                                                                                                     | a definir |

El orden de v1.1 en adelante se puede cambiar según lo que el negocio necesite primero.
