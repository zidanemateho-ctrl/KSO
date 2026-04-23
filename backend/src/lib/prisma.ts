import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaLogs: Array<"query" | "info" | "warn" | "error"> =
  env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: prismaLogs
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
