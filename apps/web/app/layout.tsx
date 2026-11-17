import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/lib/brand";
import "./globals.css";

// Tipografías de la dirección "B · Botánica clínica" (ADR-017).
// Geist: UI, textos y precios. Cormorant Garamond: titulares (armoniza con la serif del logo).
// display "optional": si la fuente no llega en ~100 ms se queda la de respaldo (ajustada por
// next/font) y no hay reacomodo del texto → CLS 0. En visitas siguientes ya está en caché.
const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "optional",
  preload: false, // no compite con la imagen LCP; queda en caché para la próxima visita
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Balance Beauty — Dermocosmética",
    template: "%s | Balance Beauty",
  },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { locale: "es_AR", type: "website", siteName: brand.name },
  // iOS: al "Agregar a inicio" abre a pantalla completa, con nombre corto (docs/15 §4).
  appleWebApp: {
    capable: true,
    title: brand.shortName,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: brand.colors.leaf,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // usa toda la pantalla (notch / isla dinámica) con safe areas en CSS
};

const isProd = process.env.VERCEL_ENV === "production";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col safe-x">
        {children}
        <Toaster />
        {isProd ? (
          <>
            <Analytics />
            <SpeedInsights sampleRate={0.5} />
          </>
        ) : null}
      </body>
    </html>
  );
}
