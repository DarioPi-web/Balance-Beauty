# Integraciones: administrador, Mercado Pago y Andreani

> **Novedad (2026‑11‑18): todo se carga desde el administrador → `/admin/integraciones`.**
> Mercado Pago, Andreani, Resend y los datos bancarios se guardan ahí (cifrados en Supabase Vault,
> nunca se vuelven a mostrar completos) y cada sección tiene **Probar conexión**. Las variables de
> entorno siguen funcionando como respaldo. El VPS lee los datos de Andreani del admin si tiene
> `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `APP_SERVER_KEY` (= `CHECKOUT_SERVER_KEY`).

> Guía paso a paso para el dueño. Las claves secretas **nunca** se pegan en el chat ni se suben a
> GitHub: van en `apps/web/.env.local` (esta PC), en Vercel (Settings → Environment Variables,
> tipo _Sensitive_) o en `apps/integrations/.env` (VPS). Estado de cada pieza al final.

---

## 1. Acceso al administrador (`/admin`)

La contraseña la elegís vos: Claude no crea cuentas con contraseña.

1. Entrá a **Supabase** → proyecto **balance-beauty-staging** → **Authentication** → **Users**.
2. **Add user** → **Create new user**: tu email y una contraseña tuya. Tildá **Auto Confirm User**.
3. Avisale a Claude ("ya creé el usuario"): detecta el usuario nuevo y le asigna el rol `admin`
   (`update public.profiles set role = 'admin' where id = …`).
4. Ingresá en **http://localhost:3000/ingresar** → te lleva a **/admin/pedidos**.
   (En staging, cuando se haga el deploy: `https://<url-de-staging>/ingresar`.)

Desde `/admin/pedidos` se acreditan transferencias, se despacha con código de seguimiento,
se marca entregado y se cancela (devuelve stock). Cada acción avisa al cliente por email
(cuando Resend esté configurado) y queda en el registro de auditoría.

---

## 2. Mercado Pago (Checkout Pro)

El código ya está: preferencia de pago, redirección, webhook con firma, reintento de pago y
marcado del pedido como pagado. Falta cargar las credenciales.

### 2.1 Credenciales de prueba

1. Entrá a **mercadopago.com.ar/developers** con la cuenta de Mercado Pago de la tienda.
2. **Tus integraciones** → **Crear aplicación** → tipo **Pagos online** → producto **Checkout Pro**.
3. En la aplicación → **Credenciales de prueba**: copiá el **Access Token** (empieza con `TEST-`).
4. **Cuentas de prueba** → creá un **comprador** de prueba (para pagar sin dinero real).

### 2.2 Webhook (aviso de pagos)

Mercado Pago necesita una URL pública: funciona recién con el sitio desplegado en staging
(el deploy se hace solo con tu aprobación).

1. En la aplicación → **Webhooks** → **Configurar notificaciones**.
2. URL de producción/prueba: `https://<url-de-staging>/api/webhooks/mercadopago`
3. Evento: **Pagos**. Guardá y copiá la **clave secreta** que muestra.

### 2.3 Dónde va cada dato

| Variable                     | Valor                                                   | Dónde                 |
| ---------------------------- | ------------------------------------------------------- | --------------------- |
| `MERCADOPAGO_ACCESS_TOKEN`   | Access Token `TEST-…` (luego el productivo `APP_USR-…`) | `.env.local` y Vercel |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta del webhook                               | `.env.local` y Vercel |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase → Project Settings → API Keys → **secret**     | `.env.local` y Vercel |
| `NEXT_PUBLIC_SITE_URL`       | URL pública del sitio (staging)                         | Vercel                |

Atajo: cargalas en `apps/web/.env.local` y avisá a Claude; él las copia a Vercel como _Sensitive_.
`SUPABASE_SERVICE_ROLE_KEY` es la que permite que el webhook marque el pedido como pagado.

### 2.4 Cómo probar

1. Con las variables cargadas, en el checkout aparece habilitado **Tarjeta (Mercado Pago)**.
2. Pagá con el comprador de prueba y una tarjeta de prueba de Mercado Pago (están en su
   documentación, sección "Tarjetas de prueba"; titular `APRO` = pago aprobado, `OTHE` = rechazado).
3. El pedido pasa a **Pagado** en `/admin/pedidos` cuando llega el webhook (solo en staging).

---

## 3. Andreani (envíos)

### 3.1 Qué pedirle al ejecutivo de Andreani

- Alta en la **API de Andreani** (portal `developers.andreani.com`).
- **Usuario y contraseña** de API para **QA** (pruebas) y para **producción**.
- **Código de cliente** (ej. `CL0001234`).
- **Número de contrato** por servicio: **envío a domicilio** y **retiro en sucursal**.
- **Sucursal de origen** si el contrato la requiere.
- Confirmar si hay volumen mínimo mensual para habilitar la API.

### 3.2 Qué ya está hecho

- Servicio `apps/integrations` (Hono, Node 22): `GET /health` y `POST /shipping/quote`,
  protegido con firma HMAC (solo la web puede llamarlo).
- Adaptador de Andreani: login con token y cotización por CP, peso, volumen y valor
  declarado (`apps/integrations/src/providers/andreani.ts`), con tests.
- Cliente en la web con corte a 2,5 s y **respaldo a la tarifa plana** si el VPS no responde
  (`apps/web/lib/shipping/integrations-client.ts`).
- Secreto compartido `INTEGRATIONS_HMAC_SECRET` ya generado y cargado en Vercel y en los
  `.env` locales.
- `Dockerfile` listo para el VPS.

### 3.3 Dónde van las credenciales de Andreani

En el VPS, archivo `apps/integrations/.env` (plantilla: `apps/integrations/.env.example`):

```
ANDREANI_ENV=sandbox        # production cuando esté probado
ANDREANI_USER=
ANDREANI_PASSWORD=
ANDREANI_CLIENT=
ANDREANI_CONTRACT_HOME=
ANDREANI_CONTRACT_BRANCH=
ANDREANI_ORIGIN_BRANCH=
```

Para probar en esta PC: completar `apps/integrations/.env`, correr
`pnpm --filter integrations dev` y abrir `http://localhost:8787/health`
(debe decir `"andreani": "sandbox"`). Después, en `apps/web/.env.local`, descomentar
`INTEGRATIONS_URL=http://localhost:8787`.

### 3.4 Lo que falta para cotizar con Andreani en el checkout

1. **Peso y medidas de cada producto** (hoy la mayoría no los tiene): sin eso no se puede
   cotizar. Cargarlos es tarea de catálogo.
2. **Validar en QA** las rutas y campos de la API con las credenciales reales (el adaptador
   sigue la documentación pública; los tests fijan el formato esperado).
3. **Montar el VPS** (Docker + Caddy + dominio `int.balancebeauty.com.ar`, docs/13) — requiere
   acceso SSH al VPS y tu aprobación para el despliegue.
4. Conectar la cotización al checkout y sumar crear envío, etiqueta y seguimiento.

---

## Estado

| Pieza                                | Estado                                                             |
| ------------------------------------ | ------------------------------------------------------------------ |
| Admin `/admin/pedidos`               | ✅ listo — falta que crees tu usuario                              |
| Mercado Pago Checkout Pro            | ✅ código listo — faltan credenciales y deploy a staging (webhook) |
| Andreani — cotización                | 🟡 servicio y adaptador listos — faltan credenciales, pesos y VPS  |
| Andreani — envíos/etiquetas/tracking | ⏳ siguiente etapa                                                 |
