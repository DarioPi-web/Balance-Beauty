import { defineConfig, devices } from "@playwright/test";

/**
 * Matriz de dispositivos (docs/15 §2). Corre contra el build de producción local:
 * `pnpm build` y luego `pnpm test:e2e`. Nunca contra producción.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    // Móviles iOS (WebKit = motor de Safari)
    { name: "iPhone SE", use: { ...devices["iPhone SE"] } },
    { name: "iPhone 15 Pro", use: { ...devices["iPhone 15 Pro"] } },
    { name: "iPhone 15 Pro Max", use: { ...devices["iPhone 15 Pro Max"] } },
    // Móviles Android (Chromium)
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    { name: "Galaxy S8", use: { ...devices["Galaxy S8"] } },
    {
      name: "Galaxy Fold cerrado",
      use: {
        ...devices["Galaxy S8"],
        viewport: { width: 280, height: 653 },
        screen: { width: 280, height: 653 },
      },
    },
    // Tablets
    { name: "iPad Mini", use: { ...devices["iPad Mini"] } },
    { name: "iPad Pro 11 landscape", use: { ...devices["iPad Pro 11 landscape"] } },
    // Desktop
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    // Firefox solo en CI (Linux): en esta PC Windows no logra lanzarse (spawn UNKNOWN).
    ...(process.env.CI || process.env.E2E_FIREFOX
      ? [
          {
            name: "Desktop HD Firefox",
            use: { ...devices["Desktop Firefox"], viewport: { width: 1920, height: 1080 } },
          },
        ]
      : []),
  ],
});
