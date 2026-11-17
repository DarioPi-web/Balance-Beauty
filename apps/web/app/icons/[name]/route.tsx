import { notFound } from "next/navigation";
import { renderAppIcon } from "@/lib/app-icon";

// PNGs del manifest, generados en build (estáticos).
const ICONS = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "icon-maskable-512.png": { size: 512, maskable: true },
} as const;

type IconName = keyof typeof ICONS;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, ctx: RouteContext<"/icons/[name]">) {
  const { name } = await ctx.params;
  const icon = ICONS[name as IconName];
  if (!icon) notFound();
  return renderAppIcon(icon.size, { maskable: icon.maskable });
}
