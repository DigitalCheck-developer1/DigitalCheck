import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const [totalUsers, freeUsers, proUsers, totalScans, completedScans, failedScans, totalSites] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: "FREE" } }),
      prisma.user.count({ where: { plan: "PRO" } }),
      prisma.scan.count(),
      prisma.scan.count({ where: { status: "COMPLETED" } }),
      prisma.scan.count({ where: { status: "FAILED" } }),
      prisma.site.count(),
    ]);

  const conversionRate = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 1000) / 10 : 0;
  const scanSuccessRate = totalScans > 0 ? Math.round((completedScans / totalScans) * 1000) / 10 : 0;

  return NextResponse.json({
    totalUsers,
    freeUsers,
    proUsers,
    conversionRate,
    totalSites,
    totalScans,
    completedScans,
    failedScans,
    scanSuccessRate,
  });
}
