# Entorno local de desarrollo (Windows)

Proyecto en `C:\dev\balance-beauty` (ruta corta a propósito: Windows limita las rutas a 260 caracteres y `node_modules` las supera en carpetas profundas).

## Ya instalado en esta PC

| Herramienta                            | Versión             | Para qué                                                       |
| -------------------------------------- | ------------------- | -------------------------------------------------------------- |
| Node.js                                | 22.23               | Ejecutar Next.js                                               |
| pnpm                                   | 10.34               | Dependencias del monorepo                                      |
| Git                                    | 2.56                | Control de versiones                                           |
| Vercel CLI                             | 65.17               | Deploys manuales (solo con aprobación, ADR‑010)                |
| Playwright (Chromium, WebKit, Firefox) | 1.65                | Tests en 9 dispositivos                                        |
| Supabase CLI                           | 3.2 (devDependency) | Migraciones y tipos (requiere Docker o un proyecto en la nube) |

## Levantar el sitio

- **Doble clic en `iniciar-sitio.cmd`** (raíz del proyecto): instala dependencias si faltan, levanta `localhost:3000` y abre el navegador.
- O en una terminal:
  ```
  pnpm --filter web dev --port 3000
  ```
- Versión de producción local (para medir performance):
  ```
  pnpm --filter web build
  pnpm --filter web start --port 3000
  ```

## Verificar antes de cada commit

```
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
pnpm --filter web test:e2e
```

## Base de datos (Supabase): dos caminos

Esta PC tiene **8 GB de RAM** y ~27 GB libres. Supabase local levanta ~10 contenedores (≈ 3–4 GB de RAM).

### Opción A — Proyecto de Supabase en la nube como staging (recomendada para esta PC)

1. Crear cuenta en supabase.com → proyecto `balance-staging` en región **São Paulo (sa-east-1)**, plan Free.
2. Pasarme (o cargar en `apps/web/.env.local`) `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el _project ref_.
3. Aplico migraciones + seed con `supabase link` + `supabase db push` y activo `CATALOG_SOURCE=supabase`.
   Sin Docker, sin consumo de RAM local.

### Opción B — Supabase local con Docker

Requiere habilitar WSL2 y Docker Desktop. **Lo hace el dueño de la PC** (cambia funciones de Windows, pide administrador y reinicio):

1. PowerShell **como administrador**:
   ```
   wsl --install
   ```
2. Reiniciar la PC.
3. Instalar Docker Desktop:
   ```
   winget install Docker.DockerDesktop
   ```
4. Abrir Docker Desktop una vez (aceptar términos) y en _Settings → Resources_ limitar a 4 GB de RAM.
5. Avisarme: corro `pnpm db:start`, `pnpm db:reset` (migraciones + seed), `pnpm db:test` (RLS) y `pnpm db:types`.

## Problemas conocidos

- Si en `pnpm dev` no aparecen clases nuevas de Tailwind: borrar `apps/web/.next` y reiniciar.
- Firefox de Playwright no arranca en esta PC (`spawn UNKNOWN`): corre en CI (Linux).
- No correr Lighthouse con el servidor de desarrollo ocupando el puerto 3000 (mide modo dev): usar `--collect.startServerCommand="pnpm start --port 3200"`.
