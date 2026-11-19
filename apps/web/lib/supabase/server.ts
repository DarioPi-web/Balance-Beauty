import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

type CookieOptions = Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];
type Jar = {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options?: CookieOptions) => void;
};

/**
 * Next 16.4 a veces lanza "InvariantError: Received an underlying cookies object that does
 * not match…" al llamar cookies() en el render que sigue a una Server Action cuando la sesión
 * se acaba de refrescar (bug de Next, ~1 vez por hora de sesión). En ese caso se leen las
 * cookies del encabezado de la request (solo lectura): la sesión sigue siendo válida y la
 * página no cae en la pantalla de error. proxy.ts sigue siendo quien persiste el refresco.
 */
async function cookieJar(): Promise<Jar> {
  try {
    const store = await cookies();
    return { getAll: () => store.getAll(), set: (n, v, o) => store.set(n, v, o) };
  } catch (e) {
    if (!(e instanceof Error) || !/underlying cookies object/.test(e.message)) throw e;
    console.warn(JSON.stringify({ event: "supabase.cookies.fallback" }));
    const raw = (await headers()).get("cookie") ?? "";
    const parsed = parseCookieHeader(raw).map((c) => ({ name: c.name, value: c.value ?? "" }));
    return { getAll: () => parsed };
  }
}

/**
 * Cliente con la sesión del usuario (cookies). Solo para rutas dinámicas:
 * carrito, checkout, cuenta y admin. Con Cache Components, quien lo use debe
 * renderizarse detrás de un <Suspense>. Crear uno nuevo por request.
 */
export async function createSupabaseServerClient() {
  const jar = await cookieJar();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => jar.set?.(name, value, options));
          } catch {
            // Llamado desde un Server Component: se ignora; proxy.ts refresca la sesión.
          }
        },
      },
    },
  );
}
