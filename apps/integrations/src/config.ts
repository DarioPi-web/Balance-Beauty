import { z } from "zod";

/**
 * Configuración por variables de entorno (en el VPS: archivo .env fuera del repo).
 * Andreani queda deshabilitado mientras falten credenciales: el servicio arranca igual y
 * responde "proveedor no configurado", y la web usa la tarifa plana (fallback).
 */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  /** Mismo secreto que INTEGRATIONS_HMAC_SECRET en Vercel. */
  INTEGRATIONS_HMAC_SECRET: z.string().min(32),
  ANDREANI_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  ANDREANI_USER: z.string().optional(),
  ANDREANI_PASSWORD: z.string().optional(),
  /** Código de cliente (ej. CL0001234). */
  ANDREANI_CLIENT: z.string().optional(),
  /** Contrato del servicio "envío a domicilio". */
  ANDREANI_CONTRACT_HOME: z.string().optional(),
  /** Contrato del servicio "retiro en sucursal". */
  ANDREANI_CONTRACT_BRANCH: z.string().optional(),
  /** Sucursal de origen (donde se despacha), si el contrato lo requiere. */
  ANDREANI_ORIGIN_BRANCH: z.string().optional(),
  ANDREANI_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  /** Opcional: leer las credenciales cargadas en /admin/integraciones (Supabase). */
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  /** Misma clave que CHECKOUT_SERVER_KEY de la web. */
  APP_SERVER_KEY: z.string().min(32).optional(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Configuración inválida (${fields}). Ver apps/integrations/.env.example`);
  }
  return parsed.data;
}

export const andreaniConfigured = (c: Config) =>
  Boolean(
    c.ANDREANI_USER &&
    c.ANDREANI_PASSWORD &&
    c.ANDREANI_CLIENT &&
    (c.ANDREANI_CONTRACT_HOME || c.ANDREANI_CONTRACT_BRANCH),
  );
