import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaLogs: Prisma.LogLevel[] =
  process.env.PRISMA_QUERY_LOG === "true" ? ["query", "info", "warn", "error"] : ["warn", "error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogs,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
