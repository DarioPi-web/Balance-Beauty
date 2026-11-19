import { expect, test, type Page } from "@playwright/test";

// Checkout (F4): estado vacío, validación en el servidor y, opcionalmente, un pedido real en staging.
const ONLY = ["iPhone 15 Pro", "Pixel 7", "Desktop Chrome"];

async function addToCart(page: Page, slug: string) {
  await page.goto(`/producto/${slug}`);
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("dialog", { name: "Tu carrito" })).toBeVisible();
}

test.describe("checkout", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "iOS, Android y desktop");
  });

  test("sin productos muestra el carrito vacío", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir a la tienda" })).toBeVisible();
  });

  test("código de descuento: un código inexistente se rechaza sin cambiar el total", async ({
    page,
  }) => {
    await addToCart(page, "agua-micelar");
    await page.goto("/checkout");
    const form = page.locator("form");
    test.skip(!(await form.count()), "Checkout sin Supabase en este entorno");
    const total = await page.locator("dl").filter({ hasText: "Total" }).last().innerText();
    await page.getByLabel(/Código de descuento/).fill("noexiste99");
    await expect(page.getByLabel(/Código de descuento/)).toHaveValue("NOEXISTE99");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.locator("#co-couponMsg")).toContainText("no es válido");
    expect(await page.locator("dl").filter({ hasText: "Total" }).last().innerText()).toBe(total);
  });

  test("desde el carrito, el servidor valida los datos y conserva lo escrito", async ({ page }) => {
    await addToCart(page, "agua-micelar");
    await page.goto("/carrito");
    await page.locator("main").getByRole("link", { name: "Continuar al pago" }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    const form = page.locator("form");
    test.skip(!(await form.count()), "Checkout sin Supabase en este entorno");

    await page.getByLabel("Email", { exact: true }).fill("no-es-un-email");
    await page.getByLabel("Nombre y apellido").fill("Ana Pérez");
    await page.getByRole("radio", { name: /Transferencia/ }).check();
    await expect(page.getByText("Descuento transferencia")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText("Revisá los datos");
    await expect(page.getByText("Ingresá un email válido")).toBeVisible();
    await expect(page.getByText(/Tenés que aceptar/)).toBeVisible();
    await expect(page.getByLabel("Nombre y apellido")).toHaveValue("Ana Pérez");
  });

  test("un bot que completa el honeypot no crea pedidos", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "una vez alcanza");
    await addToCart(page, "agua-micelar");
    await page.goto("/checkout");
    test.skip(!(await page.locator("form").count()), "Checkout sin Supabase en este entorno");
    // Un bot completa el campo directo en el DOM (no está visible para una persona).
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = "http://spam.example";
    });
    await page.getByRole("radio", { name: /Transferencia/ }).check();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("No pudimos procesar");
    await expect(page).toHaveURL(/\/checkout$/);
  });

  // Crea un pedido de verdad en Supabase staging: solo con E2E_ORDERS=1.
  test("pedido completo por transferencia", async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_ORDERS !== "1" || testInfo.project.name !== "Desktop Chrome",
      "E2E_ORDERS=1",
    );
    await addToCart(page, "agua-micelar");
    await page.goto("/checkout");
    await page.getByLabel("Email", { exact: true }).fill("e2e@balancebeauty.test");
    await page.getByLabel("Nombre y apellido").fill("Prueba Automática");
    await page.getByLabel(/Celular/).fill("11 2345 6789");
    await page.getByLabel("DNI", { exact: true }).fill("30123456");
    await page.getByLabel("Calle").fill("Av. Santa Fe");
    await page.getByLabel("Altura").fill("1234");
    await page.getByLabel("Localidad").fill("CABA");
    await page.getByLabel("Provincia").selectOption("Ciudad Autónoma de Buenos Aires");
    await page.getByLabel("Código postal").fill("C1425ABC");
    await page.getByRole("radio", { name: /Transferencia/ }).check();
    await page.getByRole("checkbox", { name: /Acepto/ }).check();
    await page.waitForTimeout(2_600); // el token anti-bots exige ≥ 2,5 s desde que cargó el formulario
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    await expect(page).toHaveURL(/\/checkout\/resultado\?ref=/);
    await expect(page.getByRole("heading", { name: /Recibimos tu pedido #\d+/ })).toBeVisible();
    await expect(page.getByText("$ 30.000").first()).toBeVisible(); // 25.000 − 10 % + 7.500 envío
  });
});
