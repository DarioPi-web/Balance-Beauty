# 09 — Migración de datos y SEO

## 1. Fuentes

- Base: dump UpdraftPlus `backup_2026-06-28-2308_…-db.gz` (gzip **multi‑miembro**: descomprimir concatenando miembros; `gzip -dc` en Linux/macOS lo hace solo).
- Archivos: `wp-content/uploads/2025/**`, `2026/**` (`.webp`), `Balance-Beauty-x264.mp4`, logo `uploads/2025/04/LOGO-scaled-e1748627441438.webp`.
- Export ya generado: [supabase/seed/legacy_products.csv](../supabase/seed/legacy_products.csv) (`legacy_id, sku, name, slug, status, price_ars, sale_price_ars, manage_stock, stock, stock_status, weight/dimensiones, image_path, description, short_description`).

> **Antes de migrar, re‑exportar** desde el WordPress en vivo: el backup es de junio 2026 y precios/stock pueden haber cambiado.

## 2. Mapeo WooCommerce → Supabase

| WooCommerce                                | Supabase                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `wp_posts.ID` (product)                    | `products.legacy_wp_id`                                                            |
| `post_title`                               | `products.name`                                                                    |
| `post_name`                                | `products.slug` (se conserva)                                                      |
| `post_content`                             | `products.description` (sanitizar HTML, quitar `\r\n` literales)                   |
| `post_excerpt`                             | **descartar** (texto de medios de pago repetido) → regla en `promotions`           |
| `_sku`                                     | `products.sku`                                                                     |
| `_regular_price` / `_sale_price`           | `price` / `compare_at_price` (si hay sale: `price = sale`, `compare_at = regular`) |
| `_manage_stock`, `_stock`, `_stock_status` | `track_stock`, `stock` (si `NULL` y `instock` → definir stock real con cliente)    |
| `_weight` (kg), `_length/_width/_height`   | `weight_g` (×1000), cm                                                             |
| `_thumbnail_id` → `_wp_attached_file`      | `product_images` (orden 0)                                                         |
| `_product_image_gallery`                   | `product_images` (orden 1..n)                                                      |
| `post_status` publish/private              | `active` / `draft`                                                                 |
| `product_cat`                              | `product_categories` (todas "Sin categorizar" → reasignar con Q‑07)                |

## 3. Script de migración (`scripts/migrate-products.ts`)

1. Leer CSV, validar con Zod (precio entero ≥ 0, slug único).
2. Upsert por `legacy_wp_id` (re‑ejecutable).
3. Productos sin precio o sin imagen → `status='draft'` y listado en `migration-report.md`.
4. Ajustar `sku_seq` a `max(sku)+1`.

## 4. Imágenes (`scripts/migrate-images.ts`)

1. Por cada `image_path`, tomar el **original** (sin sufijo `-WxH` ni `-scaled`) desde `uploads/`.
2. Normalizar a WebP/AVIF máx. 2000 px (sharp), nombre `products/<product_id>/<uuid>.webp`.
3. Subir a bucket `product-images`, crear fila `product_images` con `alt = name`.
4. Banners `Banner-{1..5}-{PC|M}.webp` → bucket `banners` + tabla `banners`.

## 5. Redirecciones 301 (`next.config.ts` → `redirects()`)

| Origen (WooCommerce)                          | Destino                                                      |
| --------------------------------------------- | ------------------------------------------------------------ |
| `/inicio`                                     | `/`                                                          |
| `/tienda`                                     | `/tienda` (se mantiene)                                      |
| `/carro`                                      | `/carrito`                                                   |
| `/finalizar-comprar`                          | `/checkout`                                                  |
| `/mi-cuenta/:path*`                           | `/mi-cuenta`                                                 |
| `/preguntas-frecuentes`                       | se mantiene                                                  |
| `/producto/:slug`                             | se mantiene                                                  |
| `/categoria-producto/:slug`                   | `/categoria/:slug`                                           |
| `/categoria-producto/sin-categorizar`         | `/tienda`                                                    |
| `/etiqueta-producto/:slug`                    | `/tienda`                                                    |
| `/reembolso_devoluciones`                     | `/legales/devoluciones`                                      |
| `/privacy-policy`                             | `/legales/privacidad`                                        |
| `/?post_type=product&p=:id`                   | `/producto/:slug` (vía middleware con lookup `legacy_wp_id`) |
| `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php` | `410 Gone` (middleware)                                      |
| `/wp-content/uploads/*`                       | redirigir las imágenes indexadas más visitadas; resto 410    |
| `/feed`, `/comments/feed`                     | `/`                                                          |
| `/hello-world`                                | `/`                                                          |

## 6. SEO técnico

- `generateMetadata` en cada ruta: title `"<Producto> | Balance Beauty"`, description, canonical, OG.
- JSON‑LD: `Organization` + `WebSite` (con `SearchAction`) en layout; `Product` + `Offer` (precio ARS, availability) en ficha; `BreadcrumbList`; `FAQPage` en FAQ.
- `sitemap.ts` dinámico (productos activos, categorías, páginas), `robots.ts` (bloquear `/admin`, `/mi-cuenta`, `/checkout`, `/carrito`, `/api`).
- Imágenes con `alt` descriptivo y `next/image` (`sizes` correctos).
- Deploys de staging (previews manuales de Vercel) con `X-Robots-Tag: noindex` y Deployment Protection.

## 7. Cutover

1. T‑7 días: congelar cambios de catálogo en WordPress; re‑export final y migración a prod.
2. T‑2 días: bajar TTL DNS a 300 s.
3. T‑0: apuntar `balancebeauty.com.ar` y `www` a Vercel (A/CNAME), verificar SSL, probar redirecciones con script (lista de URLs viejas → 200/301).
4. Mover WordPress a `old.balancebeauty.com.ar` con `noindex` y acceso restringido (rollback 30 días).
5. Search Console: enviar sitemap nuevo, monitorear cobertura y 404 durante 4 semanas.
6. T+30: backup final de WP y baja del hosting.
