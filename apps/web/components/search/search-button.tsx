"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cx } from "@/lib/cx";

// El diálogo (cmdk + índice) se descarga recién al abrirlo: 0 KB en la carga inicial.
const SearchDialog = dynamic(() => import("./search-dialog"), { ssr: false });

/** Lupa del header / barra inferior. Atajos: "/" y Ctrl/Cmd+K. */
export function SearchButton({
  className,
  label,
  shortcut = false,
}: {
  className?: string;
  label?: string;
  /** Solo una instancia (la del header) escucha los atajos de teclado. */
  shortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest(
        "input, textarea, [contenteditable]",
      );
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setMounted(true);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  return (
    <>
      <button
        type="button"
        aria-label="Buscar productos"
        aria-haspopup="dialog"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        onPointerEnter={() => setMounted(true)} // precarga el chunk al pasar el mouse
        // Sin tailwind-merge: el que llama define display/tamaño/justify/gap completos (sin pisar).
        className={cx(
          "items-center",
          className ?? "inline-flex min-h-11 min-w-11 justify-center gap-1",
        )}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        {label ? <span>{label}</span> : null}
      </button>
      {mounted ? <SearchDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
