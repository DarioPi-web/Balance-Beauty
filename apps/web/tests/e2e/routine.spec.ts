import { expect, test, type Page } from "@playwright/test";

// Quiz "Armá tu rutina" (F3‑11): flujo completo, link compartible y protección ante URLs manipuladas.
const ONLY = ["iPhone 15 Pro", "Pixel 7", "Desktop Chrome"];
// Opciones dentro del paso actual del quiz (el mismo texto aparece en menú y footer)
const quiz = (page: Page) => page.locator("main fieldset");

test.describe("armá tu rutina", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "iOS, Android y desktop");
  });

  test("4 preguntas → rutina con productos, total y link compartible", async ({ page }) => {
    await page.goto("/rutina");
    await quiz(page).getByText("Grasa", { exact: true }).click();
    await quiz(page).getByText("Acné", { exact: true }).click();
    await quiz(page).getByText("Simple", { exact: true }).click();
    await quiz(page).getByText("Sin límite", { exact: true }).click();

    const result = page.locator("#rutina-resultado");
    await expect(result.getByRole("heading", { name: /Piel grasa, foco en acné/ })).toBeVisible();
    await expect(result.locator("ol > li")).not.toHaveCount(0);
    await expect(result.getByText("Total de la rutina")).toBeVisible();
    await expect(page).toHaveURL(/piel=grasa.*preocupacion=acne/);

    // Abrir el link compartido muestra el mismo resultado
    const shared = page.url();
    await page.goto(shared);
    await expect(page.locator("#rutina-resultado")).toBeVisible();

    // Nunca recomienda productos que requieren asesoramiento
    await expect(result).not.toContainText(/Metformina|Metimazol|via Oral/i);
  });

  test("volver atrás y reiniciar", async ({ page }) => {
    await page.goto("/rutina");
    await quiz(page).getByText("Seca", { exact: true }).click();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByRole("group", { name: "¿Cómo es tu piel?" })).toBeVisible();
  });

  test("una URL con valores inválidos vuelve a preguntar", async ({ page }) => {
    await page.goto("/rutina?piel=xyz&preocupacion=hackeo&rutina=simple&presupuesto=sin-limite");
    await expect(page.getByRole("group", { name: "¿Cómo es tu piel?" })).toBeVisible();
  });
});
