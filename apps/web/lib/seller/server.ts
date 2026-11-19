import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Guard del panel de vendedoras: sesión válida + vendedora activa EN LA BASE
 * (current_seller_id; además vincula su usuario por email la primera vez). Usar detrás de
 * <Suspense> (lee cookies).
 */
export async function requireSeller(path = "/vendedora") {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/ingresar?next=${encodeURIComponent(path)}`);
  const { data: sellerId, error } = await supabase.rpc("current_seller_id");
  if (error || !sellerId) redirect("/ingresar?sin_acceso=1");
  return {
    supabase,
    sellerId: sellerId as string,
    email: claims.claims.email as string | undefined,
  };
}
