import { PrismaClient } from "@prisma/client";

// Pattern standard Next.js: in sviluppo il modulo viene ricaricato ad
// ogni cambio file, il che senza questo accorgimento creerebbe una
// nuova connessione al database a ogni hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
