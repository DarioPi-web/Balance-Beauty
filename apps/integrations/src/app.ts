import { Hono } from "hono";
import { andreaniConfigured, type Config } from "./config.js";
import { verify } from "./hmac.js";
import { createAndreani } from "./providers/andreani.js";
import { createSettingsSource } from "./remote-settings.js";
import {
  ProviderError,
  ProviderNotConfiguredError,
  quoteRequestSchema,
  type ShippingProvider,
} from "./providers/types.js";

/**
 * API síncrona del VPS (docs/13): /health (público) y /shipping/quote (firmado con HMAC).
 * Las respuestas de error son cortas y sin detalles internos; el detalle va al log.
 */
export function createApp(config: Config, deps: { andreani?: ShippingProvider } = {}) {
  const settings = createSettingsSource(config);
  const andreani = deps.andreani ?? createAndreani(settings);
  const app = new Hono();

  app.get("/health", async (c) => {
    const current = await settings();
    return c.json({
      ok: true,
      providers: {
        andreani: andreaniConfigured(current) ? current.ANDREANI_ENV : "sin configurar",
      },
    });
  });

  // Todo lo que no es /health exige firma.
  app.use("/shipping/*", async (c, next) => {
    const body = await c.req.text();
    const result = verify({
      secret: config.INTEGRATIONS_HMAC_SECRET,
      signature: c.req.header("x-signature"),
      timestamp: c.req.header("x-timestamp"),
      body,
    });
    if (result !== "ok") return c.json({ error: "firma inválida" }, 401);
    c.set("rawBody" as never, body as never);
    await next();
  });

  app.post("/shipping/quote", async (c) => {
    const raw = c.get("rawBody" as never) as unknown as string;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return c.json({ error: "JSON inválido" }, 400);
    }
    const parsed = quoteRequestSchema.safeParse(json);
    if (!parsed.success) return c.json({ error: "pedido inválido" }, 400);
    try {
      const quote = await andreani.quote(parsed.data);
      return c.json({ quotes: [quote] });
    } catch (e) {
      if (e instanceof ProviderNotConfiguredError)
        return c.json({ error: "proveedor no configurado" }, 503);
      console.error(
        JSON.stringify({
          event: "quote.error",
          error: String(e),
          status: (e as ProviderError).status,
        }),
      );
      return c.json({ error: "proveedor no disponible" }, 502);
    }
  });

  return app;
}
