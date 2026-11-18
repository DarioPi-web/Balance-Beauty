import { revalidateTag } from "next/cache";
import { isAuthorized, parseTags } from "@/lib/cache/revalidate";

/**
 * Invalida la caché del catálogo / envíos tras cambios en Supabase (sync del catálogo, VPS,
 * herramientas internas). POST con `Authorization: Bearer <REVALIDATE_SECRET>` y
 * cuerpo `{ "tags": ["catalog"] }`. "max": sirve la versión vieja mientras regenera (docs/11).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"), process.env.REVALIDATE_SECRET)) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const tags = parseTags(await request.json().catch(() => ({})));
  if (!tags) return Response.json({ ok: false, error: "Tags inválidos" }, { status: 400 });
  for (const tag of tags) revalidateTag(tag, "max");
  console.info(JSON.stringify({ event: "cache.revalidate", tags }));
  return Response.json({ ok: true, revalidated: tags });
}
