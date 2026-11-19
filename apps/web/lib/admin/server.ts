import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Guard de /admin: sesión válida + rol admin/staff verificado EN LA BASE (is_admin),
 * no solo en el JWT. Devuelve el cliente con la sesión (RLS "admin all" habilita la lectura).
 * Usar dentro de <Suspense> (lee cookies).
 */
export async function requireAdmin(path = "/admin") {
  // La validación del JWT usa la hora actual: siempre por pedido, nunca en el prerender.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/ingresar?next=${encodeURIComponent(path)}`);
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) redirect("/");
  return {
    supabase,
    userId: claims.claims.sub as string,
    email: claims.claims.email as string | undefined,
  };
}
