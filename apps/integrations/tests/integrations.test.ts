import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { sign, verify, WINDOW_MS } from "../src/hmac.js";
import { createAndreani } from "../src/providers/andreani.js";

const secret = "s".repeat(40);
const baseEnv = { INTEGRATIONS_HMAC_SECRET: secret } as NodeJS.ProcessEnv;
const fullEnv = {
  ...baseEnv,
  ANDREANI_USER: "usuario",
  ANDREANI_PASSWORD: "clave",
  ANDREANI_CLIENT: "CL0001234",
  ANDREANI_CONTRACT_HOME: "400006709",
  ANDREANI_CONTRACT_BRANCH: "400006710",
} as NodeJS.ProcessEnv;

const req = {
  postalCode: "1425",
  method: "home_delivery" as const,
  packages: [{ weightG: 450, volumeCm3: 1200, declaredValue: 32000 }],
};

describe("firma HMAC (contrato Vercel ↔ VPS)", () => {
  it("acepta la firma correcta y rechaza alteraciones, faltantes y vencidas", () => {
    const ts = String(Date.now());
    const body = JSON.stringify(req);
    expect(verify({ secret, signature: sign(secret, ts, body), timestamp: ts, body })).toBe("ok");
    expect(
      verify({ secret, signature: sign(secret, ts, body), timestamp: ts, body: body + " " }),
    ).toBe("invalid");
    expect(verify({ secret, signature: null, timestamp: ts, body })).toBe("missing");
    const old = String(Date.now() - WINDOW_MS - 1000);
    expect(verify({ secret, signature: sign(secret, old, body), timestamp: old, body })).toBe(
      "expired",
    );
  });
});

describe("adaptador Andreani", () => {
  it("hace login, cotiza con los parámetros esperados y redondea el total con IVA", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      if (url.endsWith("/login"))
        return new Response(null, { status: 200, headers: { "x-authorization-token": "tok-1" } });
      return Response.json({ tarifaConIva: { total: "7845.31" } });
    }) as typeof fetch;

    const andreani = createAndreani(loadConfig(fullEnv), fake);
    const q1 = await andreani.quote(req);
    await andreani.quote(req); // reutiliza el token

    expect(q1).toEqual({ carrier: "andreani", method: "home_delivery", price: 7846 });
    expect(calls.filter((c) => c.url.endsWith("/login"))).toHaveLength(1);
    expect(calls[0].url).toBe("https://apisqa.andreani.com/login");
    const tarifa = new URL(calls[1].url);
    expect(tarifa.pathname).toBe("/v1/tarifas");
    expect(Object.fromEntries(tarifa.searchParams)).toMatchObject({
      cpDestino: "1425",
      contrato: "400006709",
      cliente: "CL0001234",
      "bultos[0][kilos]": "0.450",
      "bultos[0][volumen]": "1200",
      "bultos[0][valorDeclarado]": "32000",
    });
    expect(calls[1].headers["x-authorization-token"]).toBe("tok-1");
  });

  it("sin credenciales no llama a Andreani", async () => {
    const andreani = createAndreani(loadConfig(baseEnv), (() => {
      throw new Error("no debería llamar");
    }) as unknown as typeof fetch);
    await expect(andreani.quote(req)).rejects.toThrow("faltan credenciales");
  });
});

describe("API /shipping/quote", () => {
  const signed = (body: string) => {
    const ts = String(Date.now());
    return {
      "x-timestamp": ts,
      "x-signature": sign(secret, ts, body),
      "content-type": "application/json",
    };
  };

  it("/health es público e informa si Andreani está configurado", async () => {
    const res = await createApp(loadConfig(baseEnv)).request("/health");
    expect(await res.json()).toEqual({ ok: true, providers: { andreani: "sin configurar" } });
  });

  it("rechaza pedidos sin firma (401) y sin credenciales responde 503", async () => {
    const app = createApp(loadConfig(baseEnv));
    const body = JSON.stringify(req);
    expect((await app.request("/shipping/quote", { method: "POST", body })).status).toBe(401);
    expect(
      (await app.request("/shipping/quote", { method: "POST", body, headers: signed(body) }))
        .status,
    ).toBe(503);
  });

  it("con firma válida devuelve la cotización", async () => {
    const app = createApp(loadConfig(fullEnv), {
      andreani: {
        carrier: "andreani",
        quote: async (r) => ({ carrier: "andreani", method: r.method, price: 7846 }),
      },
    });
    const body = JSON.stringify(req);
    const res = await app.request("/shipping/quote", {
      method: "POST",
      body,
      headers: signed(body),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      quotes: [{ carrier: "andreani", method: "home_delivery", price: 7846 }],
    });
  });

  it("valida el pedido (CP inválido → 400)", async () => {
    const app = createApp(loadConfig(fullEnv));
    const body = JSON.stringify({ ...req, postalCode: "C1425" });
    expect(
      (await app.request("/shipping/quote", { method: "POST", body, headers: signed(body) }))
        .status,
    ).toBe(400);
  });
});

describe("credenciales desde el administrador", () => {
  it("lo cargado en el admin tiene prioridad sobre el .env y se ignoran valores inválidos", async () => {
    const { mergeRemote } = await import("../src/remote-settings.js");
    const merged = mergeRemote(loadConfig(fullEnv), {
      andreani_user: "desde-admin",
      andreani_env: "otra-cosa",
      mercadopago_access_token: "no-aplica-al-vps",
    });
    expect(merged.ANDREANI_USER).toBe("desde-admin");
    expect(merged.ANDREANI_ENV).toBe("sandbox");
    expect(merged.ANDREANI_PASSWORD).toBe("clave");
  });

  it("lee la RPC con la clave de servidor y, si Supabase falla, sigue con el .env", async () => {
    const { createSettingsSource } = await import("../src/remote-settings.js");
    const env = {
      ...fullEnv,
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      APP_SERVER_KEY: "k".repeat(40),
    } as NodeJS.ProcessEnv;
    let body = "";
    const ok = createSettingsSource(loadConfig(env), {
      fetchImpl: (async (_u: string, init: RequestInit) => {
        body = init.body as string;
        return Response.json({ andreani_client: "CL9999999" });
      }) as unknown as typeof fetch,
    });
    expect((await ok()).ANDREANI_CLIENT).toBe("CL9999999");
    expect(JSON.parse(body)).toEqual({ p_server_key: "k".repeat(40) });

    const failing = createSettingsSource(loadConfig(env), {
      fetchImpl: (async () => new Response(null, { status: 500 })) as unknown as typeof fetch,
    });
    expect((await failing()).ANDREANI_CLIENT).toBe("CL0001234");
  });
});
