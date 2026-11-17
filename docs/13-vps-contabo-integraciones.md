# 13 — VPS Contabo: servicio de integraciones

## VPS asignado

| Dato              | Valor                                                       |
| ----------------- | ----------------------------------------------------------- |
| Plan              | Contabo **Cloud VPS 20 SSD** (no setup)                     |
| CPU / RAM / Disco | **6 vCPU / 12 GB RAM / 200 GB SSD**                         |
| Región            | **EU** (Europa)                                             |
| SO                | Linux (distribución a confirmar; objetivo Ubuntu 24.04 LTS) |
| Alta              | 12/07/2026                                                  |

**Capacidad**: sobra para este stack. Se pueden correr **staging y producción en el mismo VPS** (dos stacks de Compose aislados) y queda margen para servicios extra.

| Stack                                           | CPU (límite)                           | RAM (límite) | Disco       |
| ----------------------------------------------- | -------------------------------------- | ------------ | ----------- |
| prod: api + worker + redis                      | 3 vCPU                                 | 4 GB         | 10 GB       |
| staging: api + worker + redis                   | 1 vCPU                                 | 1,5 GB       | 5 GB        |
| caddy + uptime‑kuma + dozzle                    | 0,5 vCPU                               | 0,5 GB       | 2 GB        |
| Pipeline de imágenes (sharp, picos)             | dentro del worker prod, concurrencia 2 | —            | 20 GB caché |
| Backups locales (7 días) antes de subir offsite | —                                      | —            | 30 GB       |
| Libre / margen                                  | ~1,5 vCPU                              | ~6 GB        | ~130 GB     |

Límites aplicados con `deploy.resources.limits` en Compose para que un pico de imágenes no afecte la API.

## Impacto de la región EU y cómo se neutraliza

La latencia Europa ↔ Argentina/São Paulo es de ~200–250 ms por ida y vuelta. Una cotización en vivo durante el checkout sería: Vercel `gru1` → VPS EU (~220 ms) → API del transportista en AR (~250 ms) → vuelta → **0,6–1,2 s**. Inaceptable en el camino crítico.

**Solución (ADR‑014): sacar al VPS del camino crítico del checkout.**

1. **Matriz de tarifas precalculada**: el worker del VPS consulta cada noche (y ante cambios de tarifas) a MiCorreo/Andreani por **zona/CP representativo × franja de peso × franja de tamaño × modalidad (domicilio/sucursal)** y guarda el resultado en la tabla `shipping_rate_matrix` de Supabase (`sa-east-1`).
2. El checkout cotiza **leyendo Supabase** (misma región que Vercel, ~5–20 ms). El VPS no participa en tiempo real.
3. Solo si un CP no está en la matriz, se pide cotización en vivo al VPS con timeout 2,5 s y, si falla, tarifa plana (`shipping_rates`). Ese CP se agrega a la matriz para la próxima vez.
4. Sucursales de retiro: se sincronizan al día a la tabla `pickup_branches` en Supabase; el checkout tampoco llama al VPS para listarlas.
5. Todo lo demás (crear orden, etiqueta, tracking, imágenes, feeds, backups) es **asíncrono por cola**, donde la latencia no importa.

Resultado: la región del VPS no afecta la velocidad que percibe el cliente.

**Validar al inicio (V‑15)**: que las APIs argentinas (MiCorreo, Andreani, ARCA) **acepten tráfico desde IPs europeas**. Algunos servicios argentinos filtran IPs extranjeras. Si alguna bloquea, opciones: (a) contratar un VPS chico de Contabo en región US/otra con salida aceptada solo para ese proveedor, (b) proxy de salida con IP argentina, (c) mover esa integración a una función de Vercel en `gru1` (solo si es rápida).

## Por qué un VPS además de Vercel

Vercel cobra por tiempo de función y no está pensado para procesos largos, colas ni crons pesados. El VPS (costo fijo) absorbe todo lo que es **lento, periódico o depende de terceros**:

| Va al VPS                                                                | Se queda en Vercel / Supabase                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Andreani (cotizar, crear orden, etiqueta PDF, tracking)                  | Render del sitio, Server Actions                              |
| Correo Argentino MiCorreo (cotizar, sucursales, órdenes)                 | **Webhook de pagos** (crítico: alta disponibilidad de Vercel) |
| Sincronización de tracking (polling cada 2 h)                            | `place_order` / `confirm_payment` (Postgres)                  |
| Procesamiento de imágenes (sharp → AVIF/WebP)                            | Reservas de stock (`pg_cron`)                                 |
| Facturación electrónica ARCA (WSAA/WSFE, certificados, IP fija) — fase 2 | Auth                                                          |
| Emails diferidos (carrito abandonado, "volvió el stock")                 | Emails transaccionales inmediatos                             |
| Backups `pg_dump` nocturnos + copia offsite                              |                                                               |
| Feeds (Google Merchant / Meta Catalog) generados cada noche              |                                                               |
| Uptime monitoring del sitio                                              |                                                               |

## Arquitectura

```
Vercel (Next.js) ──HMAC──► https://int.balancebeauty.com.ar  (Caddy, TLS automático)
                                   │
                         ┌─────────▼──────────┐
                         │ api  (Hono + Node 22, TypeScript)  │ ← endpoints síncronos: /shipping/quote, /shipping/branches
                         └─────────┬──────────┘
                                   │ encola
                         ┌─────────▼──────────┐      ┌──────────┐
                         │ worker (BullMQ)     │◄────►│  Redis   │ (colas + caché de cotizaciones)
                         └─────────┬──────────┘      └──────────┘
                                   │
          Andreani API · MiCorreo API · ARCA · Resend · Supabase (pooler 6543, secret key dedicada)
                                   │
                         Uptime Kuma · Dozzle (logs) · Sentry · backups → Contabo Object Storage / Backblaze B2
```

### Componentes (Docker Compose)

| Servicio      | Imagen               | Notas                                                                                                                                                                |
| ------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caddy`       | caddy:2              | Reverse proxy, HTTPS Let's Encrypt, solo 80/443 expuestos                                                                                                            |
| `api`         | propia (GHCR)        | Hono, validación Zod, auth HMAC, rate limit; endpoint de cotización en vivo solo como respaldo                                                                       |
| `worker`      | propia (GHCR)        | BullMQ: `rates.matrix.refresh`, `branches.sync`, `shipment.create`, `label.generate`, `tracking.sync`, `image.process`, `feed.build`, `email.deferred`, `backup.run` |
| `redis`       | redis:7-alpine       | AOF activado, solo red interna                                                                                                                                       |
| `uptime-kuma` | louislam/uptime-kuma | Monitoreo del sitio, la API y Supabase; alertas por Telegram/email                                                                                                   |
| `dozzle`      | amir20/dozzle        | Visor de logs, detrás de auth básica                                                                                                                                 |

Monorepo: `apps/web` (Next.js) + `apps/integrations` (Hono) + `packages/shared` (tipos Zod compartidos: `ShippingQuote`, `ShipmentStatus`). Gestionado con pnpm workspaces + Turborepo (cache de builds en CI).

## Contrato Vercel ↔ VPS

- Cada request firmado: header `X-Signature = HMAC_SHA256(secret, timestamp + body)` + `X-Timestamp` (ventana 5 min) → evita replay.
- El checkout lee primero `shipping_rate_matrix` en Supabase (ver "Impacto de la región EU"). Solo en un CP no cubierto llama al VPS con **timeout 2,5 s**; si no responde o falla → **fallback** a `shipping_rates` (tarifa plana por zona) marcada como "estimada". El checkout **nunca** se cae por el VPS (circuit breaker con `opossum`).
- Caché de cotizaciones en vivo en Redis: clave `carrier:CP:peso_bucket:tamaño_bucket`, TTL 6 h.
- Eventos de vuelta (tracking actualizado, etiqueta lista) → el worker escribe en Supabase (`shipments`) y dispara revalidación/email.

## Integraciones de envío

### Andreani

- Portal: `developers.andreani.com` (docs en español). Entornos: QA `apisqa.andreani.com` / prod `apis.andreani.com`.
- Requiere **usuario, contraseña y número(s) de contrato** otorgados por Andreani (comercial). Hay reportes de que exigen un volumen mínimo mensual para habilitar la API → **confirmar con el ejecutivo** (Q‑05).
- Funciones: cotizar a domicilio/sucursal, sucursales, crear orden, etiqueta (PDF), tracking.

### Correo Argentino

- **MiCorreo API** (cuenta MiCorreo gratuita + solicitud de token): `api.correoargentino.com.ar/micorreo/v1`, test `apitest.correoargentino.com.ar`. Auth Basic → JWT. Cotiza por CP destino + peso/dimensiones, lista sucursales, crea órdenes.
- Alternativa corporativa **PAQ.AR** (Agreement + ApiKey vía ejecutivo de cuentas).

Ambas implementan la interfaz `ShippingProvider { quote, branches, createShipment, label, track }` para poder sumar otros (moto CABA, Envíopack, etc.).

> Requisito de datos: cotizar exige **peso y dimensiones** reales por producto. Hoy solo 11 de 53 los tienen → tarea de contenido.

## Hardening del VPS (antes de exponer nada)

- [ ] Ubuntu 24.04 LTS actualizado; `unattended-upgrades` solo seguridad.
- [ ] Usuario no root con sudo; **SSH solo con clave**, `PermitRootLogin no`, `PasswordAuthentication no`, puerto no estándar opcional.
- [ ] `ufw`: permitir 443/80 y SSH solo desde IPs conocidas (o vía Tailscale y SSH cerrado al público).
- [ ] `fail2ban` para SSH.
- [ ] Docker sin exponer puertos internos (Redis, Kuma y Dozzle solo por red interna / túnel).
- [ ] Secretos en `.env` con permisos 600 (o Docker secrets); **secret key de Supabase dedicada al VPS** (revocable sin afectar a Vercel).
- [ ] Snapshots de Contabo semanales + backups de datos offsite (Contabo Object Storage o Backblaze B2) con cifrado (`restic`).
- [ ] Monitoreo de disco/CPU/RAM (Uptime Kuma push o `node_exporter` si se agrega Grafana más adelante).
- [ ] IP fija del VPS registrada para whitelists de APIs que lo pidan (ARCA, transportistas).

## Consideraciones

- **Región EU**: resuelta con la matriz de tarifas en Supabase (ADR‑014); no hace falta migrar el VPS. Si en el futuro se agrega algo síncrono que dependa del VPS, reevaluar un segundo VPS en US East.
- **Base de datos desde el VPS**: el worker se conecta al pooler de Supabase en São Paulo (~200 ms por consulta). Por eso agrupa escrituras (upserts en lote) y usa RPCs, nunca bucles de consultas una por una.
- **Backups**: el `pg_dump` nocturno desde EU tarda más pero no importa (es de madrugada AR y la base es chica); se guarda local 7 días y se sube cifrado offsite (Contabo Object Storage EU o Backblaze B2).
- **Un solo nodo = punto único de falla** para envíos: aceptable porque nada crítico de pago depende de él, el checkout lee la matriz desde Supabase y hay fallback.
- **Snapshots de Contabo** antes de cada deploy del VPS (además de los semanales).

## Tareas

Ver sección **V** del backlog en [05](05-backlog-tareas.md).
