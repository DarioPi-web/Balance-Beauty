"use client";

import { useState } from "react";

/** Respaldo para navegadores/in-app browsers sin permiso de portapapeles (Instagram, WebViews). */
function legacyCopy(value: string) {
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

/** Copia un dato (CBU, alias, monto) al portapapeles; anuncia el resultado a lectores. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      ok = legacyCopy(value);
    }
    setState(ok ? "done" : "failed");
    setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium hover:bg-mist"
    >
      <span aria-live="polite">
        {state === "done" ? "Copiado" : state === "failed" ? "Copialo a mano" : "Copiar"}
      </span>
    </button>
  );
}
