import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

for (const route of PUBLIC_ROUTES) {
  test.describe(`responsive ${route}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("load");
    });

    test("sin scroll horizontal", async ({ page }) => {
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        scrollWidth,
        "el contenido no debe desbordar el ancho de pantalla",
      ).toBeLessThanOrEqual(innerWidth);
    });

    test("el titular principal es visible y entra en pantalla", async ({ page }) => {
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const box = await h1.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    });

    test("texto base legible (≥ 16 px)", async ({ page }) => {
      const fontSize = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.body).fontSize),
      );
      expect(fontSize).toBeGreaterThanOrEqual(16);
    });

    test("objetivos táctiles ≥ 44 px en pantallas táctiles", async ({ page }, testInfo) => {
      test.skip(!testInfo.project.use.hasTouch, "solo dispositivos táctiles");
      const small = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>("a[href], button, [role=button], input, select"),
        )
          .filter((el) => el.offsetParent !== null)
          .map((el) => {
            // Link estirado: el área táctil es la tarjeta contenedora (::after inset-0)
            const target = el.hasAttribute("data-stretched-link")
              ? (el.closest("article") ?? el)
              : el;
            const r = target.getBoundingClientRect();
            return {
              label: el.textContent?.trim() || el.getAttribute("aria-label") || el.tagName,
              w: r.width,
              h: r.height,
            };
          })
          .filter((t) => t.w < 44 || t.h < 44),
      );
      expect(small, `elementos táctiles chicos: ${JSON.stringify(small)}`).toEqual([]);
    });
  });
}
