import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, ShieldCheck } from "lucide-react";
import { RoleForm } from "@/components/admin/role-form";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  adminField,
  btnSecondary,
} from "@/components/admin/ui";
import { isRole, ROLE_INFO, ROLES, type Role } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuarios y roles" };

const PAGE_SIZE = 25;

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: Role;
  full_name: string | null;
  phone: string | null;
  is_seller: boolean;
  orders: number;
};
type Result = { total: number; counts: Partial<Record<Role, number>> | null; users: UserRow[] };

type Search = { q?: string; rol?: string; p?: string; ok?: string; error?: string };

const date = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});
const relative = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

function lastSeen(iso: string | null): string {
  if (!iso) return "Nunca ingresó";
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days > -1) return "Ingresó hoy";
  if (days > -30) return `Ingresó ${relative.format(days, "day")}`;
  return `Último ingreso: ${date.format(new Date(iso))}`;
}

function href(q: string, rol: string, p?: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (rol) params.set("rol", rol);
  if (p && p > 1) params.set("p", String(p));
  const s = params.toString();
  return `/admin/usuarios${s ? `?${s}` : ""}`;
}

async function Users({ search }: { search: Promise<Search> }) {
  const { supabase, userId } = await requireAdmin("/admin/usuarios");
  const sp = await search;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const rol = isRole(sp.rol) ? sp.rol : "";
  const page = Math.max(1, Math.min(1000, Number.parseInt(sp.p ?? "1", 10) || 1));

  const { data, error } = await supabase.rpc("admin_list_users", {
    p_query: q || undefined,
    p_role: rol || undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const res = data as unknown as Result;
  const counts = res.counts ?? {};
  const all = ROLES.reduce((n, r) => n + (counts[r] ?? 0), 0);
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));

  const tabs: { key: "" | Role; label: string; n: number }[] = [
    { key: "", label: "Todos", n: all },
    ...ROLES.map((r) => ({ key: r, label: ROLE_INFO[r].label, n: counts[r] ?? 0 })),
  ];

  return (
    <div className="grid gap-6">
      <Flash ok={sp.ok} error={sp.error} />

      <Panel className="gap-5">
        <form role="search" action="/admin/usuarios" className="flex flex-wrap items-end gap-3">
          {rol ? <input type="hidden" name="rol" value={rol} /> : null}
          <label className="min-w-0 flex-1 basis-64 text-sm font-medium">
            Buscar por email o nombre
            <span className="relative block">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                maxLength={120}
                placeholder="nombre@gmail.com"
                className={cn(adminField, "pl-9")}
              />
            </span>
          </label>
          <button className={btnSecondary}>Buscar</button>
          {q ? (
            <Link
              href={href("", rol)}
              className="inline-flex min-h-11 items-center px-2 text-sm underline"
            >
              Limpiar
            </Link>
          ) : null}
        </form>

        <nav aria-label="Filtrar por rol" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2">
            {tabs.map((t) => {
              const current = t.key === rol;
              return (
                <li key={t.key || "all"}>
                  <Link
                    href={href(q, t.key)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                      current ? "border-leaf bg-leaf text-clinical" : "bg-card hover:bg-mist",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs tabular-nums",
                        current ? "bg-clinical/20" : "bg-mist",
                      )}
                    >
                      {t.n}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {res.total === 0
            ? "Sin resultados."
            : `${res.total} ${res.total === 1 ? "persona" : "personas"}${q ? ` para “${q}”` : ""}${
                rol ? ` con rol ${ROLE_INFO[rol].label}` : ""
              }.`}
        </p>

        {res.users.length === 0 ? (
          <EmptyState
            title="No encontramos usuarios con ese filtro"
            description="Probá con otra parte del email o quitá el filtro de rol. Solo aparecen personas que ya se registraron en la tienda."
            action={
              <Link href="/admin/usuarios" className={btnSecondary}>
                Ver todos
              </Link>
            }
          />
        ) : (
          <ul className="grid divide-y rounded-2xl border">
            {res.users.map((u) => {
              const me = u.id === userId;
              const info = ROLE_INFO[u.role] ?? ROLE_INFO.customer;
              return (
                <li
                  key={u.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-full font-semibold uppercase",
                        info.elevated ? "bg-leaf text-clinical" : "bg-mist text-leaf",
                      )}
                    >
                      {(u.full_name || u.email).slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {u.full_name || u.email}
                        {me ? (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            (vos)
                          </span>
                        ) : null}
                      </p>
                      {u.full_name ? (
                        <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill
                          tone={
                            info.elevated
                              ? "strong"
                              : u.role === "wholesale"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {info.label}
                        </Pill>
                        {u.is_seller ? <Pill tone="warning">Vendedora</Pill> : null}
                        {u.orders > 0 ? (
                          <Pill tone="muted">
                            {u.orders} {u.orders === 1 ? "pedido" : "pedidos"}
                          </Pill>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Registro: {date.format(new Date(u.created_at))} ·{" "}
                        {lastSeen(u.last_sign_in_at)}
                      </p>
                    </div>
                  </div>
                  <div className="sm:justify-self-end">
                    {me ? (
                      <p className="max-w-56 text-sm text-muted-foreground">
                        Tu propio rol no se cambia desde acá: pedíselo a otra persona
                        administradora.
                      </p>
                    ) : (
                      <RoleForm userId={u.id} email={u.email} current={u.role} q={q} rol={rol} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 ? (
          <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={href(q, rol, page - 1)} className={btnSecondary}>
                ← Anteriores
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Página {page} de {pages}
            </span>
            {page < pages ? (
              <Link href={href(q, rol, page + 1)} className={btnSecondary}>
                Siguientes →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Panel>

      <Panel
        tone="quiet"
        title="Qué puede hacer cada rol"
        description="El acceso al administrador se verifica en la base de datos en cada pantalla, no solo al ingresar."
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r} className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-2 font-medium">
                {ROLE_INFO[r].elevated ? (
                  <ShieldCheck aria-hidden="true" className="size-4 text-leaf" />
                ) : null}
                {ROLE_INFO[r].label}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{ROLE_INFO[r].grants}</dd>
            </div>
          ))}
        </dl>
        <ul className="grid gap-1 text-sm text-muted-foreground">
          <li>
            • Nadie puede quitarse a sí mismo el acceso al admin, y siempre queda al menos una
            persona con Administración.
          </li>
          <li>• Cada cambio queda registrado (quién, cuándo, de qué rol a cuál).</li>
          <li>• Las vendedoras se gestionan en su sección: su panel no depende del rol.</li>
        </ul>
      </Panel>
    </div>
  );
}

export default function UsuariosPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Todas las personas registradas en la tienda. Cambiá su rol para darles precios mayoristas o acceso al administrador."
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
        <Users search={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
