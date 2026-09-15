import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { fromDbBusinessType } from "@/lib/db/enum-map";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true } },
      scans: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(
    sites.map((s) => ({
      id: s.id,
      url: s.url,
      businessType: fromDbBusinessType(s.businessType),
      ownerEmail: s.owner.email,
      monitoringEnabled: s.monitoringEnabled,
      createdAt: s.createdAt,
      lastScan: s.scans[0]
        ? {
            id: s.scans[0].id,
            status: s.scans[0].status,
            overallScore: s.scans[0].overallScore,
            startedAt: s.scans[0].startedAt,
            errorMessage: s.scans[0].errorMessage,
          }
        : null,
    }))
  );
}
