import { z } from "zod";

/** Validación del checkout: la misma en el formulario (cliente) y en la Server Action (servidor). */

export const PROVINCIAS = [
  "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

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
