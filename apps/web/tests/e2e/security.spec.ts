import { expect, test } from "@playwright/test";

// L7 (docs/18): encabezados de seguridad y CSP sin violaciones en las páginas principales.
const PAGES = ["/", "/tienda", "/producto/rosatopis-serum", "/checkout", "/arrepentimiento"];

test.describe("seguridad", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!["Desktop Chrome", "Pixel 7"].includes(testInfo.project.name), "Chromium alcanza");
  });

  test("encabezados de seguridad", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    const csp = h["content-security-policy"] ?? "";
    for (const d of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ])
      expect(csp, d).toContain(d);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("los paneles privados piden ingresar", async ({ page }) => {
    for (const p of [
      "/admin",
      "/admin/vendedoras",
      "/admin/usuarios",
      "/admin/productos/planilla",
      "/vendedora",
    ]) {
      await page.goto(p);
      await expect(page, p).toHaveURL(/\/ingresar\?next=/);
    }
    const r = await page.request.get("/admin/productos/planilla/descargar", { maxRedirects: 0 });
    expect(r.status(), "la planilla no se descarga sin sesión").toBe(307);
  });

  test("ninguna página viola la CSP", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
    });
    for (const p of PAGES) {
      await page.goto(p);
      await page.waitForLoadState("load");
    }
    // El video del hero se carga después del load: darle tiempo a pedirlo.
    await page.goto("/");
    await page.waitForTimeout(2500);
    expect(violations).toEqual([]);
  });
});
