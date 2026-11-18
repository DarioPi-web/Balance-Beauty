"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";

/**
 * Avisos mínimos (reemplaza a sonner: ~9 KB menos de JS inicial, docs/11).
 * API compatible con lo que usábamos: toast.success(msg) / toast.error(msg).
 */
type Item = { id: number; kind: "success" | "error"; message: string };

let items: Item[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(kind: Item["kind"], message: string) {
  const id = ++seq;
  items = [...items.slice(-2), { id, kind, message }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 3500);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Item[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 safe-bottom md:bottom-6"
    >
      {list.map((t) => (
        <p
          key={t.id}
          className={cx(
            "pointer-events-auto rounded-full px-5 py-3 text-sm font-medium shadow-lg",
            t.kind === "success" ? "bg-leaf text-clinical" : "bg-alert text-white",
          )}
        >
          {t.message}
        </p>
      ))}
    </div>
  );
}
