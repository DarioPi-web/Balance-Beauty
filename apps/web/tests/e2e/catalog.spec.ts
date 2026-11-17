import { expect, test, type Page } from "@playwright/test";

// Flujos del catálogo (F3). Se validan en un celular y un desktop.
const ONLY = ["Pixel 7", "Desktop Chrome"];

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
}

test.describe("catálogo", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "un celular y un desktop alcanzan");
  });

  test("home → tienda → producto", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver la tienda" }).click();
    await expect(page).toHaveURL(/\/tienda$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tienda" })).toBeVisible();

    await page.getByRole("link", { name: "ROSATOPIC Serum" }).first().click();
    await expect(page).toHaveURL(/\/producto\/rosatopis-serum$/);
    await expect(page.getByRole("heading", { level: 1, name: "ROSATOPIC Serum" })).toBeVisible();
    await expect(page.getByText("con transferencia").first()).toBeVisible();
  });

  test("filtros de la tienda actualizan resultados y URL", async ({ page }) => {
    await page.goto("/tienda");
    const counter = page.getByTestId("result-count");
    await expect(counter).toHaveText(/50 productos/);

    await page.getByRole("button", { name: "Manchas", exact: true }).click();
    await expect(page).toHaveURL(/preocupacion=manchas/);
    const filtered = Number((await counter.textContent())?.match(/\d+/)?.[0]);
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(50);

    // El link compartido conserva el filtro
    await page.goto("/tienda?preocupacion=manchas");
    await expect(counter).toHaveText(new RegExp(`${filtered} productos`));
  });

  test("ficha con JSON-LD Product y Breadcrumb coherentes", async ({ page }) => {
    await page.goto("/producto/rosatopis-serum");
    const ld = await jsonLd(page);
    const product = ld.find((d) => d["@type"] === "Product") as unknown as {
      name: string;
      image: string[];
      offers: { price: number; priceCurrency: string };
    };
    expect(product).toBeTruthy();
    expect(product.name).toBe("ROSATOPIC Serum");
    expect(product.offers.priceCurrency).toBe("ARS");
    expect(product.offers.price).toBe(32000);
    expect(product.image.length).toBeGreaterThan(0);
    // El precio del JSON-LD es el mismo que se ve en pantalla
    await expect(page.locator("main").getByText("$ 32.000").first()).toBeVisible();
    expect(ld.some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
    expect(ld.some((d) => d["@type"] === "Organization")).toBe(true);
  });

  test("producto que requiere asesoramiento no se puede comprar", async ({ page }) => {
    await page.goto("/producto/solucion-de-metformina-30");
    await expect(page.getByText("requiere asesoramiento")).toBeVisible();
    await expect(page.getByRole("button", { name: /Agregar al carrito/ })).toHaveCount(0);
  });

  test("sitemap y robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/producto/rosatopis-serum");
    expect(sitemap).toContain("/preocupacion/manchas");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/checkout/);
    expect(robots).toMatch(/Sitemap: /);
  });

  test("producto inexistente: página 404 con noindex", async ({ page, request }) => {
    // Con Cache Components el shell ya se transmitió → status 200, pero Next inyecta noindex
    // en el HTML (documentado en not-found.md). Se verifica el HTML crudo, que es lo que lee Google.
    const html = await (await request.get("/producto/no-existe")).text();
    expect(html).toMatch(/<meta name="robots" content="noindex"\s*\/?>/);
    await page.goto("/producto/no-existe");
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  });
});
