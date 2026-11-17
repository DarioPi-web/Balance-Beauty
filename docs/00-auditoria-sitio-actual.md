# 00 — Auditoría del sitio actual

Análisis del backup `archive.zip` (hosting Hostinger, `public_html`) y del dump UpdraftPlus de la base (`backup_2026-06-28-2308…-db.gz`, 33 MB descomprimido, multi‑miembro gzip).

## 1. Plataforma

| Ítem            | Valor                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------- |
| CMS             | WordPress 6.8.5                                                                                    |
| E‑commerce      | WooCommerce 10.7.0, HPOS habilitado                                                                |
| Tema            | Astra + Astra Addon (Pro)                                                                          |
| Builder         | Elementor + Elementor Pro (Theme Builder: header, footer, archivo de productos, ficha de producto) |
| Server          | PHP 8.2, MariaDB 11.8, LiteSpeed (Hostinger)                                                       |
| Idioma / moneda | es_AR / ARS, 0 decimales, separador de miles `.`                                                   |
| Permalinks      | `/%postname%/`, productos en `/producto/<slug>/`, categorías en `/categoria-producto/<slug>/`      |

## 2. Plugins activos y su reemplazo en el nuevo stack

| Plugin                                               | Función hoy                          | Reemplazo                                                              |
| ---------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| WooCommerce                                          | Catálogo, carrito, checkout, pedidos | Dominio propio en Next.js + Supabase (ver [03](03-modelo-de-datos.md)) |
| Elementor / Elementor Pro                            | Maquetado de páginas y plantillas    | Componentes React + Tailwind + shadcn/ui                               |
| Astra / Astra Addon                                  | Tema                                 | Design system propio                                                   |
| The Plus Addons (free + pro)                         | Widgets extra, mega menú             | Componentes propios                                                    |
| FiboSearch Premium (ajax-search-for-woocommerce)     | Búsqueda instantánea                 | Postgres Full‑Text Search + `pg_trgm` + `unaccent` vía RPC             |
| WP Sheet Editor Premium                              | Edición masiva tipo planilla         | Data table editable en `/admin/productos` + import/export CSV          |
| WooCommerce Product SKU Generator                    | SKUs automáticos                     | Secuencia Postgres (`sku_seq`), SKUs actuales 104–156 se conservan     |
| Code Snippets Pro                                    | Snippets PHP (tabla vacía)           | No aplica                                                              |
| LiteSpeed Cache                                      | Caché/optimización                   | Vercel CDN + Next.js caching + `next/image`                            |
| UpdraftPlus                                          | Backups                              | Supabase PITR/backups diarios + export programado                      |
| Akismet                                              | Antispam                             | Cloudflare Turnstile en formularios                                    |
| mu-plugins Hostinger                                 | Auto‑updates / preview domain        | No aplica                                                              |
| Getnet gateway (config en DB, plugin ya no presente) | Pago con tarjeta                     | Integración Getnet API y/o Mercado Pago (decisión pendiente)           |

## 3. Contenido

### Páginas publicadas

`/inicio` (home), `/tienda`, `/carro`, `/finalizar-comprar`, `/mi-cuenta`, `/preguntas-frecuentes` (vacía en Elementor).
Borradores: `/privacy-policy`, `/reembolso_devoluciones` (texto de ejemplo de WooCommerce en inglés, **no hay política real**).

### Home (`/inicio`)

- 2 sliders (desktop y mobile) con 4–5 banners `.webp` (`uploads/2025/06/Banner-{1..5}-{PC|M}.webp`).
- 4 íconos de beneficios: "6 cuotas sin interés", "Sin mínimo de compra x 48hs", "12 cuotas sin interés a partir de $150.000 solo x 48hs".
- Grilla de productos WooCommerce.
- 2 videos (`Balance-Beauty-x264.mp4`).

### Header

Logo, buscador (FiboSearch), mini‑cart, links **MAYORISTA**, **PROMOS**, **CONTACTO**, "Iniciar sesión", redes (Facebook, Instagram `@balancesaludbelleza`, TikTok `@balancesaludbelleza`).

### Menús

- **Principal**: INICIO, SHOP, SEGUIR MI ENVÍO (→ Correo Argentino / Andreani), FAQS, DÓNDE (`#`), ABOUT US (`#`).
- **Footer**: INICIO, SHOP, FAQS.

Varios ítems apuntan a `#` → funcionalidades nunca implementadas (Dónde, About, Mayorista, Promos, Contacto, tracking Andreani).

### Ficha de producto (Elementor)

Imágenes, breadcrumb, título, precio, descripción corta, add‑to‑cart, relacionados. Sin reviews (deshabilitadas).

## 4. Catálogo

- **53 productos** (52 publicados + 1 privado), todos **simples**, sin variaciones ni atributos.
- **1 sola categoría**: "Sin categorizar" → hay que diseñar taxonomía.
- SKUs 104–156. Precios $3.000 – $75.000 ARS.
- Stock gestionado en pocos productos; 49 en stock, 4 sin stock.
- **26 sin descripción**, **15 sin imagen**, **2 sin precio** (Vinchas Balance, Pads Ecológicos).
- La "descripción corta" de todos es el mismo texto de medios de pago: _"Pagos con tarjeta de crédito y débito — 10% de descuento pagando con transferencia bancaria y pagos QR"_ → debe ser una **regla de precio**, no contenido.
- Líneas/marcas detectables en los nombres: ACNEPLUR, ROSATOPIC, Hydra Filler, Fine (Power/Strong/Smooth/Peak/Beauti), DermaNutrix, Home Care, Liderma, EXEL, Carthage.
- Metadatos `tpc_proc_*` (35 productos, vacíos) de The Plus — se descartan.
- ~1.070 imágenes `.webp` en `uploads/2025–2026` (~21 MB), la mayoría variantes de tamaño generadas por WP.

Export completo: [supabase/seed/legacy_products.csv](../supabase/seed/legacy_products.csv).

### Propuesta de categorías (validar con cliente)

Limpieza · Hidratación · Protección solar · Serums · Despigmentantes · Anti‑acné · Contorno de ojos y labios · Corporal · Nutricosmética (suplementos/drinks) · Accesorios.

## 5. Comercio

| Aspecto           | Estado                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Pedidos           | **0** en `wp_wc_orders` al momento del backup (o fueron purgados)             |
| Clientes          | 2 usuarios, ambos administradores                                             |
| Cupones / reviews | 0 / deshabilitadas                                                            |
| Pagos             | Getnet ("Pagar con tarjeta de crédito o débito") activo; PayPal deshabilitado |
| Envíos            | **Sin zonas ni métodos configurados**; tracking manual vía links externos     |
| Impuestos         | No calculados (`calc_taxes = no`)                                             |
| Checkout          | Invitado permitido; registro desde checkout deshabilitado                     |

## 6. Hallazgos de seguridad (acción inmediata)

1. El zip contiene `wp-config.php` con **credenciales de la base y salts**, y backups de la DB con hashes de contraseñas de administradores. **Rotar** la contraseña de la DB en Hostinger, regenerar salts y cambiar contraseñas de ambos admins. No compartir el zip.
2. Backups de Updraft dentro de `wp-content/updraft/` en el webroot (protegidos solo por `.htaccess`).
3. Plugins premium (Elementor Pro, Astra Addon, The Plus, FiboSearch, WP Sheet Editor, Code Snippets Pro) — verificar que tengan licencia válida; versiones no licenciadas son un vector conocido de malware.
4. Carpetas `*-old` (plugins-old, uploads-old, etc.) restos de una migración/limpieza → eliminar del hosting.

## 7. Qué se migra / qué se descarta

| Se migra                                                                    | Se descarta                                         |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| Productos (nombre, slug, SKU, precio, stock, descripción, imagen principal) | Revisiones (780), fonts de WP, transients, sesiones |
| Banners y video de home                                                     | Tema/plugins, plantillas Elementor                  |
| Logo, redes sociales                                                        | Política de devoluciones de ejemplo                 |
| URLs (para redirecciones 301)                                               | Metadatos de The Plus / Astra                       |
| Textos de beneficios/promos                                                 | Usuarios (se re‑registran; solo 2 admins)           |
