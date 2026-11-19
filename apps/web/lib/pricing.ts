/**
 * Reglas de precio puras (sin I/O) para poder testearlas y reutilizarlas en servidor.
 * Montos en pesos enteros (ARS sin decimales). El cálculo definitivo del pedido
 * se repite en la RPC place_order: esto es para mostrar.
 */

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return arsFormatter.format(Math.round(amount));
}

/** Precio con descuento por medio de pago (p. ej. 10 % transferencia/QR). Redondea hacia abajo. */
export function priceWithPaymentDiscount(price: number, percent: number): number {
  if (!Number.isFinite(price) || price < 0) throw new RangeError("precio inválido");
  if (percent < 0 || percent > 100) throw new RangeError("porcentaje inválido");
  return Math.floor((price * (100 - percent)) / 100);
}

/** IVA general (cosméticos). Única fuente: la base usa el mismo 21 % (migraciones 10/11). */
export const VAT_PERCENT = 21;

/**
 * "Precio sin impuestos nacionales" (Ley 27.743 art. 99): precio final sin IVA, redondeado
 * igual que la base (round(precio / 1,21)).
 */
export function priceWithoutNationalTaxes(price: number): number {
  if (!Number.isFinite(price) || price < 0) throw new RangeError("precio inválido");
  return Math.round(price / (1 + VAT_PERCENT / 100));
}

/** Valor de cada cuota sin interés, redondeado hacia arriba para no mostrar menos de lo real. */
export function installmentAmount(total: number, installments: number): number {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new RangeError("cantidad de cuotas inválida");
  }
  return Math.ceil(total / installments);
}

/** Cuánto falta para alcanzar un umbral (cuotas, envío gratis). 0 si ya se alcanzó. */
export function remainingToThreshold(subtotal: number, threshold: number): number {
  return Math.max(0, threshold - subtotal);
}
