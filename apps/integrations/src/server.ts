import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { andreaniConfigured, loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.info(
    JSON.stringify({
      event: "integrations.start",
      port: info.port,
      andreani: andreaniConfigured(config) ? config.ANDREANI_ENV : "sin configurar",
    }),
  );
});
