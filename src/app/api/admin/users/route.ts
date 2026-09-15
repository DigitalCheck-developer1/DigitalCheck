import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sites: true } } },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      plan: u.plan,
      isAdmin: u.isAdmin,
      emailVerified: !!u.emailVerified,
      createdAt: u.createdAt,
      siteCount: u._count.sites,
    }))
  );
}
