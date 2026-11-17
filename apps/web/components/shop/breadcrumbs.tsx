import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Ubicación" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={it.path} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {i < items.length - 1 ? (
              <Link
                href={it.path}
                className="inline-flex min-h-11 min-w-11 items-center hover:text-graphite"
              >
                {it.name}
              </Link>
            ) : (
              <span aria-current="page" className="inline-flex min-h-11 items-center text-graphite">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
