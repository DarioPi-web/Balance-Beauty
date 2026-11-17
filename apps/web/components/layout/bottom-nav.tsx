"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchButton } from "@/components/search/search-button";

/**
 * Navegación inferior para celular y app instalada (R‑06, docs/15).
 * Carrito y Cuenta se suman en F4/F5.
 */
const items = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/tienda",
    label: "Tienda",
    icon: LayoutGrid,
    match: (p: string) =>
      p.startsWith("/tienda") || p.startsWith("/categoria") || p.startsWith("/producto"),
  },
  {
    href: "/preocupacion/manchas",
    label: "Mi piel",
    icon: Sparkles,
    match: (p: string) => p.startsWith("/preocupacion"),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-clinical/95 safe-bottom backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "font-semibold text-leaf" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <SearchButton
            label="Buscar"
            className="min-h-14 w-full flex-col gap-0.5 text-xs text-muted-foreground"
          />
        </li>
      </ul>
    </nav>
  );
}
