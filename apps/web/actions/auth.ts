"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(200),
  next: z.string().optional(),
});

/** Solo se vuelve a rutas internas conocidas (evita redirecciones abiertas). */
const safeNext = (n?: string) => (n && /^\/(admin|mi-cuenta)(\/[\w\-/]*)?$/.test(n) ? n : "/admin");

export async function signIn(_prev: SignInState, fd: FormData): Promise<SignInState> {
  const parsed = schema.safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
    next: fd.get("next") ?? undefined,
  });
  const email = String(fd.get("email") ?? "");
  if (!parsed.success) return { error: "Ingresá tu email y contraseña.", email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Mismo mensaje para email inexistente o contraseña incorrecta (no revela cuentas).
    return {
      error:
        error.status === 429
          ? "Demasiados intentos. Esperá unos minutos."
          : "Email o contraseña incorrectos.",
      email,
    };
  }
  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  // "local": cierra solo esta sesión. El valor por defecto ("global") revoca todas las del
  // usuario y lo deja afuera también en el celular u otra PC.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/ingresar");
}
