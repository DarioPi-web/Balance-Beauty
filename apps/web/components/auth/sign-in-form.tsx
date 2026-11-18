"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/actions/auth";

const field =
  "mt-1 block min-h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/30";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p role="alert" className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="si-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="si-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="si-password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="si-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical hover:bg-leaf-hover disabled:opacity-70"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
