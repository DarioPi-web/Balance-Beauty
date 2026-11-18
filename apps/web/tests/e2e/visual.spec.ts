import { expect, test } from "@playwright/test";

/**
 * Regresión visual (R-08). Las capturas de referencia dependen del sistema operativo (fuentes,
 * antialiasing): se generan y comparan en la misma máquina con VISUAL=1.
 *   Generar/actualizar:  VISUAL=1 pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots
 *   Comparar:            VISUAL=1 pnpm exec playwright test tests/e2e/visual.spec.ts
 * El hero (video de fondo) se enmascara y las animaciones CSS se congelan.
 */
const ROUTES = [
  { name: "home", path: "/" },
  { name: "tienda", path: "/tienda" },
  { name: "ficha", path: "/producto/rosatopis-serum" },
  { name: "rutina", path: "/rutina" },
  { name: "checkout-vacio", path: "/checkout" },
] as const;
const DEVICES = ["iPhone 15 Pro", "Pixel 7", "Desktop Chrome"];

test.describe("regresión visual", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(process.env.VISUAL !== "1", "Solo con VISUAL=1 (capturas por sistema operativo)");
    test.skip(!DEVICES.includes(testInfo.project.name), "iOS, Android y desktop");
  });

  for (const r of ROUTES) {
    test(r.name, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${r.name}.png`, {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        mask: [page.locator("video"), page.locator("section").first().locator("picture")],
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
