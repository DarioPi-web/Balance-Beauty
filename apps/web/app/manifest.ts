import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/** Web App Manifest: hace que el sitio se instale y se abra como app en Android/iOS (docs/15 §4). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    lang: "es-AR",
    dir: "ltr",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: brand.colors.porcelain,
    theme_color: brand.colors.porcelain,
    categories: ["shopping", "beauty", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Tienda", short_name: "Tienda", url: "/tienda?utm_source=pwa_shortcut" },
      { name: "Mi cuenta", short_name: "Cuenta", url: "/mi-cuenta?utm_source=pwa_shortcut" },
      {
        name: "Seguir mi envío",
        short_name: "Envío",
        url: "/seguir-envio?utm_source=pwa_shortcut",
      },
    ],
  };
}
