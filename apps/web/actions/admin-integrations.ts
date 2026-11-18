"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import {
  getIntegrationSetting,
  invalidateIntegrationSettings,
  type IntegrationKey,
} from "@/lib/settings/integrations";

/** Campos editables por grupo, con su validación. Vacío = no cambiar (salvo "borrar"). */
const FIELDS: Record<
  "mercadopago" | "andreani" | "email",
  Partial<Record<IntegrationKey, z.ZodType<string>>>
> = {
  mercadopago: {
    mercadopago_access_token: z
      .string()
      .regex(
        /^(TEST|APP_USR)-[\w-]{20,}$/,
        "El Access Token empieza con TEST- (prueba) o APP_USR- (producción)",
      ),
    mercadopago_webhook_secret: z
      .string()
      .min(16, "La clave secreta del webhook tiene al menos 16 caracteres"),
  },
  andreani: {
    andreani_env: z.enum(["sandbox", "production"], { message: "Entorno inválido" }),
    andreani_user: z.string().min(2).max(120),
    andreani_password: z.string().min(2).max(200),
    andreani_client: z
      .string()
      .regex(/^[A-Za-z0-9-]{3,20}$/, "Código de cliente inválido (ej. CL0001234)"),
    andreani_contract_home: z.string().regex(/^\d{4,20}$/, "Contrato: solo números"),
    andreani_contract_branch: z.string().regex(/^\d{4,20}$/, "Contrato: solo números"),
    andreani_origin_branch: z.string().min(1).max(40),
  },
  email: {
    resend_api_key: z.string().regex(/^re_[\w]{10,}$/, "La API key de Resend empieza con re_"),
    email_from: z
      .string()
      .regex(
        /^(.+<)?[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>?$/,
        "Formato: Balance Beauty <pedidos@tudominio.com>",
      ),
    email_admin_notifications: z
      .string()
      .regex(
        /^([^@\s,]+@[^@\s,]+\.[^@\s,]+)(\s*,\s*[^@\s,]+@[^@\s,]+\.[^@\s,]+)*$/,
        "Emails separados por coma",
      ),
  },
};

const back = (q: string): never => redirect(`/admin/integraciones?${q}`);
const msg = (s: string) => encodeURIComponent(s);

export async function saveIntegrationGroup(fd: FormData): Promise<void> {
  const group = String(fd.get("group") ?? "") as keyof typeof FIELDS;
  const fields = FIELDS[group];
  if (!fields) back("error=" + msg("Sección inválida"));
  const { supabase } = await requireAdmin("/admin/integraciones");

  const changes: { name: IntegrationKey; value: string }[] = [];
  for (const [name, schema] of Object.entries(fields) as [IntegrationKey, z.ZodType<string>][]) {
    if (fd.get(`clear_${name}`) === "on") {
      changes.push({ name, value: "" });
      continue;
    }
    const raw = String(fd.get(name) ?? "").trim();
    if (!raw) continue; // vacío = conservar lo guardado
    const parsed = schema.safeParse(raw);
    if (!parsed.success)
      back(`group=${group}&error=` + msg(parsed.error.issues[0]?.message ?? "Dato inválido"));
    changes.push({ name, value: parsed.data! });
  }
  if (!changes.length) back(`group=${group}&error=` + msg("No hay cambios para guardar"));

  for (const c of changes) {
    const { error } = await supabase.rpc("admin_set_integration_secret", {
      p_name: c.name,
      p_value: c.value,
    });
    if (error) {
      console.error(
        JSON.stringify({ event: "admin.integration.save.error", name: c.name, code: error.code }),
      );
      back(`group=${group}&error=` + msg("No se pudo guardar. Probá de nuevo."));
    }
  }
  invalidateIntegrationSettings();
  back(
    `group=${group}&ok=` +
      msg(`Guardado (${changes.length} ${changes.length === 1 ? "dato" : "datos"})`),
  );
}

/** Prueba la conexión con las credenciales guardadas (sin mostrarlas). */
export async function testIntegration(fd: FormData): Promise<void> {
  const group = String(fd.get("group") ?? "");
  await requireAdmin("/admin/integraciones");
  invalidateIntegrationSettings();
  const timeout = AbortSignal.timeout(6000);
  let result: string;
  let ok = false;
  try {
    if (group === "mercadopago") {
      const token = await getIntegrationSetting("mercadopago_access_token");
      if (!token) throw new Error("Falta el Access Token");
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: timeout,
        cache: "no-store",
      });
      if (!res.ok)
        throw new Error(
          res.status === 401
            ? "Mercado Pago rechazó el Access Token"
            : `Mercado Pago respondió ${res.status}`,
        );
      const me = (await res.json()) as { nickname?: string; site_id?: string };
      ok = true;
      result = `Conectado a la cuenta ${me.nickname ?? ""} (${me.site_id ?? "?"}) · modo ${token.startsWith("TEST-") ? "prueba" : "producción"}`;
    } else if (group === "andreani") {
      const [env, user, pass] = await Promise.all([
        getIntegrationSetting("andreani_env"),
        getIntegrationSetting("andreani_user"),
        getIntegrationSetting("andreani_password"),
      ]);
      if (!user || !pass) throw new Error("Faltan usuario y contraseña");
      const base =
        env === "production" ? "https://apis.andreani.com" : "https://apisqa.andreani.com";
      const res = await fetch(`${base}/login`, {
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` },
        signal: timeout,
        cache: "no-store",
      });
      if (!res.ok || !res.headers.get("x-authorization-token"))
        throw new Error(`Andreani rechazó el login (${res.status})`);
      ok = true;
      result = `Login correcto en Andreani (${env === "production" ? "producción" : "pruebas"})`;
    } else if (group === "email") {
      const key = await getIntegrationSetting("resend_api_key");
      if (!key) throw new Error("Falta la API key");
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
        signal: timeout,
        cache: "no-store",
      });
      if (!res.ok)
        throw new Error(
          res.status === 401 ? "Resend rechazó la API key" : `Resend respondió ${res.status}`,
        );
      const body = (await res.json()) as { data?: { name: string; status: string }[] };
      const domains = (body.data ?? []).map(
        (d) => `${d.name}: ${d.status === "verified" ? "verificado" : d.status}`,
      );
      ok = true;
      result = domains.length
        ? `API key válida · ${domains.join(", ")}`
        : "API key válida · todavía no hay dominios agregados";
    } else {
      throw new Error("Sección inválida");
    }
  } catch (e) {
    result = e instanceof Error && e.name !== "TimeoutError" ? e.message : "No respondió a tiempo";
  }
  back(`group=${group}&${ok ? "ok" : "error"}=` + msg(result));
}

const bankSchema = z.object({
  holder: z.string().trim().min(3, "Ingresá el titular").max(120),
  bank: z.string().trim().max(80).optional(),
  cbu: z
    .string()
    .trim()
    .regex(/^(\d{22})?$/, "El CBU/CVU tiene 22 números")
    .optional(),
  alias: z
    .string()
    .trim()
    .regex(/^([A-Za-z0-9.-]{6,20})?$/, "Alias inválido")
    .optional(),
  cuit: z
    .string()
    .trim()
    .transform((v) => v.replace(/-/g, ""))
    .pipe(z.string().regex(/^(\d{11})?$/, "El CUIT tiene 11 números"))
    .optional(),
});

/** Datos bancarios para transferencias (públicos: salen en el email y en el resultado). */
export async function saveBankDetails(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin("/admin/integraciones");
  const parsed = bankSchema.safeParse(
    Object.fromEntries(
      ["holder", "bank", "cbu", "alias", "cuit"].map((k) => [k, String(fd.get(k) ?? "")]),
    ),
  );
  if (!parsed.success)
    back("group=bank&error=" + msg(parsed.error.issues[0]?.message ?? "Dato inválido"));
  const d = parsed.data!;
  if (!d.cbu && !d.alias) back("group=bank&error=" + msg("Ingresá al menos el CBU/CVU o el alias"));
  const value = Object.fromEntries(Object.entries(d).filter(([, v]) => v));
  const { error } = await supabase
    .from("store_settings")
    .upsert({ key: "bank_transfer", value, is_public: true }, { onConflict: "key" });
  if (error) {
    console.error(JSON.stringify({ event: "admin.bank.save.error", code: error.code }));
    back("group=bank&error=" + msg("No se pudo guardar. Probá de nuevo."));
  }
  back("group=bank&ok=" + msg("Datos bancarios guardados"));
}
