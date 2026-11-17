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
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // ADR-009: en F3 se cambia a loader propio con variantes pre-generadas por el VPS.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
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
