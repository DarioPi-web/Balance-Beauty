import { expect, test } from "@playwright/test";

// Carrito (F4, cookie firmada ADR‑019): agregar, cantidades, página, rutina y manipulación.
const ONLY = ["iPhone 15 Pro", "Pixel 7", "Desktop Chrome"];

test.describe("carrito", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "iOS, Android y desktop");
  });

  test("agregar desde la ficha, cambiar cantidad y ver /carrito", async ({ page }) => {
    await page.goto("/producto/rosatopis-serum");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();

    const sheet = page.getByRole("dialog", { name: "Tu carrito" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "ROSATOPIC Serum" })).toBeVisible();
    await expect(sheet.getByText("$ 32.000").first()).toBeVisible();
    // Con el diálogo modal abierto, el resto queda inerte para lectores de pantalla → includeHidden
    await expect(
      page.getByRole("button", { name: /Carrito: 1 producto/, includeHidden: true }).first(),
    ).toBeAttached();

    await sheet.getByRole("button", { name: "Agregar uno" }).click();
    await expect(sheet.getByText("$ 64.000").first()).toBeVisible(); // subtotal x2
    await expect(sheet.getByText(/Te faltan/)).toContainText("$ 86.000"); // para 12 cuotas

    await sheet.getByRole("link", { name: "Ver carrito y finalizar" }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    const main = page.locator("main");
    await expect(main.getByRole("link", { name: "ROSATOPIC Serum" })).toBeVisible();
    await expect(main.getByText("$ 64.000").first()).toBeVisible();

    await main.getByRole("button", { name: "Quitar ROSATOPIC Serum del carrito" }).click();
    await expect(main.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("el carrito persiste al recargar", async ({ page }) => {
    await page.goto("/producto/espuma-acneplur-foam");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("dialog", { name: "Tu carrito" })).toBeVisible();
    await page.goto("/carrito");
    await expect(page.locator("main").getByRole("link", { name: "ACNEPLUR Foam" })).toBeVisible();
  });

  test("una cookie manipulada no altera precios ni cantidades", async ({
    page,
    context,
    baseURL,
  }) => {
    const url = new URL(baseURL!);
    const forged = Buffer.from(JSON.stringify([["rosatopis-serum", 9]])).toString("base64url");
    await context.addCookies([
      { name: "bb_cart", value: `${forged}.firma-falsa`, domain: url.hostname, path: "/" },
    ]);
    await page.goto("/carrito");
    await expect(page.locator("main").getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("agregar la rutina completa", async ({ page }) => {
    await page.goto("/rutina?piel=grasa&preocupacion=acne&rutina=simple&presupuesto=sin-limite");
    await page.getByRole("button", { name: "Agregar rutina al carrito" }).click();
    const sheet = page.getByRole("dialog", { name: "Tu carrito" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("ul > li")).toHaveCount(3);
  });
});
