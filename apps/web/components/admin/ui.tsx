import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Piezas visuales del admin (una sola gramática para todas las pantallas):
 * encabezado de página, mensajes, paneles, indicadores, etiquetas y estados vacíos.
 * Server components puros: sin JS en el cliente.
 */

export const adminField =
  "mt-1 block min-h-11 w-full rounded-xl border bg-background px-3 text-base outline-none focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/25";
export const adminLabel = "block text-sm font-medium text-graphite";
export const adminHint = "mt-1 block text-xs font-normal text-muted-foreground";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leaf px-5 font-medium text-clinical shadow-sm transition-colors hover:bg-leaf-hover disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-mist disabled:opacity-50";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-alert px-4 text-sm font-medium text-alert transition-colors hover:bg-rose-soft";

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
}) {
  return (
    <header className="grid gap-3">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-graphite"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold text-graphite sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[0.95rem] text-muted-foreground">{description}</p>
          ) : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Mensaje de resultado de una acción (ok/error vienen por la URL tras un redirect). */
export function Flash({
  ok,
  error,
  info,
}: {
  ok?: string | null;
  error?: string | null;
  info?: string | null;
}) {
  if (!ok && !error && !info) return null;
  const tone = error
    ? {
        cls: "border-alert/40 bg-rose-soft",
        Icon: CircleAlert,
        role: "alert" as const,
        text: error,
      }
    : ok
      ? { cls: "border-leaf/30 bg-mist", Icon: CheckCircle2, role: "status" as const, text: ok }
      : { cls: "border-border bg-card", Icon: Info, role: "status" as const, text: info! };
  return (
    <p
      role={tone.role}
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", tone.cls)}
    >
      <tone.Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-5 shrink-0", error ? "text-alert" : "text-leaf")}
      />
      <span>{tone.text.slice(0, 300)}</span>
    </p>
  );
}

export function Panel({
  title,
  description,
  actions,
  id,
  tone = "default",
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
  tone?: "default" | "attention" | "quiet";
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = id ? `${id}-t` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        "grid content-start gap-4 rounded-2xl border p-5 sm:p-6",
        tone === "attention"
          ? "border-alert/40 bg-card"
          : tone === "quiet"
            ? "bg-mist/40"
            : "bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="font-display text-2xl font-semibold text-graphite">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "primary" | "attention";
  href?: string;
}) {
  const body = (
    <>
      <p
        className={cn("text-sm", tone === "primary" ? "text-clinical/85" : "text-muted-foreground")}
      >
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-sm",
            tone === "primary" ? "text-clinical/85" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      ) : null}
    </>
  );
  const cls = cn(
    "block rounded-2xl border p-5 transition-colors",
    tone === "primary"
      ? "border-leaf bg-leaf text-clinical"
      : tone === "attention"
        ? "border-alert/40 bg-rose-soft/60"
        : "bg-card",
    href && (tone === "primary" ? "hover:bg-leaf-hover" : "hover:border-leaf"),
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const PILL = {
  neutral: "bg-mist text-graphite",
  success: "bg-leaf/15 text-leaf",
  strong: "bg-leaf text-clinical",
  warning: "bg-rose-soft text-graphite",
  muted: "bg-muted text-muted-foreground",
} as const;

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof PILL;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <p className="font-medium text-graphite">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Fila de lista navegable (pedidos, productos, stock): toda la fila es el link. */
export function RowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-mist focus-visible:bg-mist",
        className,
      )}
    >
      {children}
    </Link>
  );
}
