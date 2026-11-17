import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

// Accesibilidad WCAG 2.2 AA con axe (R‑09). Un celular y un desktop cubren ambos layouts.
const ONLY = ["Pixel 7", "Desktop Chrome"];

for (const route of [...PUBLIC_ROUTES, "/marca/sulderm"]) {
  test(`a11y ${route}`, async ({ page }, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "un celular y un desktop alcanzan");
    await page.goto(route);
    await page.waitForLoadState("load");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}
