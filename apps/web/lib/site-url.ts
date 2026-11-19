/**
 * URL pública del sitio, sin barra final. Orden:
 * 1. NEXT_PUBLIC_SITE_URL (producción: https://balancebeauty.com.ar).
 * 2. En Vercel, las variables de sistema que expone automáticamente para Next.js:
 *    producción → dominio de producción del proyecto; preview (staging) → URL del deploy.
 * 3. Local: http://localhost:3000.
 * Se usa para canonical/sitemap/OG, links de emails y back_urls/webhook de Mercado Pago.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  const prod =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (env === "production" && prod) return `https://${prod}`;
  const deploy = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (deploy) return `https://${deploy}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
