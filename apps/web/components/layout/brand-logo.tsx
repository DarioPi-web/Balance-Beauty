import { LeafMark } from "@/components/shop/product-media";
import { cn } from "@/lib/utils";

/** Logo horizontal: tres hojas + BALANCE / BEAUTY (SVG + texto, sin imagen: 0 KB extra). */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LeafMark className="h-9 w-12 shrink-0 sm:h-11 sm:w-14" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.65rem] font-semibold tracking-wide sm:text-[2.1rem]">
          BALANCE
        </span>{" "}
        <span className="mt-0.5 pl-0.5 text-[0.62rem] tracking-[0.62em] sm:text-xs">BEAUTY</span>
      </span>
    </span>
  );
}
