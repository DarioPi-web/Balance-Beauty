import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Política de rastreo (docs/16 §3): buscadores e IAs permitidos en el contenido público.
 * GPTBot / Google-Extended / ClaudeBot (entrenamiento) quedan permitidos hasta definir Q‑24.
 */
const PRIVATE = ["/admin", "/mi-cuenta", "/checkout", "/carrito", "/api/", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
