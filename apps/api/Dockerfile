# syntax=docker/dockerfile:1.7
FROM node:22-alpine

RUN corepack enable
WORKDIR /workspace
RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=roof-tech-pnpm-store,target=/root/.local/share/pnpm/store/v11 \
    pnpm install --frozen-lockfile --filter @roof-tech/api... --fetch-retries=5 --fetch-timeout=300000

COPY . .

# Prisma generation needs a syntactically valid URL but does not connect during build.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/roof_tech?schema=public pnpm --filter @roof-tech/api build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
