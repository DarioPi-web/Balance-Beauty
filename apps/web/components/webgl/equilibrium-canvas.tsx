"use client";

import { useEffect, useRef, useState } from "react";
import { detectTier } from "./tier";

/**
 * Canvas del hero "Equilibrio". Reglas (docs/14 §5):
 * - Se monta DESPUÉS de la carga (idle) y el shader viaja en un chunk aparte: no afecta LCP.
 * - Debajo siempre está el póster CSS del contenedor: si no hay WebGL, se ve igual de bien.
 * - Pausa fuera de la vista / pestaña oculta; se apaga solo si el dispositivo no rinde.
 * - Decorativo: aria-hidden y sin eventos de puntero.
 */
type State = "idle" | "on" | "off";

const COLORS = {
  bgA: "#eef3ef",
  bgB: "#fbfcfa",
  drop1: "#cfe0d5",
  drop2: "#efcfca",
  deep: "#1e3a2f",
};

export function EquilibriumCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const boot = async () => {
      const tier = detectTier();
      if (tier === 0) {
        setState("off");
        return;
      }
      const { createEquilibrium } = await import("./equilibrium");
      if (disposed) return;

      const scene = await createEquilibrium(canvas, {
        // Las gotas son difusas: una resolución interna menor no se nota y ahorra GPU/batería.
        dpr: tier === 2 ? Math.min(window.devicePixelRatio || 1, 1.25) : 0.75,
        maxFps: tier === 2 ? 60 : 30,
        colors: COLORS,
        onPerformanceDrop: () => {
          setVisible(false);
          setState("off");
          scene?.dispose();
        },
      });
      if (!scene) {
        setState("off");
        return;
      }
      if (disposed) {
        scene.dispose();
        return;
      }
      setState("on");
      requestAnimationFrame(() => setVisible(true));

      let inView = true;
      const sync = () => scene.setRunning(inView && !document.hidden);
      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        sync();
      });
      io.observe(canvas);
      document.addEventListener("visibilitychange", sync);

      const fine = window.matchMedia("(pointer: fine)").matches;
      const onPointer = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        scene.setPointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -(((e.clientY - r.top) / r.height) * 2 - 1),
        );
      };
      if (fine) window.addEventListener("pointermove", onPointer, { passive: true });

      const onScroll = () => {
        const r = canvas.getBoundingClientRect();
        scene.setScroll(-r.top / Math.max(r.height, 1));
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      cleanup = () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", sync);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("scroll", onScroll);
        scene.dispose();
      };
    };

    // Esperar a que la página esté cargada y el hilo principal libre.
    const schedule = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
      ric(() => void boot(), { timeout: 2000 });
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener("load", schedule);
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-webgl={state}
      className={`pointer-events-none transition-opacity duration-1000 ease-out ${visible ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
