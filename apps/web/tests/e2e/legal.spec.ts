import { expect, test } from "@playwright/test";

// L4/L5 (docs/18): Botón de arrepentimiento en el footer (Res. 424/2020)
// y redirecciones heredadas de WooCommerce que terminan en páginas que existen.

test.describe("legales", () => {
  test("el Botón de arrepentimiento está en el footer y abre el formulario", async ({ page }) => {
    await page.goto("/");
    const link = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Botón de arrepentimiento" });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/arrepentimiento$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Botón de arrepentimiento");
    await expect(page.getByLabel("Nombre y apellido")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  });

  test("las redirecciones heredadas llegan a páginas que existen", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "una vez alcanza");
    for (const [from, to] of [
      ["/reembolso_devoluciones", "/devoluciones"],
      ["/privacy-policy", "/privacidad"],
    ]) {
      const r = await request.get(from, { maxRedirects: 0 });
      expect(r.status(), from).toBe(308);
      expect(r.headers().location).toBe(to);
      expect((await request.get(to)).status(), to).toBe(200);
    }
  });
});
