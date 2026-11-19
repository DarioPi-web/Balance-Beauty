import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "localhost";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Fotos del admin: el navegador las achica a 2000 px (≈ 0,5–1,5 MB) y las sube de a una.
    // Por debajo del límite de 4,5 MB del cuerpo de una función de Vercel.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // experimental.inlineCss: medido y descartado (2026-11-18). Duplica el CSS 3 veces en el HTML
  // (style + 2× payload RSC): documento 17 → 75 KB gz, TBT 140 → 346 ms. Ver docs/11.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // ADR-009: variantes AVIF pre-generadas (scripts/optimize-product-images.mjs / worker del VPS).
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: [384, 640, 828, 1080],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Archivos de /public (sin hash en el nombre): 7 días frescos + 30 de revalidación en
      // segundo plano. Vercel por defecto revalida en cada visita (max-age=0). Si se reemplaza
      // un archivo, cambiarle el nombre (p. ej. hero-720-av1-v2.mp4).
      {
        source: "/:dir(video|brand|img)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      // Staging (previews manuales) nunca se indexa.
      ...(process.env.VERCEL_ENV === "preview"
        ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
        : []),
    ];
  },
  async redirects() {
    // Redirecciones 301 desde URLs de WooCommerce (docs/09 §5).
    return [
      { source: "/inicio", destination: "/", permanent: true },
      { source: "/carro", destination: "/carrito", permanent: true },
      { source: "/finalizar-comprar", destination: "/checkout", permanent: true },
      { source: "/categoria-producto/sin-categorizar", destination: "/tienda", permanent: true },
      { source: "/categoria-producto/:slug", destination: "/categoria/:slug", permanent: true },
      { source: "/etiqueta-producto/:slug", destination: "/tienda", permanent: true },
      { source: "/reembolso_devoluciones", destination: "/legales/devoluciones", permanent: true },
      { source: "/privacy-policy", destination: "/legales/privacidad", permanent: true },
      { source: "/hello-world", destination: "/", permanent: true },
      { source: "/feed", destination: "/", permanent: true },
      { source: "/comments/feed", destination: "/", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
