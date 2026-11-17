import Link from "next/link";
import type { Taxon } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

/** Chips de "comprar por preocupación" (navegación principal, docs/14 §3). */
export function ConcernChips({
  concerns,
  active,
  className,
}: {
  concerns: Taxon[];
  active?: string;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {concerns.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/preocupacion/${c.slug}`}
            aria-current={active === c.slug ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors",
              active === c.slug
                ? "bg-leaf text-clinical"
                : "bg-mist text-graphite hover:bg-leaf/10",
            )}
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
