import { z } from "zod";
import { PROVINCIAS } from "./provincias";

/**
 * Validación del checkout (servidor: Server Action placeOrder). No importar desde componentes
 * cliente: arrastra Zod al bundle. La lista de provincias está en ./provincias.
 */
export { PROVINCIAS };

const trimmed = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, "Demasiado largo");

const contact = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  fullName: trimmed(3, 120, "Ingresá tu nombre y apellido").refine(
    (v) => v.includes(" "),
    "Ingresá nombre y apellido",
  ),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s\-().]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(\+?54)?9?\d{10}$/, "Ingresá un celular con código de área (ej. 11 2345 6789)"),
    ),
  dni: z
    .string()
    .trim()
    .transform((v) => v.replace(/\./g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "Ingresá tu DNI sin puntos (7 u 8 números)")),
});

/** CP argentino: 4 dígitos (1425) o CPA (C1425ABC). Se normaliza a mayúsculas. */
export const postalCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^([A-Z]\d{4}[A-Z]{3}|\d{4})$/, "Código postal inválido (ej. 1425 o C1425ABC)");

const address = z.object({
  street: trimmed(2, 120, "Ingresá la calle"),
  number: z
    .string()
    .trim()
    .regex(/^\d{1,6}[A-Za-z]?$|^S\/?N$/i, "Ingresá la altura (o S/N)"),
  floorApt: z.string().trim().max(40).optional().or(z.literal("")),
  city: trimmed(2, 80, "Ingresá la localidad"),
  province: z.enum(PROVINCIAS, { message: "Elegí la provincia" }),
  postalCode,
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const checkoutSchema = z
  .discriminatedUnion("shippingMethod", [
    contact.extend({ shippingMethod: z.literal("home_delivery"), address }),
    contact.extend({
      shippingMethod: z.literal("branch_pickup"),
      address: address.pick({ postalCode: true, city: true, province: true }),
    }),
  ])
  .and(
    z.object({
      paymentMethod: z.enum(["mercadopago", "bank_transfer"], { message: "Elegí cómo pagar" }),
      acceptTerms: z.literal(true, { message: "Tenés que aceptar los términos y condiciones" }),
      marketingOptIn: z.boolean().default(false),
    }),
  );

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

/**
 * FormData del formulario (campos planos) → objeto para checkoutSchema. Los valores son
 * strings sin validar: el tipo de retorno es nominal y quien lo usa SIEMPRE pasa por safeParse.
 */
export function checkoutFromFormData(fd: FormData): CheckoutInput {
  const shippingMethod = str(fd, "shippingMethod");
  const common = {
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    province: str(fd, "province"),
  };
  const raw = {
    email: str(fd, "email"),
    fullName: str(fd, "fullName"),
    phone: str(fd, "phone"),
    dni: str(fd, "dni"),
    shippingMethod,
    address:
      shippingMethod === "branch_pickup"
        ? common
        : {
            ...common,
            street: str(fd, "street"),
            number: str(fd, "number"),
            floorApt: str(fd, "floorApt"),
            notes: str(fd, "notes"),
          },
    paymentMethod: str(fd, "paymentMethod"),
    acceptTerms: fd.get("acceptTerms") === "on",
    marketingOptIn: fd.get("marketingOptIn") === "on",
  };
  return raw as unknown as CheckoutInput;
}

/** Errores de Zod → { campo: mensaje } con el nombre del input (address.postalCode → postalCode). */
export function checkoutFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[issue.path.length - 1] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Medio de pago del formulario → enum payment_method de la base. */
export const PAYMENT_METHOD_DB = { mercadopago: "card", bank_transfer: "bank_transfer" } as const;

/** Datos validados + líneas del carrito → JSON que recibe la RPC place_order. */
export function toPlaceOrderPayload(data: CheckoutData, lines: { slug: string; qty: number }[]) {
  const a = data.address as Record<string, string | undefined>;
  return {
    email: data.email,
    full_name: data.fullName,
    phone: data.phone,
    dni: data.dni,
    shipping_method: data.shippingMethod,
    payment_method: PAYMENT_METHOD_DB[data.paymentMethod],
    customer_note: a.notes || null,
    marketing_opt_in: data.marketingOptIn,
    address: {
      street: a.street ?? null,
      number: a.number ?? null,
      floor_apt: a.floorApt || null,
      city: a.city,
      province: a.province,
      postal_code: a.postalCode,
    },
    items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
  };
}
