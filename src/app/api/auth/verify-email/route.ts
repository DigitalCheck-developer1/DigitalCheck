import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/tokens";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?verify=missing_token`);
  }

  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: { gt: new Date() } },
  });

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?verify=invalid_or_expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), emailVerifyTokenHash: null, emailVerifyExpiresAt: null },
  });

  return NextResponse.redirect(`${appUrl}/login?verify=success`);
}
