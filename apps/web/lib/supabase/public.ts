import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente anónimo SIN cookies para lecturas públicas cacheables del catálogo
 * (dentro de funciones "use cache" con cacheTag). Respeta RLS como anon.
 * No usar para nada que dependa del usuario.
 */
export function createSupabasePublicClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
