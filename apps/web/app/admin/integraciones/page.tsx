import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import {
  saveBankDetails,
  saveIntegrationGroup,
  testIntegration,
} from "@/actions/admin-integrations";
import { Flash, PageHeader, adminField, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/server";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Integraciones" };

type Status = Record<
  string,
  { group: string; configured: boolean; hint: string | null; updated_at: string | null }
>;
type Field = {
  name: string;
  label: string;
  secret?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
};

const SECTIONS: {
  group: "mercadopago" | "andreani" | "email";
  title: string;
  intro: React.ReactNode;
  fields: Field[];
}[] = [
  {
    group: "mercadopago",
    title: "Mercado Pago",
    intro: (
      <>
        En <strong>mercadopago.com.ar/developers</strong> → Tus integraciones → tu aplicación de
        Checkout Pro. Usá primero las credenciales de <strong>prueba</strong> (TEST-) y después las
        de producción (APP_USR-).
      </>
    ),
    fields: [
      {
        name: "mercadopago_access_token",
        label: "Access Token",
        secret: true,
        help: "Credenciales → Access Token",
      },
      {
        name: "mercadopago_webhook_secret",
        label: "Clave secreta del webhook",
        secret: true,
        help: "Webhooks → Configurar notificaciones (evento Pagos) → clave secreta",
      },
    ],
  },
  {
    group: "andreani",
    title: "Andreani",
    intro: (
      <>
        Datos que entrega tu ejecutivo de Andreani para la API. Las cotizaciones se hacen desde el
        servicio de integraciones (VPS), que toma estos mismos datos.
      </>
    ),
    fields: [
      {
        name: "andreani_env",
        label: "Entorno",
        options: [
          { value: "sandbox", label: "Pruebas (QA)" },
          { value: "production", label: "Producción" },
        ],
      },
      { name: "andreani_user", label: "Usuario" },
      { name: "andreani_password", label: "Contraseña", secret: true },
      { name: "andreani_client", label: "Código de cliente", help: "Ej. CL0001234" },
      { name: "andreani_contract_home", label: "Contrato envío a domicilio" },
      { name: "andreani_contract_branch", label: "Contrato retiro en sucursal" },
      { name: "andreani_origin_branch", label: "Sucursal de origen (si la piden)" },
    ],
  },
  {
    group: "email",
    title: "Emails (Resend)",
    intro: (
      <>
        En <strong>resend.com</strong> → API Keys. Para enviar desde tu dominio hay que verificarlo
        en Resend (registros DNS).
      </>
    ),
    fields: [
      { name: "resend_api_key", label: "API key", secret: true },
      {
        name: "email_from",
        label: "Remitente",
        help: "Balance Beauty <pedidos@balancebeauty.com.ar>",
      },
      {
        name: "email_admin_notifications",
        label: "Avisos de pedidos nuevos a",
        help: "Emails separados por coma",
      },
    ],
  },
];

const input = adminField;
const card =
  "grid scroll-mt-24 gap-4 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6";

function Badge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-xs font-medium text-leaf">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Configurado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-3 py-1 text-xs font-medium">
      <CircleDashed className="h-4 w-4" aria-hidden="true" /> Falta configurar
    </span>
  );
}

async function Integraciones({
  search,
}: {
  search: Promise<{ group?: string; ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/integraciones");
  const [{ group, ok, error }, statusRes, bankRes] = await Promise.all([
    search,
    supabase.rpc("admin_integration_status"),
    supabase.from("store_settings").select("value").eq("key", "bank_transfer").maybeSingle(),
  ]);
  if (statusRes.error) throw statusRes.error;
  const status = (statusRes.data ?? {}) as Status;
  const bank = (bankRes.data?.value ?? {}) as Record<string, string>;
  const notice = (g: string) => (group === g ? <Flash ok={ok} error={error} /> : null);
  const isConfigured = (sec: (typeof SECTIONS)[number]) =>
    sec.fields
      .filter((f) => f.name !== "andreani_origin_branch")
      .every((f) => status[f.name]?.configured);
  const bankOk = Boolean(bank.holder && (bank.cbu || bank.alias));
  const overview = [
    ...SECTIONS.map((sec) => ({ id: `h-${sec.group}`, title: sec.title, ok: isConfigured(sec) })),
    { id: "h-bank", title: "Transferencias", ok: bankOk },
  ];
  const done = overview.filter((o) => o.ok).length;

  return (
    <>
      <PageHeader
        title="Integraciones"
        description="Las claves se guardan cifradas y nunca se vuelven a mostrar: solo los últimos 4 caracteres. Para cambiar una, escribí el valor nuevo; si dejás un campo vacío, se conserva el guardado."
      />

      <nav aria-label={`Estado de las integraciones: ${done} de ${overview.length} listas`}>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.map((o) => (
            <li key={o.id}>
              <a
                href={`#${o.id}`}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl border p-4 transition-colors hover:border-leaf",
                  o.ok ? "bg-card" : "border-alert/30 bg-rose-soft/50",
                )}
              >
                {o.ok ? (
                  <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-leaf" />
                ) : (
                  <CircleDashed aria-hidden="true" className="size-5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {o.ok ? "Lista" : "Falta configurar"}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SECTIONS.map((s) => {
        const configured = isConfigured(s);
        return (
          <section
            key={s.group}
            id={`h-${s.group}`}
            aria-labelledby={`t-${s.group}`}
            className={card}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`t-${s.group}`} className="font-display text-2xl font-semibold text-graphite">
                {s.title}
              </h2>
              <Badge ok={configured} />
            </div>
            <p className="text-sm text-muted-foreground">{s.intro}</p>
            {s.group === "mercadopago" ? (
              <p className="text-sm">
                URL del webhook para pegar en Mercado Pago:{" "}
                <code className="rounded bg-mist px-2 py-1 break-all">
                  {site.url.replace(/\/$/, "")}/api/webhooks/mercadopago
                </code>
                <span className="block text-xs text-muted-foreground">
                  Funciona con el sitio publicado (staging o producción); desde localhost Mercado
                  Pago no puede avisar.
                </span>
              </p>
            ) : null}
            {notice(s.group)}
            <form
              action={saveIntegrationGroup}
              className="grid gap-4 sm:grid-cols-2"
              autoComplete="off"
            >
              <input type="hidden" name="group" value={s.group} />
              {s.fields.map((f) => {
                const st = status[f.name];
                return (
                  <div key={f.name} className="grid content-start gap-1">
                    <label htmlFor={`f-${f.name}`} className="text-sm font-medium">
                      {f.label}
                    </label>
                    {f.options ? (
                      <select
                        id={`f-${f.name}`}
                        name={f.name}
                        defaultValue={st?.hint ?? ""}
                        className={input}
                      >
                        <option value="">— elegir —</option>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`f-${f.name}`}
                        name={f.name}
                        type={f.secret ? "password" : "text"}
                        autoComplete={f.secret ? "new-password" : "off"}
                        placeholder={st?.configured ? `Guardado: ${st.hint}` : (f.help ?? "")}
                        className={input}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {st?.configured ? `Guardado${f.secret ? ` (${st.hint})` : ""}` : "Sin cargar"}
                      {f.help && st?.configured ? ` · ${f.help}` : ""}
                    </span>
                    {st?.configured && !f.options ? (
                      <label className="flex min-h-11 items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          name={`clear_${f.name}`}
                          className="h-5 w-5 accent-alert"
                        />{" "}
                        Borrar este dato
                      </label>
                    ) : null}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button className={btnPrimary}>Guardar</button>
              </div>
            </form>
            <form action={testIntegration} className="border-t pt-4">
              <input type="hidden" name="group" value={s.group} />
              <button className={btnSecondary}>Probar conexión</button>
            </form>
          </section>
        );
      })}

      <section id="h-bank" aria-labelledby="t-bank" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="t-bank" className="font-display text-2xl font-semibold text-graphite">
            Datos para transferencias
          </h2>
          <Badge ok={bankOk} />
        </div>
        <p className="text-sm text-muted-foreground">
          Se muestran al cliente en el email del pedido cuando elige pagar por transferencia.
        </p>
        {notice("bank")}
        <form action={saveBankDetails} className="grid gap-4 sm:grid-cols-2">
          {[
            ["holder", "Titular de la cuenta"],
            ["bank", "Banco"],
            ["cbu", "CBU / CVU (22 números)"],
            ["alias", "Alias"],
            ["cuit", "CUIT del titular"],
          ].map(([name, label]) => (
            <label key={name} className="grid gap-1 text-sm font-medium">
              {label}
              <input
                name={name}
                defaultValue={bank[name] ?? ""}
                className={input}
                inputMode={name === "cbu" || name === "cuit" ? "numeric" : undefined}
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button className={btnPrimary}>Guardar datos bancarios</button>
          </div>
        </form>
      </section>
    </>
  );
}

export default function IntegracionesPage({ searchParams }: PageProps<"/admin/integraciones">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-mist/60" aria-hidden="true" />}>
      <Integraciones
        search={searchParams as Promise<{ group?: string; ok?: string; error?: string }>}
      />
    </Suspense>
  );
}
