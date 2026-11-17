import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Variables de entorno validadas. Todo lo que no empieza con NEXT_PUBLIC_ es solo servidor.
 * En CI sin secretos reales se puede saltear la validación con SKIP_ENV_VALIDATION=1.
 */
export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    REVALIDATE_SECRET: z.string().min(16).optional(),
    // Firma HMAC de la cookie del carrito (obligatoria en producción; ver lib/cart/server.ts)
    CART_SECRET: z.string().min(32).optional(),
    CRON_SECRET: z.string().min(16).optional(),
    // Mercado Pago (ADR-002). Credenciales TEST en local/staging, productivas solo en producción.
    MERCADOPAGO_ACCESS_TOKEN: z
      .string()
      .regex(/^(TEST|APP_USR)-/)
      .optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(16).optional(),
    // Habilita la RPC place_order (la base guarda solo su hash en private.server_keys).
    CHECKOUT_SERVER_KEY: z.string().min(32).optional(),
    // Emails (Resend). Sin clave, los envíos se registran en el log y no salen.
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    EMAIL_FROM: z.string().min(3).optional(),
    EMAIL_ADMIN_NOTIFICATIONS: z.string().optional(),
    INTEGRATIONS_URL: z.url().optional(),
    INTEGRATIONS_HMAC_SECRET: z.string().min(32).optional(),
    INTEGRATIONS_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
    SENTRY_DSN: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    CART_SECRET: process.env.CART_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    CHECKOUT_SERVER_KEY: process.env.CHECKOUT_SERVER_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_ADMIN_NOTIFICATIONS: process.env.EMAIL_ADMIN_NOTIFICATIONS,
    INTEGRATIONS_URL: process.env.INTEGRATIONS_URL,
    INTEGRATIONS_HMAC_SECRET: process.env.INTEGRATIONS_HMAC_SECRET,
    INTEGRATIONS_TIMEOUT_MS: process.env.INTEGRATIONS_TIMEOUT_MS,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});
