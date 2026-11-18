import type { Config } from "./config.js";

/**
 * Credenciales cargadas en /admin/integraciones (Supabase Vault, migración 8).
 * El VPS las lee con la misma clave de servidor que usa la web (RPC get_integration_secrets)
 * y las combina con su .env: lo cargado en el admin tiene prioridad.
 * Si Supabase no está configurado o falla, sigue con el .env (y con la última copia buena).
 */
const MAP: Record<string, keyof Config> = {
  andreani_env: "ANDREANI_ENV",
  andreani_user: "ANDREANI_USER",
  andreani_password: "ANDREANI_PASSWORD",
  andreani_client: "ANDREANI_CLIENT",
  andreani_contract_home: "ANDREANI_CONTRACT_HOME",
  andreani_contract_branch: "ANDREANI_CONTRACT_BRANCH",
  andreani_origin_branch: "ANDREANI_ORIGIN_BRANCH",
};

export function mergeRemote(
  base: Config,
  remote: Record<string, string | null | undefined>,
): Config {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(remote)) {
    const target = MAP[k];
    if (!target || !v) continue;
    if (target === "ANDREANI_ENV" && v !== "sandbox" && v !== "production") continue;
    out[target] = v;
  }
  return out as Config;
}

export function createSettingsSource(
  base: Config,
  opts: { fetchImpl?: typeof fetch; ttlMs?: number } = {},
): () => Promise<Config> {
  const ttl = opts.ttlMs ?? 5 * 60 * 1000;
  let cached: { at: number; config: Config } | null = null;
  return async () => {
    if (!base.SUPABASE_URL || !base.SUPABASE_ANON_KEY || !base.APP_SERVER_KEY) return base;
    if (cached && Date.now() - cached.at < ttl) return cached.config;
    try {
      const res = await (opts.fetchImpl ?? fetch)(
        `${base.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/get_integration_secrets`,
        {
          method: "POST",
          headers: {
            apikey: base.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${base.SUPABASE_ANON_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ p_server_key: base.APP_SERVER_KEY }),
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!res.ok) throw new Error(`Supabase ${res.status}`);
      const config = mergeRemote(base, (await res.json()) as Record<string, string>);
      cached = { at: Date.now(), config };
      return config;
    } catch (e) {
      console.warn(JSON.stringify({ event: "settings.remote.error", error: String(e) }));
      return cached?.config ?? base;
    }
  };
}
