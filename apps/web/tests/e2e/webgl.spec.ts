import { expect, test } from "@playwright/test";

// Hero WebGL "Equilibrio" (docs/14 §5): activación, fallback y rendimiento.

test.describe("hero WebGL", () => {
  // La config global usa reducedMotion: "reduce"; acá se prueba la animación real.
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test.describe.configure({ mode: "serial" });

  test("se activa en desktop y mantiene fps sin tareas largas", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "WebGL desktop", "medición en Chromium desktop");

    await page.addInitScript(() => {
      (window as unknown as { __longTasks: number[] }).__longTasks = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          (window as unknown as { __longTasks: number[] }).__longTasks.push(e.duration);
      }).observe({ type: "longtask", buffered: true });
    });

    await page.goto("/");
    const canvas = page.locator("canvas[data-webgl]");
    await expect(canvas).toHaveAttribute("data-webgl", "on", { timeout: 15_000 });

    // El titular (LCP) está en el HTML y visible sin depender del canvas
    await expect(page.locator("h1")).toBeVisible();

    const fps = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = (now: number) => {
            frames++;
            if (now - start < 2000) requestAnimationFrame(tick);
            else resolve((frames * 1000) / (now - start));
          };
          requestAnimationFrame(tick);
        }),
    );
    console.log(`[webgl] fps headless (render por CPU): ${fps.toFixed(1)}`);
    // Headless usa render por software (SwiftShader): umbral conservador.
    expect(fps, `fps medidos: ${fps.toFixed(1)}`).toBeGreaterThan(20);

    const longTasks = await page.evaluate(
      () => (window as unknown as { __longTasks: number[] }).__longTasks,
    );
    const worst = Math.max(0, ...longTasks);
    console.log(`[webgl] tarea larga máxima: ${worst.toFixed(0)} ms`);
    expect(worst, `tarea más larga: ${worst.toFixed(0)} ms`).toBeLessThan(250);
  });

  test("con movimiento reducido queda solo el póster", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const canvas = page.locator("canvas[data-webgl]");
    await expect(canvas).toHaveAttribute("data-webgl", "off", { timeout: 10_000 });
    await expect(canvas).toHaveCSS("opacity", "0");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("el canvas es decorativo y no bloquea la interacción", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "WebGL desktop", "un motor alcanza");
    await page.goto("/");
    const canvas = page.locator("canvas[data-webgl]");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(canvas).toHaveCSS("pointer-events", "none");
  });
});
