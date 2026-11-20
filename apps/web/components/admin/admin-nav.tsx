"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Package,
  Plug,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { activeNavItem, NAV_GROUPS, type NavItem } from "@/lib/admin/nav";
import { cx } from "@/lib/cx";

const ICONS: Record<NavItem["icon"], typeof Package> = {
  today: LayoutDashboard,
  orders: ShoppingBag,
  products: Package,
  sheet: FileSpreadsheet,
  users: Users,
  sellers: BadgePercent,
  integrations: Plug,
};

/** Lista de secciones agrupadas; marca la actual con aria-current. */
export function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <AdminNavView active={activeNavItem(pathname)} onNavigate={onNavigate} />;
}

/** Vista sin hooks: sirve de fallback de <Suspense> mientras llega la ruta (Cache Components). */
export function AdminNavView({
  active,
  onNavigate,
}: {
  active?: NavItem;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Secciones del administrador" className="grid gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-1">
          <p className="px-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const current = active?.href === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={cx(
                      "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[0.95rem] transition-colors",
                      current
                        ? "bg-leaf text-clinical shadow-sm"
                        : "text-graphite hover:bg-mist focus-visible:bg-mist",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cx("size-5 shrink-0", current ? "text-clinical" : "text-leaf")}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span
                        className={cx(
                          "block truncate text-xs",
                          current ? "text-clinical/80" : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Celular/tablet: barra superior con la sección actual y un menú lateral. */
export function AdminMobileNav({ footer }: { footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el menú del administrador"
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-xl border bg-card hover:bg-mist"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <p className="min-w-0 truncate font-medium" aria-live="polite">
        {active?.label ?? "Administrador"}
      </p>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[86%] max-w-xs gap-0 overflow-y-auto bg-card p-0 safe-top safe-bottom"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <SheetTitle className="font-display text-xl font-semibold text-leaf">
              Balance Beauty · Admin
            </SheetTitle>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar el menú"
              className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-mist"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <SheetDescription className="sr-only">Secciones del administrador</SheetDescription>
          <div className="flex flex-1 flex-col gap-6 p-3">
            <AdminNavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t pt-3">{footer}</div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Fallback estático de la barra superior del celular (antes de conocer la ruta). */
export function AdminMobileNavFallback() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="inline-flex size-11 items-center justify-center rounded-xl border bg-card">
        <Menu className="size-5" />
      </span>
      <span className="font-medium">Administrador</span>
    </div>
  );
}
