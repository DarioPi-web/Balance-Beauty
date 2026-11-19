import { afterEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return (await import("@/lib/site-url")).SITE_URL;
};

const clear = () => {
  for (const k of [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_VERCEL_ENV",
    "VERCEL_ENV",
    "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "NEXT_PUBLIC_VERCEL_URL",
    "VERCEL_URL",
  ])
    vi.stubEnv(k, "");
};

describe("URL pública del sitio", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("usa NEXT_PUBLIC_SITE_URL si está, sin barra final", async () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://balancebeauty.com.ar/");
    vi.stubEnv("VERCEL_URL", "x.vercel.app");
    expect(await load()).toBe("https://balancebeauty.com.ar");
  });

  it("en producción de Vercel usa el dominio de producción", async () => {
    clear();
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "balancebeauty.com.ar");
    vi.stubEnv("VERCEL_URL", "balance-beauty-abc.vercel.app");
    expect(await load()).toBe("https://balancebeauty.com.ar");
  });

  it("en staging (preview) usa la URL del deploy", async () => {
    clear();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "balance-beauty-abc.vercel.app");
    expect(await load()).toBe("https://balance-beauty-abc.vercel.app");
  });

  it("en local, localhost:3000", async () => {
    clear();
    expect(await load()).toBe("http://localhost:3000");
  });
});
