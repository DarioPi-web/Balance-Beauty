import { z } from "zod";

/** Pedido de cotización (lo que manda la web). Montos en ARS enteros, peso en gramos. */
export const quoteRequestSchema = z.object({
  postalCode: z.string().regex(/^\d{4}$/, "CP de 4 dígitos"),
  method: z.enum(["home_delivery", "branch_pickup"]),
  /** Bultos: peso y medidas reales (los productos sin datos usan el default de la web). */
  packages: z
    .array(
      z.object({
        weightG: z.number().int().positive().max(30_000),
        volumeCm3: z.number().int().positive().max(200_000),
        declaredValue: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(10),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export type ShippingQuote = {
  carrier: "andreani" | "correo_argentino";
  method: QuoteRequest["method"];
  /** Precio final con IVA, ARS enteros. */
  price: number;
  etaDays?: string;
};

/** Interfaz común de los correos (docs/13 §Integraciones de envío). */
export interface ShippingProvider {
  readonly carrier: ShippingQuote["carrier"];
  quote(req: QuoteRequest): Promise<ShippingQuote>;
  // Próximas etapas: branches(), createShipment(), label(), track().
}

export class ProviderNotConfiguredError extends Error {
  constructor(carrier: string) {
    super(`${carrier}: faltan credenciales`);
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
