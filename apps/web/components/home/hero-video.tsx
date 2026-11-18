"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Source = { src: string; type: string; media?: string };

/**
 * Video de fondo del hero (reemplaza al WebGL "Equilibrio", ADR-018 → docs/14 §5).
 * El póster (<picture> del servidor) es lo que pinta primero y el LCP; el video:
 * - se pide recién después del evento load + un momento ocioso (no compite con el LCP);
 * - aparece con un fundido cuando ya está reproduciendo (sin salto visual);
 * - corre siempre en bucle y sin sonido; solo se omite con ahorro de datos (queda el póster);
 * - se pausa fuera de pantalla y con la pestaña oculta;
 * - tiene botón de pausa (WCAG 2.2.2) y es decorativo para lectores de pantalla.
 */
export function HeroVideo({ sources }: { sources: Source[] }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    // Pedido del dueño: el video corre siempre en bucle (también con "reducir movimiento"),
    // con botón de pausa visible (WCAG 2.2.2). Solo se omite con ahorro de datos activado.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (saveData) return;

    let idle: number | undefined;
    const start = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
      idle = ric(() => setLoad(true), { timeout: 2000 }) as number;
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idle);
    };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!load || !v) return;
    v.load();
    v.play().catch(() => {});

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!userPaused.current) v.play().catch(() => {});
      } else v.pause();
    });
    io.observe(v);
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else if (!userPaused.current) v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        aria-hidden="true"
        tabIndex={-1}
        muted
        loop
        playsInline
        autoPlay={load}
        preload={load ? "auto" : "none"}
        onEnded={(e) => {
          // Respaldo del bucle por si algún navegador ignora `loop`.
          const v = e.currentTarget;
          v.currentTime = 0;
          v.play().catch(() => {});
        }}
        disablePictureInPicture
        onPlaying={() => {
          setVisible(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {load
          ? sources.map((s) => <source key={s.src} src={s.src} type={s.type} media={s.media} />)
          : null}
      </video>
      {load ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar video de fondo" : "Reproducir video de fondo"}
          className="absolute right-4 bottom-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-clinical/85 text-graphite shadow-md backdrop-blur hover:bg-clinical focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinical"
        >
          {playing ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </>
  );
}
