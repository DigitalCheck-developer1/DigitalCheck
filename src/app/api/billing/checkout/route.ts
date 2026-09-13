import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { createProCheckoutSession } from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const result = await createProCheckoutSession(user.id, user.email, appUrl);
  if (!result.url) {
    return NextResponse.json({ error: result.error ?? "Pagamenti non disponibili al momento." }, { status: 503 });
  }

  return NextResponse.json({ url: result.url });
}
