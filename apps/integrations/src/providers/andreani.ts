import { andreaniConfigured, type Config } from "../config.js";
import {
  ProviderError,
  ProviderNotConfiguredError,
  type QuoteRequest,
  type ShippingProvider,
  type ShippingQuote,
} from "./types.js";

/**
 * Adaptador Andreani (API pública de Andreani, docs/13).
 * - Login: GET /login con Basic auth → token en el header `x-authorization-token` (≈24 h).
 * - Cotización: GET /v1/tarifas?cpDestino&contrato&cliente[&sucursalOrigen]&bultos[i][...]
 *   → `tarifaConIva.total`.
 * ⚠️ Rutas y campos según la documentación pública: validar contra el entorno QA con las
 * credenciales reales antes de producción (tests/andreani.test.ts fija el formato esperado).
 */
export const ANDREANI_BASE = {
  sandbox: "https://apisqa.andreani.com",
  production: "https://apis.andreani.com",
} as const;

type FetchLike = typeof fetch;

/** `source`: configuración fija o una función que la resuelve (admin + .env, ver remote-settings). */
export function createAndreani(
  source: Config | (() => Promise<Config>),
  fetchImpl: FetchLike = fetch,
): ShippingProvider {
  const resolve = typeof source === "function" ? source : async () => source;
  let token: { value: string; expiresAt: number; key: string } | null = null;

  async function call(config: Config, url: string, init: RequestInit = {}) {
    return fetchImpl(url, { ...init, signal: AbortSignal.timeout(config.ANDREANI_TIMEOUT_MS) });
  }

  async function getToken(config: Config): Promise<string> {
    const base = ANDREANI_BASE[config.ANDREANI_ENV];
    const key = `${config.ANDREANI_ENV}:${config.ANDREANI_USER}`; // si cambian las credenciales, nuevo login
    if (token && token.key === key && token.expiresAt > Date.now()) return token.value;
    const basic = Buffer.from(`${config.ANDREANI_USER}:${config.ANDREANI_PASSWORD}`).toString(
      "base64",
    );
    const res = await call(config, `${base}/login`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const value = res.headers.get("x-authorization-token");
    if (!res.ok || !value) throw new ProviderError("Andreani: login rechazado", res.status);
    token = { value, key, expiresAt: Date.now() + 20 * 60 * 60 * 1000 }; // renovar antes de las 24 h
    return value;
  }

  return {
    carrier: "andreani",
    async quote(req: QuoteRequest): Promise<ShippingQuote> {
      const config = await resolve();
      const base = ANDREANI_BASE[config.ANDREANI_ENV];
      if (!andreaniConfigured(config)) throw new ProviderNotConfiguredError("andreani");
      const contract =
        req.method === "home_delivery"
          ? config.ANDREANI_CONTRACT_HOME
          : config.ANDREANI_CONTRACT_BRANCH;
      if (!contract) throw new ProviderNotConfiguredError(`andreani (${req.method})`);

      const params = new URLSearchParams({
        cpDestino: req.postalCode,
        contrato: contract,
        cliente: config.ANDREANI_CLIENT!,
      });
      if (config.ANDREANI_ORIGIN_BRANCH)
        params.set("sucursalOrigen", config.ANDREANI_ORIGIN_BRANCH);
      req.packages.forEach((p, i) => {
        params.set(`bultos[${i}][valorDeclarado]`, String(p.declaredValue));
        params.set(`bultos[${i}][volumen]`, String(p.volumeCm3));
        params.set(`bultos[${i}][kilos]`, (p.weightG / 1000).toFixed(3));
      });

      const res = await call(config, `${base}/v1/tarifas?${params}`, {
        headers: { "x-authorization-token": await getToken(config) },
      });
      if (res.status === 401) token = null; // se renueva en el próximo intento
      if (!res.ok) throw new ProviderError(`Andreani: tarifa ${res.status}`, res.status);
      const data = (await res.json()) as { tarifaConIva?: { total?: string | number } };
      const total = Number(data.tarifaConIva?.total);
      if (!Number.isFinite(total) || total <= 0)
        throw new ProviderError("Andreani: respuesta sin tarifa");
      return { carrier: "andreani", method: req.method, price: Math.ceil(total) };
    },
  };
}
