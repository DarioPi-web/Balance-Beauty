"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { placeOrder, type CheckoutState } from "@/actions/checkout";
import { checkCoupon } from "@/actions/coupon";
import { formatARS } from "@/lib/pricing";
import { PROVINCIAS } from "@/lib/validation/provincias";
import { cn } from "@/lib/utils";

type Rate = {
  method: "home_delivery" | "branch_pickup";
  price: number;
  freeFrom: number | null;
  eta: string | null;
};

type Props = {
  subtotal: number;
  rates: Rate[];
  transferPercent: number;
  cardEnabled: boolean;
  /** Token de tiempo firmado en el servidor (lib/security/form-guard). */
  formToken: string;
};

const field =
  "mt-1 block min-h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/30 aria-[invalid=true]:border-alert";
const label = "block text-sm font-medium text-graphite";

/** Formulario de checkout: progresivo (funciona sin JS) y validado de nuevo en el servidor. */
export function CheckoutForm({ subtotal, rates, transferPercent, cardEnabled, formToken }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const [method, setMethod] = useState(v.shippingMethod ?? rates[0]?.method ?? "home_delivery");
  const [payment, setPayment] = useState(
    v.paymentMethod ?? (cardEnabled ? "mercadopago" : "bank_transfer"),
  );

  const [code, setCode] = useState(v.couponCode ?? "");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, startCheck] = useTransition();
  const applyCoupon = () =>
    startCheck(async () => {
      const r = await checkCoupon(code);
      if (r.ok) {
        setCoupon({ code: r.code, discount: r.discount });
        setCode(r.code);
        setCouponMsg({ ok: true, text: `Código ${r.code} aplicado: −${formatARS(r.discount)}` });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: r.error });
      }
    });

  const rate = rates.find((r) => r.method === method);
  // Mismo orden que place_order: primero el código, después el % de la transferencia.
  const couponDiscount = coupon && coupon.code === code.trim().toUpperCase() ? coupon.discount : 0;
  const transferDiscount =
    payment === "bank_transfer"
      ? Math.floor(((subtotal - couponDiscount) * transferPercent) / 100)
      : 0;
  const discount = couponDiscount + transferDiscount;
  const shipping = !rate
    ? 0
    : rate.freeFrom !== null && subtotal - discount >= rate.freeFrom
      ? 0
      : rate.price;
  const total = subtotal - discount + shipping;

  const input = (
    name: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { text: string },
  ) => {
    const { text, className, ...rest } = props;
    const id = `co-${name}`;
    return (
      <div className={className}>
        <label htmlFor={id} className={label}>
          {text}
        </label>
        <input
          id={id}
          name={name}
          defaultValue={v[name]}
          aria-invalid={err[name] ? true : undefined}
          aria-describedby={err[name] ? `${id}-err` : undefined}
          className={field}
          {...rest}
        />
        {err[name] ? (
          <p id={`${id}-err`} className="mt-1 text-sm text-alert">
            {err[name]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form action={action} className="grid gap-8" noValidate>
      <input type="hidden" name="formToken" value={formToken} />
      {/* Honeypot: invisible para personas y lectores de pantalla; los bots suelen completarlo. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          No completar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-alert/40 bg-rose-soft px-4 py-3 text-graphite"
        >
          {state.error}
        </p>
      ) : null}

      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-2xl font-semibold">1. Tus datos</legend>
        {input("email", {
          text: "Email",
          type: "email",
          autoComplete: "email",
          required: true,
          className: "sm:col-span-2",
        })}
        {input("fullName", {
          text: "Nombre y apellido",
          autoComplete: "name",
          required: true,
          className: "sm:col-span-2",
        })}
        {input("phone", {
          text: "Celular (con código de área)",
          type: "tel",
          autoComplete: "tel",
          inputMode: "tel",
          required: true,
        })}
        {input("dni", { text: "DNI", inputMode: "numeric", required: true })}
      </fieldset>

      <fieldset className="grid min-w-0 gap-4">
        <legend className="mb-2 font-display text-2xl font-semibold">2. Entrega</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Medio de entrega">
          {rates.map((r) => (
            <label
              key={r.method}
              className={cn(
                "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 has-[:checked]:border-leaf has-[:checked]:bg-mist/60",
              )}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={r.method}
                checked={method === r.method}
                onChange={() => setMethod(r.method)}
                className="mt-1 h-5 w-5 accent-leaf"
              />
              <span>
                <span className="block font-medium">
                  {r.method === "home_delivery"
                    ? "Envío a domicilio"
                    : "Retiro en sucursal del correo"}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {formatARS(r.price)}
                  {r.freeFrom !== null ? ` · gratis desde ${formatARS(r.freeFrom)}` : ""}
                  {r.eta ? ` · ${r.eta}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
        {err.shippingMethod ? <p className="text-sm text-alert">{err.shippingMethod}</p> : null}

        <div className="grid min-w-0 gap-4 sm:grid-cols-6">
          {method === "home_delivery" ? (
            <>
              {input("street", {
                text: "Calle",
                autoComplete: "address-line1",
                required: true,
                className: "sm:col-span-4",
              })}
              {input("number", {
                text: "Altura",
                inputMode: "numeric",
                required: true,
                className: "sm:col-span-2",
              })}
              {input("floorApt", {
                text: "Piso / depto (opcional)",
                autoComplete: "address-line2",
                className: "sm:col-span-2",
              })}
            </>
          ) : null}
          {input("city", {
            text: "Localidad",
            autoComplete: "address-level2",
            required: true,
            className: method === "home_delivery" ? "sm:col-span-4" : "sm:col-span-3",
          })}
          <div className="sm:col-span-3">
            <label htmlFor="co-province" className={label}>
              Provincia
            </label>
            <select
              id="co-province"
              name="province"
              defaultValue={v.province ?? ""}
              required
              autoComplete="address-level1"
              aria-invalid={err.province ? true : undefined}
              className={field}
            >
              <option value="" disabled>
                Elegí tu provincia
              </option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {err.province ? <p className="mt-1 text-sm text-alert">{err.province}</p> : null}
          </div>
          {input("postalCode", {
            text: "Código postal",
            autoComplete: "postal-code",
            required: true,
            className: "sm:col-span-3",
          })}
          {method === "home_delivery" ? (
            <div className="sm:col-span-6">
              <label htmlFor="co-notes" className={label}>
                Indicaciones para la entrega (opcional)
              </label>
              <textarea
                id="co-notes"
                name="notes"
                defaultValue={v.notes}
                maxLength={300}
                rows={2}
                className={cn(field, "py-3")}
              />
            </div>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-2 font-display text-2xl font-semibold">3. Pago</legend>
        {[
          {
            value: "mercadopago",
            title: "Tarjeta de crédito o débito (Mercado Pago)",
            note: cardEnabled
              ? "Hasta 12 cuotas sin interés según el monto"
              : "Disponible muy pronto",
            disabled: !cardEnabled,
          },
          {
            value: "bank_transfer",
            title: `Transferencia bancaria · ${transferPercent} % off`,
            note: "Te mostramos los datos al confirmar el pedido",
            disabled: false,
          },
        ].map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-14 items-start gap-3 rounded-xl border p-4 has-[:checked]:border-leaf has-[:checked]:bg-mist/60",
              o.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={o.value}
              checked={payment === o.value}
              disabled={o.disabled}
              onChange={() => setPayment(o.value)}
              className="mt-1 h-5 w-5 accent-leaf"
            />
            <span>
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.note}</span>
            </span>
          </label>
        ))}
        {err.paymentMethod ? <p className="text-sm text-alert">{err.paymentMethod}</p> : null}
      </fieldset>

      <div className="grid gap-3 rounded-2xl border bg-card p-5">
        <div className="grid gap-2">
          <label htmlFor="co-couponCode" className={label}>
            Código de descuento{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="co-couponCode"
              name="couponCode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCouponMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (code.trim()) applyCoupon();
                }
              }}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              aria-describedby="co-couponMsg"
              aria-invalid={couponMsg && !couponMsg.ok ? true : undefined}
              className={cn(field, "mt-0 flex-1 uppercase")}
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={checking || !code.trim()}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border px-5 font-medium hover:bg-mist disabled:opacity-60"
            >
              {checking ? "…" : "Aplicar"}
            </button>
          </div>
          <p
            id="co-couponMsg"
            aria-live="polite"
            className={cn("text-sm", couponMsg?.ok ? "text-leaf" : "text-alert")}
          >
            {couponMsg?.text ?? err.couponCode ?? ""}
          </p>
        </div>
        <dl className="grid gap-1 text-base">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatARS(subtotal)}</dd>
          </div>
          {couponDiscount ? (
            <div className="flex justify-between text-leaf">
              <dt>Código {coupon?.code}</dt>
              <dd>−{formatARS(couponDiscount)}</dd>
            </div>
          ) : null}
          {transferDiscount ? (
            <div className="flex justify-between text-leaf">
              <dt>Descuento transferencia</dt>
              <dd>−{formatARS(transferDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{shipping ? formatARS(shipping) : "Gratis"}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-lg font-semibold">
            <dt>Total</dt>
            <dd>{formatARS(total)}</dd>
          </div>
        </dl>

        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 h-5 w-5 accent-leaf"
            aria-invalid={err.acceptTerms ? true : undefined}
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" prefetch={false} className="underline underline-offset-2">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" prefetch={false} className="underline underline-offset-2">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        {err.acceptTerms ? <p className="text-sm text-alert">{err.acceptTerms}</p> : null}
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-5 w-5 accent-leaf" />
          <span>Quiero recibir novedades y promociones por email.</span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 font-medium text-clinical transition-colors hover:bg-leaf-hover disabled:opacity-70"
        >
          {pending
            ? "Procesando…"
            : payment === "mercadopago"
              ? "Pagar con Mercado Pago"
              : "Confirmar pedido"}
        </button>
        <p className="text-xs text-muted-foreground">
          El total final lo confirma el sistema al registrar el pedido. Reservamos el stock por 30
          minutos.
        </p>
      </div>
    </form>
  );
}
