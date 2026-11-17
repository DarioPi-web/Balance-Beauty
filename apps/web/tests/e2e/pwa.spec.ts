import { expect, test } from "@playwright/test";

// Lo que hace falta para que "Agregar a inicio" se vea como app nativa (docs/15 §4).
// No depende del dispositivo: se corre en un solo proyecto de cada motor.
test.describe("app instalable (PWA)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !["Pixel 7", "iPhone 15 Pro"].includes(testInfo.project.name),
      "se valida en un Android y un iPhone",
    );
  });

  test("manifest válido con íconos accesibles", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();

    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    const manifest = await res.json();

    expect(manifest.name).toBe("Balance Beauty");
    expect(manifest.short_name).toBe("Balance");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toMatch(/^\//);
    expect(manifest.scope).toBe("/");
    expect(manifest.lang).toBe("es-AR");
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const r = await request.get(icon.src);
      expect(r.ok(), `ícono ${icon.src}`).toBe(true);
      expect(r.headers()["content-type"]).toContain("image/png");
    }
  });

  test("metadatos de iOS para pantalla completa", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
      "content",
      "yes",
    );
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
      "content",
      "Balance",
    );
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveCount(1);

    const appleIcon = await page
      .locator('link[rel="apple-touch-icon"]')
      .first()
      .getAttribute("href");
    expect(appleIcon).toBeTruthy();
    const r = await request.get(appleIcon!);
    expect(r.ok()).toBe(true);

    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("viewport-fit=cover");
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  });
});
