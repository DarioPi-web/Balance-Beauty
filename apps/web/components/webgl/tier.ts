/**
 * Clasifica el dispositivo para decidir si se muestra la animación WebGL (docs/14 §5).
 *  0 → sin WebGL: queda el póster CSS (movimiento reducido, ahorro de datos, sin WebGL2).
 *  1 → gama baja/media: resolución 1x y 30 fps máx.
 *  2 → gama alta: resolución hasta 1,5x y 60 fps.
 */
export type Tier = 0 | 1 | 2;

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

export function detectTier(): Tier {
  if (typeof window === "undefined") return 0;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0;

  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return 0;
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return 0;

  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  if (!gl) return 0;
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  const lowMemory = (nav.deviceMemory ?? 8) <= 3;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (lowMemory || fewCores || coarse) return 1;
  return 2;
}
