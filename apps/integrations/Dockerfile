# Imagen del servicio de integraciones (VPS Contabo, docs/13). Build desde la raíz del monorepo:
#   docker build -f apps/integrations/Dockerfile -t balance-integrations .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/integrations/package.json apps/integrations/
RUN pnpm install --filter integrations --frozen-lockfile
COPY apps/integrations apps/integrations
RUN pnpm --filter integrations build && pnpm --filter integrations deploy --prod --legacy /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/integrations/dist ./dist
COPY --from=build /repo/apps/integrations/package.json ./
USER node
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "dist/server.js"]
