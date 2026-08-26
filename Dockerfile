# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: Prisma's query engine links against glibc
# and OpenSSL, and the musl builds are a recurring source of runtime
# "engine not found" failures that only show up once deployed.

# --- build -------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime -----------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Regenerated rather than copied from the build stage: the client is emitted
# into node_modules, which this stage installs fresh, so a copy would be
# overwritten or mismatched.
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./

# LOCAL_STORAGE_DIR lives under /app/.data so a single mounted volume covers
# uploaded documents. Owned by `node` because the process drops to that user.
RUN chmod +x docker-entrypoint.sh \
 && mkdir -p /app/.data/documents \
 && chown -R node:node /app/.data

USER node
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
