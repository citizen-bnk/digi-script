import { PrismaClient } from "@prisma/client";

/**
 * A serverless function is re-entered many times per container, and each
 * `new PrismaClient()` opens its own pool — enough of them and Postgres
 * refuses connections. Caching on globalThis keeps one client per warm
 * container. (On a long-running server this is simply a no-op singleton.)
 *
 * The connection string itself still has to be a pooled one on serverless:
 * Neon's `-pooler` host, or any pgbouncer URL with
 * `?pgbouncer=true&connection_limit=1`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// On Vercel the container is reused across invocations, so cache there too —
// separately from the dev branch above, which exists to survive hot reload.
if (process.env.VERCEL) {
  globalForPrisma.prisma = prisma;
}
