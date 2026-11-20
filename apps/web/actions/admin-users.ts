"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { ROLE_INFO, ROLES } from "@/lib/admin/roles";

/** Cambio de rol desde /admin/usuarios. Las reglas duras viven en admin_set_user_role (migración 18). */
const schema = z.object({
  user_id: z.string().uuid("Usuario inválido"),
  role: z.enum(ROLES, { message: "Rol inválido" }),
  // Vuelve a la misma búsqueda/filtro; solo se aceptan parámetros de esta pantalla.
  q: z.string().trim().max(120).default(""),
  rol: z.union([z.enum(ROLES), z.literal("")]).default(""),
});

function back(params: Record<string, string>) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  const qs = new URLSearchParams(clean).toString();
  redirect(`/admin/usuarios${qs ? `?${qs}` : ""}`);
}

export async function setUserRole(fd: FormData): Promise<void> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = schema.safeParse({
    user_id: get("user_id"),
    role: get("role"),
    q: get("q"),
    rol: get("rol"),
  });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Revisá los datos" });
  const d = parsed.data!;

  const { supabase } = await requireAdmin("/admin/usuarios");
  const { data, error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: d.user_id,
    p_role: d.role,
  });
  const keep = { q: d.q, rol: d.rol };
  if (error) {
    if (error.hint !== "admin")
      console.error(
        JSON.stringify({ event: "admin.user.role", code: error.code, message: error.message }),
      );
    back({
      ...keep,
      error: error.hint === "admin" ? error.message : "No se pudo cambiar el rol. Probá de nuevo.",
    });
  }
  const res = (data ?? {}) as { changed?: boolean; email?: string };
  back({
    ...keep,
    ok: res.changed
      ? `${res.email ?? "La persona"} ahora tiene el rol ${ROLE_INFO[d.role].label}.`
      : "No hubo cambios: ya tenía ese rol.",
  });
}
