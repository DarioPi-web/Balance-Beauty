import { expect, test } from "@playwright/test";

// Panel de administración: acceso protegido. El flujo con un admin real se prueba con pgTAP
// (supabase/tests/admin_orders.test.sql); acá se verifica que nadie entra sin sesión.
test.describe("admin", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !["Desktop Chrome", "iPhone 15 Pro"].includes(testInfo.project.name),
      "desktop y móvil",
    );
  });

  test("sin sesión /admin lleva a ingresar y vuelve al destino", async ({ page }) => {
    await page.goto("/admin/pedidos");
    test.skip(
      !page.url().includes("/ingresar"),
      "Sin Supabase en este entorno: el proxy redirige al inicio",
    );
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fadmin%2Fpedidos/);
    await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("la página de ingreso no se indexa", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
