import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/lib/brand";
import "./globals.css";

// Tipografías PROVISIONALES (docs/14 §2) hasta aprobar el style tile en F2.
const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
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
  themeColor: brand.colors.porcelain,
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
