import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlanLimits, countSites } from "@/lib/billing/plan-limits";
import { toDbBusinessType, fromDbBusinessType } from "@/lib/db/enum-map";

const createSchema = z.object({
  url: z
    .string()
    .trim()
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .refine((v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    }, "URL non valido"),
  businessType: z.enum(["bnb", "hotel", "restaurant", "shop", "professional", "other"]),
  goal: z.enum([
    "increase_bookings",
    "increase_calls",
    "increase_quote_requests",
    "increase_visibility",
    "sell_products",
    "increase_contacts",
  ]),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const sites = await prisma.site.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      scans: {
        orderBy: { startedAt: "desc" },
        take: 2, // l'ultimo scan e il precedente, per calcolare la variazione
      },
    },
  });

  return NextResponse.json(
    sites.map((site) => ({
      id: site.id,
      url: site.url,
      businessType: fromDbBusinessType(site.businessType),
      goal: site.goal,
      monitoringEnabled: site.monitoringEnabled,
      lastScore: site.scans[0]?.overallScore ?? null,
      previousScore: site.scans[1]?.overallScore ?? null,
      lastScanAt: site.scans[0]?.completedAt ?? null,
      lastScanStatus: site.scans[0]?.status ?? null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const limits = await getPlanLimits(user.plan);
  const currentSites = await countSites(session.userId);
  if (currentSites >= limits.maxSites) {
    return NextResponse.json(
      { error: `Hai raggiunto il limite di ${limits.maxSites} siti per il piano ${user.plan}. Passa al piano Pro per aggiungerne altri.` },
      { status: 403 }
    );
  }

  const site = await prisma.site.create({
    data: {
      url: parsed.data.url,
      businessType: toDbBusinessType(parsed.data.businessType),
      goal: parsed.data.goal,
      ownerId: session.userId,
    },
  });

  return NextResponse.json(site, { status: 201 });
}
