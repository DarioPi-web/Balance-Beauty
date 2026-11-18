import "server-only";
import { checkoutServerKey, isSupabaseConfigured } from "@/lib/orders/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Credenciales de integraciones: se cargan desde /admin/integraciones (cifradas en Supabase
 * Vault, migración 8) y se leen acá con la clave de servidor. Si una no está cargada en el
 * admin, se usa la variable de entorno equivalente (respaldo / desarrollo).
 * Caché en memoria de 60 s por instancia: un cambio en el admin se nota en ≤ 1 min
 * (y al instante en la instancia que lo guardó, ver invalidateIntegrationSettings).
 */
export const INTEGRATION_KEYS = [
  "mercadopago_access_token",
  "mercadopago_webhook_secret",
  "andreani_env",
  "andreani_user",
  "andreani_password",
  "andreani_client",
  "andreani_contract_home",
  "andreani_contract_branch",
  "andreani_origin_branch",
  "resend_api_key",
  "email_from",
  "email_admin_notifications",
] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

const ENV_FALLBACK: Partial<Record<IntegrationKey, string>> = {
  mercadopago_access_token: "MERCADOPAGO_ACCESS_TOKEN",
  mercadopago_webhook_secret: "MERCADOPAGO_WEBHOOK_SECRET",
  resend_api_key: "RESEND_API_KEY",
  email_from: "EMAIL_FROM",
  email_admin_notifications: "EMAIL_ADMIN_NOTIFICATIONS",
};

const TTL_MS = 60_000;
let cache: { at: number; data: Partial<Record<IntegrationKey, string>> } | null = null;

async function loadFromDb(): Promise<Partial<Record<IntegrationKey, string>>> {
  const key = checkoutServerKey();
  if (!key || !isSupabaseConfigured()) return {};
  const { data, error } = await createSupabasePublicClient().rpc("get_integration_secrets", {
    p_server_key: key,
  });
  if (error) {
    console.error(JSON.stringify({ event: "settings.integrations.error", code: error.code }));
    return cache?.data ?? {};
  }
  return (data ?? {}) as Partial<Record<IntegrationKey, string>>;
}

export async function getIntegrationSettings(): Promise<Partial<Record<IntegrationKey, string>>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const data = await loadFromDb();
  cache = { at: Date.now(), data };
  return data;
}

/** Valor efectivo: el del admin; si no hay, la variable de entorno equivalente. */
export async function getIntegrationSetting(name: IntegrationKey): Promise<string | undefined> {
  const fromDb = (await getIntegrationSettings())[name];
  if (fromDb) return fromDb;
  const envName = ENV_FALLBACK[name];
  return envName ? process.env[envName] || undefined : undefined;
}

export function invalidateIntegrationSettings() {
  cache = null;
}
