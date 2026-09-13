import { prisma } from "@/lib/db/prisma";
import type { PlanType } from "@prisma/client";

export interface PlanLimits {
  maxSites: number;
  maxScansMonth: number;
  maxPagesScan: number;
}

// Fallback usato solo se la tabella UsageLimit non e' stata ancora
// popolata (es. subito dopo la prima migrazione, prima del seed).
const FALLBACK: Record<PlanType, PlanLimits> = {
  FREE: {
    maxSites: 1,
    maxScansMonth: 3,
    maxPagesScan: Number(process.env.SCAN_MAX_PAGES_FREE ?? 5),
  },
  PRO: {
    maxSites: 10,
    maxScansMonth: 100,
    maxPagesScan: Number(process.env.SCAN_MAX_PAGES_PRO ?? 20),
  },
};

export async function getPlanLimits(plan: PlanType): Promise<PlanLimits> {
  const row = await prisma.usageLimit.findUnique({ where: { plan } });
  if (!row) return FALLBACK[plan];
  return { maxSites: row.maxSites, maxScansMonth: row.maxScansMonth, maxPagesScan: row.maxPagesScan };
}

export async function countScansThisMonth(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return prisma.scan.count({
    where: {
      site: { ownerId: userId },
      startedAt: { gte: startOfMonth },
    },
  });
}

export async function countSites(userId: string): Promise<number> {
  return prisma.site.count({ where: { ownerId: userId } });
}
