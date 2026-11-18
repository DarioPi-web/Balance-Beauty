import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (ex middleware). Corre SOLO en rutas con sesión: el catálogo no pasa por acá
 * (costo y latencia, ver docs/11 §2). Refresca la sesión de Supabase y hace un chequeo
 * optimista; la autorización real se repite en layouts, Server Actions y RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Sin Supabase (CI, PC sin .env.local): las rutas privadas no son accesibles.
    const p = request.nextUrl.pathname;
    return p.startsWith("/admin") || p.startsWith("/mi-cuenta")
      ? NextResponse.redirect(new URL("/", request.url))
      : response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname } = request.nextUrl;

  const needsLogin = pathname.startsWith("/mi-cuenta") || pathname.startsWith("/admin");
  if (needsLogin && !claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Chequeo optimista: solo si el JWT trae user_role (custom_access_token_hook habilitado).
  // La autorización real está en app/admin/layout.tsx (is_admin) y en las RPC/RLS.
  if (pathname.startsWith("/admin")) {
    const role = (claims as { user_role?: string } | undefined)?.user_role;
    if (role && role !== "admin" && role !== "staff") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/mi-cuenta/:path*", "/checkout/:path*", "/auth/:path*"],
};
