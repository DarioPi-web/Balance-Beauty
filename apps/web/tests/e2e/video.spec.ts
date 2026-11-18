import { expect, test } from "@playwright/test";

// Video de fondo del hero: el póster pinta primero, el video llega después de la carga,
// corre muteado en bucle con la variante adecuada al ancho, y respeta "reducir movimiento".
const ONLY = ["iPhone 15 Pro", "Pixel 7", "Desktop Chrome"];
const VIDEO_RE = /\/video\/hero-\d+\.(mp4|webm)/;

test.describe("video de fondo del hero", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!ONLY.includes(testInfo.project.name), "iOS, Android y desktop");
  });

  test("póster primero, después el video muteado en bucle", async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const videoRequests: string[] = [];
    page.on("request", (r) => {
      if (VIDEO_RE.test(r.url())) videoRequests.push(r.url());
    });

    await page.goto("/");
    const hero = page.locator("section").first();
    await expect(hero.locator("picture img")).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Tu piel, en equilibrio.");

    await expect.poll(() => videoRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
    const width = page.viewportSize()!.width;
    expect(videoRequests[0]).toContain(width >= 768 ? "hero-1080" : "hero-720");

    const video = hero.locator("video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0), {
        timeout: 20_000,
      })
      .toBe(true);
    expect(
      await video.evaluate((v: HTMLVideoElement) => ({
        muted: v.muted,
        loop: v.loop,
        inline: v.playsInline,
        hidden: v.getAttribute("aria-hidden"),
      })),
    ).toEqual({ muted: true, loop: true, inline: true, hidden: "true" });
    await expect(video).toHaveCSS("opacity", "1");

    await page.getByRole("button", { name: "Pausar video de fondo" }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await context.close();
  });

  test("también arranca solo y vuelve a empezar con reducir movimiento", async ({ page }) => {
    await page.goto("/"); // el proyecto usa reducedMotion: "reduce"
    const video = page.locator("section").first().locator("video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0), {
        timeout: 20_000,
      })
      .toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.loop && v.autoplay && v.muted)).toBe(
      true,
    );
    // Bucle: al llegar al final (15,8 s) vuelve al principio sin detenerse.
    await video.evaluate((v: HTMLVideoElement) => (v.currentTime = v.duration - 0.3));
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime < 3), {
        timeout: 10_000,
      })
      .toBe(true);
  });
});
