"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { setUserRole } from "@/actions/admin-users";
import { ROLE_INFO, ROLES, type Role } from "@/lib/admin/roles";
import { cx } from "@/lib/cx";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-leaf px-4 text-sm font-medium text-clinical hover:bg-leaf-hover disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

/**
 * Selector de rol con confirmación en línea: elegir un rol no guarda nada; aparece qué
 * permisos cambian y recién ahí se confirma. Dar o quitar acceso al admin se destaca.
 */
export function RoleForm({
  userId,
  email,
  current,
  q,
  rol,
}: {
  userId: string;
  email: string;
  current: Role;
  q: string;
  rol: string;
}) {
  const [next, setNext] = useState<Role>(current);
  const id = useId();
  const dirty = next !== current;
  const grantsAdmin = !ROLE_INFO[current].elevated && ROLE_INFO[next].elevated;
  const revokesAdmin = ROLE_INFO[current].elevated && !ROLE_INFO[next].elevated;

  return (
    <form action={setUserRole} className="grid gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="rol" value={rol} />
      <label htmlFor={`${id}-r`} className="sr-only">
        Rol de {email}
      </label>
      <select
        id={`${id}-r`}
        name="role"
        value={next}
        onChange={(e) => setNext(e.target.value as Role)}
        className={cx(
          "min-h-11 w-full rounded-xl border bg-background px-3 text-base sm:w-52",
          dirty && "border-leaf ring-2 ring-leaf/25",
        )}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_INFO[r].label}
          </option>
        ))}
      </select>
      {dirty ? (
        <div
          role="group"
          aria-label="Confirmar el cambio de rol"
          className={cx(
            "grid gap-2 rounded-xl border p-3 text-sm sm:w-72",
            grantsAdmin || revokesAdmin ? "border-alert/40 bg-rose-soft/60" : "bg-mist/60",
          )}
        >
          <p>
            <strong>
              {ROLE_INFO[current].label} → {ROLE_INFO[next].label}.
            </strong>{" "}
            {grantsAdmin
              ? "Va a poder entrar al administrador."
              : revokesAdmin
                ? "Pierde el acceso al administrador."
                : null}{" "}
            {ROLE_INFO[next].grants}
          </p>
          <div className="flex flex-wrap gap-2">
            <Submit label="Confirmar cambio" />
            <button
              type="button"
              onClick={() => setNext(current)}
              className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm hover:bg-mist"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
