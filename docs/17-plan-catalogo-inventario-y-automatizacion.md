# 17 — Plan: productos, inventario, imágenes, descripciones y automatización

> Preparado el 2026‑11‑18. Enfoque: dermocosmética en Argentina, una tienda chica/mediana con
> 50–200 productos, operada por el dueño desde el celular y la PC. Complementa
> [03 Modelo de datos](03-modelo-de-datos.md), [05 Backlog](05-backlog-tareas.md) (F6, F7, F9),
> [13 VPS](13-vps-contabo-integraciones.md) y [16 SEO](16-seo-y-posicionamiento-en-ia.md).
> Las fuentes están al final; donde la fuente es comercial o no se pudo verificar, se aclara.

---

## 0. Resumen ejecutivo — las 10 decisiones que más rinden

| #   | Recomendación                                                                                                                       | Por qué (en una línea)                                                                                 | Esfuerzo |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **Stock por lote con vencimiento** y salida **FEFO** (primero vence, primero sale)                                                  | Un cosmético vencido vendido = reclamo y riesgo sanitario; ANMAT exige lote y vencimiento en el rótulo | 3 d      |
| 2   | **Libro de movimientos de stock** (nunca se "pisa" un número: todo es entrada, salida o ajuste con motivo)                          | Trazabilidad, auditoría, conteos y recall por lote                                                     | 1,5 d    |
| 3   | **Recepción de mercadería desde el celular** escaneando el código de barras (EAN) + lote + vencimiento                              | Es el momento donde se cargan los datos que después automatizan todo                                   | 1,5 d    |
| 4   | **Ficha estructurada en bloques** (para qué sirve, activos, cómo usar, para quién, precauciones, INCI) en vez de un texto libre     | La mitad de quien compra skincare busca ingredientes; además alimenta SEO, IA y Google Shopping        | 2 d      |
| 5   | **Puntaje de completitud** por producto y bloqueo de publicación si faltan datos obligatorios                                       | Hoy hay 26 descripciones y 15 fotos faltantes: hay que ver qué falta de un vistazo                     | 1 d      |
| 6   | **Guardia de "claims" ANMAT** en el editor (avisa si el texto dice "cura", "cicatrizante", "antiinflamatorio"…)                     | ANMAT prohíbe que un cosmético prometa acción terapéutica y saca productos del mercado por eso         | 0,5 d    |
| 7   | **Asistente de redacción con IA** que arma el borrador desde el INCI y la ficha del fabricante, **con revisión humana obligatoria** | Completar 50+ fichas a mano lleva semanas; con borrador se revisa en minutos                           | 1,5 d    |
| 8   | **Pipeline de imágenes** automático (subir 1 foto → AVIF en 4 tamaños, recorte, chequeo de calidad, alt sugerido)                   | Las imágenes son lo primero que mira el 56 % de los usuarios en la ficha                               | 2 d      |
| 9   | **Alertas y sugerencia de compra** (punto de pedido, por vencer, sin movimiento) en un resumen diario por email/WhatsApp            | El dueño se entera antes de quedarse sin stock o con mercadería vencida                                | 1,5 d    |
| 10  | **Actualización masiva de precios** (± % por marca/proveedor, programada, con historial) e **importación de listas de proveedores** | Contexto argentino: los precios cambian seguido; hacerlo de a uno es inviable                          | 1,5 d    |

Total núcleo: **~16 días de desarrollo**, en 4 etapas (§8). Después: factura electrónica ARCA,
Google Merchant Center y Mercado Libre (opcionales, §5.6).

---

## 1. Diagnóstico de lo que hay hoy

**Bien resuelto:** catálogo en Supabase (productos, marcas, categorías, preocupaciones, activos con
concentración, imágenes, relacionados), reserva de stock transaccional en `place_order` con
liberación a los 30 min, precio con y sin impuestos nacionales, peso y medidas, umbral de stock
bajo, auditoría de acciones de admin, revalidación del catálogo por tag.

**Lo que falta para gestionar en serio:**

| Área              | Hoy                                       | Problema                                                                                |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Stock             | Un número por producto (`products.stock`) | No se sabe de qué lote salió cada unidad, ni qué vence, ni por qué cambió el número     |
| Lotes/vencimiento | No existen                                | Imposible aplicar FEFO, retirar un lote o avisar vencimientos                           |
| Variantes         | No existen                                | Un sérum de 30 ml y de 50 ml serían dos productos sueltos                               |
| Identificadores   | Solo SKU interno                          | Sin EAN/GTIN: no hay escaneo ni Google Shopping (Google lo exige si existe)             |
| Regulatorio       | No hay campos                             | Falta Nº de inscripción ANMAT, titular, elaborador, país, contenido neto, INCI completo |
| Contenido         | `description` texto libre + `how_to_use`  | Difícil de mantener homogéneo, de revisar y de reutilizar (SEO, IA, feeds)              |
| Imágenes          | Ruta, alt, orden                          | Sin rol (frente, textura, en uso, rótulo), sin control de calidad ni tamaño mínimo      |
| Proveedores       | No existen                                | Sin costo, sin margen, sin órdenes de compra, sin plazo de entrega                      |
| Admin             | Pedidos e integraciones                   | No hay pantalla de productos ni de inventario (F6‑03/04/05 pendientes)                  |

---

## 2. Qué exige este nicho (regulación y reglas de mercado)

### 2.1 Rotulado de cosméticos (ANMAT · Mercosur)

- La **Disposición ANMAT 7809/2022** incorpora el Reglamento Técnico Mercosur de rotulado de
  productos de higiene personal, cosméticos y perfumes. Define, entre otros: **lote**, **país de
  origen**, **titular**, **elaborador**, **importador**, **datos de inscripción/regularización**,
  **ingredientes con codificación INCI** y **plazo de validez**. La información va en español
  (salvo INCI, nombre y marca).
- En fiscalizaciones recientes (Disp. 961/2025, 4300/2026) ANMAT prohibió productos justamente
  por **no tener Nº de lote, fecha de vencimiento, inscripción sanitaria o la lista completa de
  ingredientes** en el rótulo.
- **Implicancia para el sitio:** la tienda no es el fabricante, pero vender un producto sin esos
  datos (o vencido) expone a la tienda. Por eso proponemos **guardar esos datos por producto y por
  lote**, mostrarlos en la ficha (INCI, contenido neto, país, titular, Nº de inscripción) y **no
  dejar publicar** un producto sin ellos.
- A confirmar con el responsable técnico/proveedores: el **grado** de cada producto (Mercosur
  distingue Grado 1 y Grado 2; los de Grado 2 requieren registro previo) y si conviene mostrar el
  **PAO** (meses de uso tras abrir, el ícono del frasquito) cuando el rótulo lo trae.

### 2.2 Publicidad y descripciones: cosmético ≠ medicamento

- ANMAT sostiene que un cosmético **no puede atribuirse acción terapéutica** (cicatrizante,
  antiséptico, antiinflamatorio, analgésico); si la tiene, se asimila a medicamento y necesita
  otra autorización. Disp. 2912/2017 y otras retiraron cosméticos por eso; la Disp. 4980/2005
  fija pautas de publicidad (no prometer acción terapéutica ni resultados milagrosos o engañosos).
- **Implicancia:** las fichas, los textos de preocupaciones (acné, rosácea, manchas) y la IA tienen
  que hablar de **"ayuda a", "mejora el aspecto de", "piel con tendencia acneica"**, nunca "cura",
  "trata" o "elimina". Esto se automatiza con un **verificador de claims** (§4.4).
- Los productos magistrales o "con asesoramiento" (ya existe `requires_prescription`) siguen sin
  botón de compra directa.

### 2.3 Precio y factura

- **Ley 27.743, art. 99 — Transparencia fiscal al consumidor:** junto al precio final hay que
  mostrar, en letra menor, el **"PRECIO SIN IMPUESTOS NACIONALES"**, también en publicidad por
  cualquier medio. El modelo ya tiene `price_without_national_taxes`: falta **calcularlo solo**
  (IVA 21 % hoy) al cambiar el precio, para que nunca quede desactualizado.
- **Factura electrónica (ARCA):** la RG 5893/2026 amplió la obligatoriedad. Las vías técnicas son
  el Web Service **WSFE** o "Comprobantes en línea". Factura B/C según la condición fiscal de la
  tienda. Automatizarla al aprobarse un pago es la siguiente automatización de mayor ahorro de
  tiempo (§5.6). **Decisión del dueño + contador.**

### 2.4 Google (Shopping gratuito y buscador)

- Merchant Center **recomienda fuertemente el GTIN (EAN‑13)** cuando el fabricante lo tiene y
  desaprueba productos con GTIN incorrecto o que no corresponde a la marca.
- Imágenes: mínimo **500 × 500 px** (exigible desde el 31/01/2027), sin logos ni "sin imagen" como
  foto principal. Nuestro estándar propuesto (1200 px, §4.3) lo supera con margen.

---

## 3. Modelo de datos propuesto (cambios sobre docs/03)

> Todo con migración, RLS explícito, pgTAP y tipos regenerados (reglas del proyecto). Los montos
> siguen en `integer` ARS. Nada se borra: los productos se archivan.

### 3.1 Variantes (opcional pero recomendado ahora)

`product_variants` — una fila por presentación vendible:
`id, product_id, sku (único), gtin (EAN‑13, único, validado con dígito verificador), net_content
(numeric), net_unit ('ml'|'g'|'u'), price, compare_at_price, price_without_national_taxes
(calculado), weight_g, length_cm, width_cm, height_cm, is_default, status, sort_order`.

- Los productos de una sola presentación tienen **una** variante por defecto: la ficha no cambia.
- Carrito, pedidos y stock pasan a apuntar a `variant_id`. Migración: 1 variante por producto actual.
- Si el dueño confirma que **no** maneja tamaños, se posterga y se agregan `gtin`, `net_content` y
  `net_unit` directo en `products` (0,5 d en vez de 2 d).

### 3.2 Inventario por lote y libro de movimientos

```text
suppliers            id, name, cuit, contact, email, phone, lead_time_days, notes, is_active
inventory_lots       id, variant_id, lot_code, expires_on (date), received_on, supplier_id,
                     unit_cost (int), qty_received, qty_on_hand, status
                     ('available'|'quarantine'|'expired'|'recalled'|'depleted'), notes
                     unique (variant_id, lot_code)
stock_movements      id, variant_id, lot_id, qty (+/-), kind
                     ('receipt'|'sale'|'reservation'|'release'|'return'|'adjustment'|
                      'waste'|'count'|'transfer'), reason, order_id, user_id, created_at
purchase_orders      id, supplier_id, status ('draft'|'sent'|'partial'|'received'|'cancelled'),
                     expected_on, notes, created_by
purchase_order_items id, purchase_order_id, variant_id, qty, unit_cost
price_history        id, variant_id, price, compare_at_price, changed_by, reason, created_at
```

Reglas (en RPC/trigger, no en el cliente):

- **El stock disponible es derivado:** `sum(qty_on_hand)` de lotes `available` con vencimiento
  posterior a `hoy + vida_útil_mínima_para_vender` (ajuste de tienda, sugerido **6 meses**; los
  más cortos van a "outlet" o uso interno). `products.stock`/`variants.stock` queda como **caché**
  mantenida por trigger para que el catálogo estático siga leyendo un solo número.
- **Toda** variación genera un `stock_movement` con usuario y motivo. Un ajuste manual exige motivo
  (rotura, regalo, muestra, error de conteo). Esto reemplaza la "edición inline de stock" de F6‑03:
  se edita con un ajuste, no pisando el número.
- `place_order` reserva sin lote; al **despachar**, el sistema **asigna lotes por FEFO** (el que
  vence primero) y lo imprime en la hoja de preparación. Queda `order_items.lot_id` → recall exacto.
- Un job diario pasa a `expired` los lotes vencidos y a `quarantine` los que entran en la ventana
  mínima, y recalcula el stock vendible.

### 3.3 Datos regulatorios y de contenido del producto

En `products` (o tabla 1‑a‑1 `product_regulatory` para no inflar la fila del catálogo):

```text
anmat_registration   texto (Nº de inscripción / legajo / resolución)
product_grade        'grade_1'|'grade_2'|'medicine'|'other' (a confirmar con el responsable técnico)
holder_name          titular de la inscripción
manufacturer_name    elaborador; importer_name si aplica
country_of_origin    ISO‑3166 (AR, KR, FR…)
inci_list            texto completo tal cual el rótulo (orden decreciente)
pao_months           int (opcional)
warnings             texto (precauciones del rótulo)
label_image_id       foto del rótulo/INCI (respaldo de lo cargado)
```

Contenido estructurado (reemplaza al texto libre único; se renderiza igual en la ficha):

```text
benefit_summary      1–2 líneas: "para qué sirve" (ya existe como tagline)
who_is_it_for        tipos de piel / preocupaciones (ya hay skin_types y product_concerns)
key_actives          ya existe product_ingredients (con %)
how_to_use           ya existe (pasos, AM/PM, frecuencia)
texture              'gel'|'crema'|'sérum'|'espuma'|'aceite'|'bálsamo'|…
results_expectation  qué esperar y en cuánto tiempo, sin promesas terapéuticas
pairs_well_with      relacionados (ya existe) + "no combinar con" (texto)
content_status       'draft'|'in_review'|'approved'  +  reviewed_by, reviewed_at
```

`product_images` suma: `role ('packshot'|'angle'|'texture'|'in_use'|'label'|'scale'|'lifestyle')`,
`source_path` (original), `focal_point`, `bytes`, `quality_flags` (json), `generated_at`.

---

## 4. Admin: experiencia de uso (UI/UX)

Principios: **mobile‑first para tareas de depósito** (recibir, contar, despachar), **escritorio para
edición de contenido**; nunca perder trabajo (autoguardado de borradores); cada pantalla responde
"¿qué tengo que hacer hoy?"; acciones reversibles o con confirmación clara; accesible (WCAG 2.2 AA,
teclado completo, objetivos ≥ 44 px), en español rioplatense.

### 4.1 Inicio del admin — "Hoy"

Tarjetas accionables, no gráficos decorativos:

- **Para despachar** (pedidos pagados sin envío) → botón "Preparar".
- **Stock bajo / bajo punto de pedido** (n productos) → "Armar pedido al proveedor".
- **Vencen en ≤ 90 días** (n lotes, $ valorizado) → "Ver lotes" (decidir promo/outlet).
- **Fichas incompletas** (n) → "Completar", ordenadas por ventas/visitas.
- **Ventas hoy / mes** (vista materializada de F6‑13).

### 4.2 Productos — listado

- Tabla con búsqueda instantánea, filtros guardados como **chips**: _Sin foto_, _Sin INCI_,
  _Sin EAN_, _Borrador_, _Stock bajo_, _Por vencer_, _Sin ventas 60 días_, por marca/categoría.
- Columna **Completitud** (barra 0–100 %) con tooltip de lo que falta (§6).
- Edición rápida de **precio** inline (con historial y confirmación si cambia > 20 %).
  El **stock no se edita inline**: abre "Ajustar stock" con motivo (§3.2).
- Acciones masivas: publicar/archivar, cambiar categoría, **ajuste de precios ± %** con
  redondeo (a 100 / terminación 900), vista previa del antes/después y programación ("aplicar el
  lunes 00:00").
- Exportar/Importar CSV/Excel (F6‑06) con **coincidencia por EAN o SKU** y vista previa de
  diferencias antes de aplicar.

### 4.3 Producto — editor

Diseño en **una sola página con secciones ancladas** (no pestañas que esconden errores) y un
**panel lateral fijo "Listo para publicar"** con el checklist de completitud y el botón Publicar
(deshabilitado con explicación si falta algo obligatorio):

1. **Básico:** nombre, marca, categoría, preocupaciones (principal + secundarias), paso de rutina,
   AM/PM, tipos de piel, textura.
2. **Presentaciones y precios:** variantes (contenido neto, EAN con validación y escaneo por cámara,
   precio, precio tachado, **precio sin impuestos nacionales calculado automáticamente**, peso y
   medidas con presets por tipo de envase).
3. **Inventario:** lotes con vencimiento, semáforo (verde > 12 m, ámbar 6–12 m, rojo < 6 m),
   historial de movimientos, punto de pedido sugerido, proveedor y costo → **margen** visible.
4. **Contenido:** bloques estructurados (§3.3) con contador de caracteres y ejemplos; botón
   **"Generar borrador con IA"** (§5.3); verificador de claims en vivo (§4.4).
5. **Regulatorio:** Nº de inscripción, titular, elaborador, país, INCI completo (pegar texto o
   **leerlo de la foto del rótulo** con OCR + revisión), PAO, precauciones.
6. **Imágenes:** ver §4.5.
7. **SEO:** título y descripción con vista previa de Google, keyword objetivo de docs/16, URL
   (`/producto/<slug>` bloqueada si ya está publicada: cambiarla crea un 301).
8. **Relacionados y rutina:** sugeridos automáticamente por preocupación/paso, editables.
9. **Vista previa** de la ficha real (mobile y desktop) antes de publicar.

Al publicar: revalida `product:<slug>` y `products`, avisa a IndexNow (S‑09) y actualiza el feed.

### 4.4 Verificador de claims (ANMAT)

- Lista mantenible en `store_settings` de **términos prohibidos** (cura, curar, trata, tratamiento
  de, elimina, cicatriza/cicatrizante, antiinflamatorio, antiséptico, analgésico, antibiótico,
  milagroso, 100 % efectivo, garantizado, "sin efectos secundarios"…) y de **reemplazos
  sugeridos** ("ayuda a reducir la apariencia de", "piel con tendencia a…", "calma la sensación
  de…").
- Subraya en vivo en el editor; **impide publicar** con términos de la lista roja salvo que un admin
  lo marque como revisado (queda en auditoría).
- No reemplaza la revisión profesional (S‑12), la hace más rápida.

### 4.5 Imágenes

Estándar fotográfico propuesto (basado en guías de Shopify/Google y en Baymard):

| Rol                  | Obligatoria | Especificación                                                           |
| -------------------- | ----------- | ------------------------------------------------------------------------ |
| Packshot frente      | ✅          | Fondo blanco o mist uniforme, producto ≥ 80 % del cuadro, 1:1, ≥ 1200 px |
| Ángulo / dorso       | ✅          | Dorso del envase legible (refuerza confianza y muestra INCI)             |
| Textura              | Recomendada | Swatch/gota sobre fondo neutro: clave en skincare                        |
| En uso / escala      | Recomendada | En mano o en piel: muestra tamaño real                                   |
| Rótulo / INCI        | Interna     | No se publica necesariamente; respaldo de los datos regulatorios         |
| Ambiente (lifestyle) | Opcional    | Máximo 1–2, después de las anteriores                                    |

Flujo: arrastrar varias fotos (o sacarlas con el celular) → subida directa a Storage → **worker del
VPS** genera AVIF/WebP en 4 anchos (ADR‑009) → chequeos automáticos con aviso (resolución mínima,
desenfoque, fondo no uniforme, producto muy chico en el cuadro, color fuera de rango) → **alt
sugerido** ("ROSATOPIC Sérum 30 ml de Sulderm, frasco gotero") editable → reordenar arrastrando,
elegir rol y punto focal. Antes/después de tratamientos: **no** (riesgo de claim terapéutico).

### 4.6 Depósito desde el celular

- **Recibir mercadería:** escanear EAN con la cámara (API `BarcodeDetector`, respaldo con lector JS)
  → aparece el producto → cantidad, **lote** y **vencimiento** (lector de fecha en el teclado
  numérico, formato MM/AAAA) → opción de asociarlo a una orden de compra → confirma. Si el EAN no
  existe, ofrece crear el producto en borrador con ese EAN.
- **Conteo cíclico:** el sistema propone 10 productos por día (los de más rotación primero),
  escanear y contar; las diferencias generan movimientos `count` con aprobación.
- **Preparar pedido:** lista de picking con **lote FEFO a sacar**, escaneo de verificación
  (evita mandar el producto equivocado) y botón "Despachado" que pide el código de seguimiento.

---

## 5. Automatizaciones (qué hace el sistema solo)

### 5.1 Inventario

| Automatización                | Disparador            | Resultado                                                                                        |
| ----------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Stock vendible por lote       | Cada movimiento       | Recalcula caché y revalida la ficha si pasa de 0 ↔ > 0                                           |
| Vencimientos                  | Job diario (pg_cron)  | Lotes a cuarentena/vencido; alerta a 90/60/30 días con valor en $                                |
| Punto de pedido               | Job diario            | `ROP = venta diaria × plazo del proveedor + stock de seguridad`; lista "pedir hoy" por proveedor |
| Borrador de orden de compra   | Botón en la alerta    | OC con cantidades sugeridas (hasta cubrir N días), exportable a PDF/WhatsApp para el proveedor   |
| Sin movimiento                | Semanal               | Productos sin ventas en 60/90 días → sugerir promo o bundle                                      |
| Avisame cuando vuelva (F9‑04) | Stock pasa de 0 a > 0 | Email (y WhatsApp si se suma) **en minutos**: la velocidad del aviso es lo que más convierte     |
| Recall por lote               | Acción del admin      | Lista de pedidos/clientes con ese lote, bloqueo del lote y plantilla de aviso                    |

Stock de seguridad: para una tienda chica alcanza con
`SS = (venta diaria máx × plazo máx) − (venta diaria prom × plazo prom)`; cuando haya 6+ meses de
historial se pasa a `SS = z × σ_demanda × √plazo` con nivel de servicio 95 % (z = 1,65).

### 5.2 Precios

- Precio sin impuestos nacionales **calculado** (no cargado a mano).
- Ajuste masivo ± % por marca/proveedor/categoría, **programable**, con redondeo y vista previa.
- **Importar lista de precios del proveedor** (CSV/Excel), coincidencia por EAN, muestra
  diferencias y margen resultante; alerta si el margen queda bajo un mínimo configurable.
- Historial de precios (sirve también para no "inflar el tachado" en promos: la regla de usar el
  menor precio de los últimos 30 días como referencia es una buena práctica de transparencia).

### 5.3 Contenido asistido por IA (con control humano)

- Entrada: nombre, marca, INCI, activos con %, ficha del fabricante (PDF/URL que el dueño pegue),
  preocupaciones y keywords objetivo de docs/16.
- Salida: borrador de los bloques de §3.3, alt de imágenes y meta SEO, en rioplatense y **pasado por
  el verificador de claims**. Corre en el VPS (servicio de integraciones), nunca bloquea al admin.
- El borrador queda en `content_status = draft`; **solo se publica tras revisión humana**
  (y profesional para fichas de preocupaciones sensibles). Se registra quién aprobó.
- Igual para el **OCR del rótulo**: la IA propone el INCI y los datos regulatorios desde la foto;
  el admin confirma.

### 5.4 Publicación y canales

- Al publicar/editar: revalidación por tag (ya existe), IndexNow, regeneración del feed de
  Google Merchant Center (S‑10, requiere EAN), sitemap con imágenes.
- Si un producto queda sin stock: sigue indexado con "Sin stock" + "Avisame" (no se despublica,
  para no perder SEO).

### 5.5 Resumen diario para el dueño

Un email/WhatsApp a las 8:00 con: pedidos a despachar, stock bajo, vencimientos próximos, fichas
pendientes de revisión y ventas de ayer. Un solo mensaje, accionable, con links al admin.

### 5.6 Siguientes (opcionales, con decisión del dueño)

| Integración                         | Valor                                                    | Requisito                                        |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| **Factura electrónica ARCA (WSFE)** | Factura automática al aprobarse el pago, PDF en el email | Condición fiscal, certificado digital, contador  |
| **Google Merchant Center**          | Listados gratuitos en Shopping                           | EAN en todos los productos, imágenes ≥ 500 px    |
| **Mercado Libre**                   | Más canal; stock único sincronizado desde Supabase       | Cuenta ML; ojo con stock multiorigen y Full      |
| Reseñas post‑compra                 | Prueba social + contenido para SEO                       | Política de moderación (sin claims terapéuticos) |

La regla para cualquier canal: **Supabase es la única fuente de verdad del stock**; los canales
reciben actualizaciones desde la cola del VPS (nunca desde Vercel, regla de 2,5 s).

---

## 6. Calidad de datos: puntaje de completitud

| Requisito                                            | Peso | Bloquea publicar |
| ---------------------------------------------------- | ---- | ---------------- |
| Nombre, marca, categoría, precio, contenido neto     | 15   | Sí               |
| Packshot principal válido (≥ 1200 px)                | 15   | Sí               |
| INCI completo                                        | 10   | Sí               |
| Nº inscripción ANMAT, titular, país de origen        | 10   | Sí               |
| Para qué sirve + cómo usar                           | 10   | Sí               |
| Sin términos prohibidos (verificador)                | —    | Sí               |
| EAN válido                                           | 8    | No               |
| Activos clave con % + preocupaciones + tipos de piel | 8    | No               |
| 3+ imágenes (ángulo, textura, en uso)                | 8    | No               |
| Peso y medidas (para cotizar envío)                  | 6    | No               |
| Precauciones, textura, qué esperar                   | 5    | No               |
| SEO (título/descr.) y alt en todas las imágenes      | 5    | No               |

≥ 90 % = "Ficha completa". El listado ordena las incompletas por ventas/visitas para atacar primero
las que más impacto tienen.

---

## 7. Indicadores (en el inicio del admin)

- **Quiebres de stock** (días‑producto sin stock) y ventas perdidas estimadas.
- **Merma por vencimiento** ($/mes) → objetivo: tender a 0.
- **Rotación** y **días de inventario** por marca.
- **Margen bruto** por producto/marca (con costo de lote).
- **Fichas completas** (%) y tiempo medio de carga de un producto nuevo (objetivo < 10 min).
- **Precisión de inventario** en conteos cíclicos (objetivo ≥ 98 %).
- Conversión de "Avisame" (medida propia; los benchmarks públicos varían de < 1 % a > 20 %).

---

## 8. Hoja de ruta propuesta

| Etapa    | Contenido                                                                                                                                                             | Días    | Mapea a backlog                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------- |
| **A**    | Modelo: proveedores, lotes, movimientos, historial de precios, campos regulatorios/EAN (+ variantes si aplica). Migración de stock actual a un "lote inicial". pgTAP. | 4       | nuevo INV‑01..04                      |
| **B**    | Admin productos: listado con completitud y filtros, editor por secciones con checklist, verificador de claims, precios masivos, import/export                         | 5       | F6‑03, F6‑04, F6‑06, F6‑15            |
| **C**    | Imágenes (uploader + worker AVIF + chequeos + alt) y asistente IA de contenido + OCR de rótulo                                                                        | 3,5     | F6‑05, F7‑01, F7‑02, S‑12             |
| **D**    | Depósito móvil (recibir, contar, preparar con FEFO), alertas, punto de pedido, OC, resumen diario, "Avisame"                                                          | 4       | F6‑02, F6‑13, F9‑04, nuevo INV‑05..08 |
| E (opc.) | Factura ARCA · Merchant Center · Mercado Libre                                                                                                                        | 3–6 c/u | S‑10, nuevos                          |

Cada etapa termina con su gate (docs/12) y pregunta de deploy a staging.

---

## 9. Decisiones que necesito del dueño

1. ¿Hay **tamaños/presentaciones** del mismo producto? (define si hacemos variantes ahora).
2. ¿Los proveedores entregan **lote y vencimiento** en el remito? ¿Cuántos proveedores y con qué
   plazo de entrega?
3. **Vida útil mínima para vender** (sugerido 6 meses) y qué hacer con lo que queda debajo
   (outlet con descuento, uso interno, devolución al proveedor).
4. ¿Se usa hoy algún sistema de gestión o facturación (Tango, Dux, planilla)? → importar en vez de
   cargar de cero.
5. Condición fiscal (monotributo / responsable inscripto) para la factura electrónica.
6. ¿Interesa vender en **Mercado Libre**?
7. ¿Quién revisa los textos (profesional de la salud/dermatología) y con qué frecuencia?
8. ¿Quién saca las fotos? (propongo una guía de una página y una sesión para las 50 actuales).

---

## Fuentes

- ANMAT — [Disposición 7809/2022, RTM de rotulado de cosméticos (argentina.gob.ar)](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-7809-2022-372252/texto)
- ANMAT — [Disposición 374/2006 (ecofield, texto de referencia)](https://www.ecofield.net/Legales/Gestion/disp374-06_ANMAT.html) · [Disp. 961/2025 (Boletín Oficial)](https://www.boletinoficial.gob.ar/detalleAviso/primera/321027/20250212) · [Disp. 4300/2026 (Boletín Oficial)](https://www.boletinoficial.gob.ar/detalleAviso/primera/344546/20260720) · [Disp. 6191/2020](https://www.boletinoficial.gob.ar/detalleAviso/primera/234057/20200825)
- ANMAT — [Disp. 4980/2005, publicidad de productos de venta libre (Min. Salud Córdoba)](https://ministeriodesalud.cba.gov.ar/wp-content/uploads/2021/10/DISP.-ANMAT-N°-4980-05-–-PUBLICIDAD-DE-PRODUCTOS-DE-VENTA-LIBRE.pdf) · [Cosméticos con propiedades terapéuticas prohibidos (Unidiversidad)](https://www.unidiversidad.com.ar/prohiben-la-venta-y-el-uso-de-cosmeticos-con-propiedades-terapeuticas) · [Boletín Oficial 18/06/2025](https://www.boletinoficial.gob.ar/detalleAviso/primera/306876/1)
- Ley 27.743 art. 99 — [Régimen de Transparencia Fiscal al Consumidor (Boletín Oficial)](https://www.boletinoficial.gob.ar/pdf/aviso/primera/319787/20250905) · [Cómo exhibir precios (El Heraldo)](https://www.elheraldo.com.ar/noticias/economia/como-deberan-exhibirse-los-precios-en-el-marco-del-regimen-de-transparencia-fiscal-al-consumidor)
- ARCA — [RG 5893/2026, ampliación de factura electrónica (iProfesional)](https://www.iprofesional.com/impuestos/451928-arca-y-facturacion-electronica-que-deben-cumplir-los-monotributistas) · [Factura electrónica 2026 (Contablix)](https://contablix.ar/blog/factura-electronica-argentina-2026) — verificar el texto oficial en ARCA.
- Google — [Merchant Center: especificación de datos de producto](https://support.google.com/merchants/answer/7052112?hl=en) · [Actualización 2026 de la especificación](https://support.google.com/merchants/answer/16989427?hl=en-GB) · [Calidad de datos y desaprobaciones](https://support.google.com/merchants/answer/13693497?hl=en)
- Baymard Institute — [Imágenes y texto descriptivo en la ficha](https://baymard.com/blog/product-images-descriptive-text) · [Estado del UX de fichas de producto](https://baymard.com/blog/current-state-ecommerce-product-page-ux) · [Auditoría Health & Beauty](https://marketing-site-q3myxf0uw-baymard.vercel.app/audits/health-and-beauty) · dato de "la mitad busca ingredientes" vía [eCommerce Fastlane](https://ecommercefastlane.com/shopify-beauty-product-page-gaps/) (segunda mano).
- Inventario con vencimiento/FEFO (fuentes de proveedores de software, tomar como orientación) — [DCL: inventario con vencimientos](https://dclcorp.com/blog/fulfillment/managing-expiration-dates/) · [Unicommerce: FEFO y lotes en cosmética](https://unicommerce.com/everything-ecommerce/how-do-i-manage-expiry-based-picking-like-fefo-batch-lot-control-especially-fmcg-cosmetics-pharma.md) · [Racklify: FEFO en cosmética](https://racklify.com/encyclopedia/fefo-first-expired-first-out-in-cosmetics-fulfillment/)
- Punto de pedido y stock de seguridad — [Netstock](https://www.netstock.com/blog/reorder-point-formula/) · [inFlow](https://www.inflowinventory.com/blog/safety-stock/) · [Prediko](https://www.prediko.io/blog/how-to-calculate-reorder-point)
- Fotografía de producto — [Shopify Help: fotografía de producto](https://help.shopify.com/en/manual/products/product-media/product-photography?locale=fr) · [Shopify: guía de fotografía](https://www.shopify.com.au/guides/product-photography/basics)
- "Avisame cuando vuelva" (datos de proveedores, orientativos) — [Notify Me!: velocidad del aviso](https://notify-me.io/reports/two-hour-window-restock-speed-conversion) · [Notify Me!: embudo de 100 pedidos](https://notify-me.io/reports/back-in-stock-funnel-100-requests) · [MarketingSherpa (2011)](https://marketingsherpa.com/article/case-study/backinstock-alert-emails-achieve-2245)
- Mercado Libre — [Sincronizar publicaciones](https://developers.mercadolibre.com.ar/servicio-sincroniza-publicaciones) · [Stock distribuido](https://developers.mercadolibre.com.ar/stock-distribuido)
