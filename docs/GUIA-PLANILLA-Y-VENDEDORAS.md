# Guía: edición por Excel y vendedoras

> Para el dueño y quien administre la tienda. Técnico: migración
> `supabase/migrations/20261119000017_sellers_and_bulk_products.sql`, [03](03-modelo-de-datos.md).

## 1. Editar productos con Excel

**Admin → Productos → “Editar con Excel (precios, stock, medidas…)”** (`/admin/productos/planilla`).

1. **Descargar planilla (.xlsx).** Trae todos los productos con sus datos actuales.
2. Editala en Excel, Google Sheets o LibreOffice y guardala como **.xlsx**.
   - Columnas verdes = se pueden editar: nombre, estado, precio, precio anterior (tachado),
     stock, aviso de stock bajo, peso (g), largo/ancho/alto (cm), “para qué sirve” y comisión
     de vendedora por producto (%).
   - Columnas grises = referencia: **código** (identifica el producto, no cambiarlo) y marca.
   - Precios en pesos sin decimales (`12.100` o `12100`); medidas con decimales (`5,5`).
   - Cada celda tiene una nota con lo que admite; la hoja “Cómo usarla” lo resume.
3. **Subila → “Revisar cambios”.** Se muestra producto por producto qué cambia (antes → después).
   Si hay errores (código inexistente o repetido, número inválido, tachado menor al precio),
   se listan con el número de fila y **no se puede aplicar** hasta corregirlos.
4. **Aplicar.** Todo o nada: si algo falla, no se modifica ningún producto.
   - **Stock:** si sube, se suma como lote `PLANILLA` (sin vencimiento); si baja, sale del lote
     que vence primero. Queda en el historial de movimientos de cada producto.
   - **Publicar:** si se pone “Publicado” a un producto sin foto, precio o categoría, se aplica
     el resto y ese producto queda como estaba (se avisa cuáles).
   - Los productos nuevos y las fotos se cargan desde el editor de cada producto.

## 2. Vendedoras

### Alta (admin)

**Admin → Vendedoras** (`/admin/vendedoras`) → **+ Nueva vendedora**: nombre, email, celular,
**comisión %** (por producto vendido, sobre el precio neto después del descuento) y datos de
cobro (CBU/alias).

Para que pueda ingresar: **Supabase → Authentication → Users → Add user** con el **mismo email**,
una contraseña temporal y “Auto Confirm User”. Al ingresar en `/ingresar` va directo a su panel
(`/vendedora`); el sistema la vincula por email.

### Códigos de descuento

En la tarjeta de cada vendedora → **Agregar código**: código (4–20 letras/números/guiones, ej.
`VERO10`), % de descuento para la clienta, compra mínima y vencimiento (opcionales). Se puede
**pausar/activar**. Si la vendedora se desactiva, sus códigos dejan de funcionar.

La clienta carga el código en el checkout (“Código de descuento” → Aplicar). Orden de descuentos:
primero el código sobre el subtotal; después el 10 % de transferencia sobre lo que queda.

### Comisiones

| Estado       | Cuándo                                               |
| ------------ | ---------------------------------------------------- |
| **En curso** | El pedido se pagó (o está en preparación/despachado) |
| **A cobrar** | El pedido se **entregó**                             |
| **Cobrada**  | Se registró la liquidación                           |
| **Anulada**  | El pedido se canceló antes de liquidarse             |

Comisión por producto = precio neto del producto (con su parte del descuento del código) × % de
la vendedora, o el % propio del producto si se cargó (columna “Comisión vendedora (%)” en la
planilla).

### Liquidar (pagarle)

En la tarjeta de la vendedora aparece **“Liquidar $ X”** cuando tiene comisiones a cobrar.
Transferile, completá medio y comprobante, tildá “Ya le transferí” y **Registrar liquidación**:
todas sus comisiones “a cobrar” pasan a “cobradas” y quedan en su historial.

### Panel de la vendedora (`/vendedora`)

Ve solo lo suyo: a cobrar, en curso, comisión del mes, cobrado; sus códigos (copiar / compartir
por WhatsApp); sus ventas con el detalle por producto (de la clienta solo el nombre de pila);
sus liquidaciones; y puede actualizar sus datos de cobro. Funciona en el celular.

## Seguridad

- Todo pasa por funciones de la base que verifican el rol: solo admin edita productos, crea
  vendedoras, códigos y liquidaciones; cada vendedora lee solo sus filas (RLS).
- El código de descuento lo valida y aplica la base al crear el pedido (el navegador no decide
  precios). La vista previa del checkout usa la clave de servidor.
- La planilla se valida dos veces (al revisar y al aplicar) y se aplica en una transacción.
