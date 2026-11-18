import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveQuote } from "@/lib/shipping/integrations-client";

vi.mock("server-only", () => ({}));

const secret = "s".repeat(40);
const req = {
  postalCode: "1425",
  method: "home_delivery" as const,
  packages: [{ weightG: 450, volumeCm3: 1200, declaredValue: 32000 }],
};

describe("cliente del servicio de integraciones", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sin configuración no llama y devuelve null (fallback a tarifa plana)", async () => {
    vi.stubEnv("INTEGRATIONS_URL", "");
    const fetchImpl = vi.fn();
    expect(await fetchLiveQuote(req, { fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("firma el pedido con el mismo algoritmo que el VPS y devuelve la cotización", async () => {
    vi.stubEnv("INTEGRATIONS_URL", "https://int.example.com/");
    vi.stubEnv("INTEGRATIONS_HMAC_SECRET", secret);
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return Response.json({
        quotes: [{ carrier: "andreani", method: "home_delivery", price: 7846 }],
      });
    }) as unknown as typeof fetch;

    const q = await fetchLiveQuote(req, { fetchImpl, now: () => 1_800_000_000_000 });
    expect(q).toEqual({ carrier: "andreani", method: "home_delivery", price: 7846 });
    expect(captured!.url).toBe("https://int.example.com/shipping/quote");
    const h = captured!.init.headers as Record<string, string>;
    const expected = createHmac("sha256", secret)
      .update(`1800000000000.${captured!.init.body as string}`)
      .digest("hex");
    expect(h["x-timestamp"]).toBe("1800000000000");
    expect(h["x-signature"]).toBe(expected);
  });

  it("si el VPS falla o tarda, devuelve null sin lanzar", async () => {
    vi.stubEnv("INTEGRATIONS_URL", "https://int.example.com");
    vi.stubEnv("INTEGRATIONS_HMAC_SECRET", secret);
    const failing = (async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    const unavailable = (async () =>
      new Response(null, { status: 503 })) as unknown as typeof fetch;
    expect(await fetchLiveQuote(req, { fetchImpl: failing })).toBeNull();
    expect(await fetchLiveQuote(req, { fetchImpl: unavailable })).toBeNull();
  });
});
