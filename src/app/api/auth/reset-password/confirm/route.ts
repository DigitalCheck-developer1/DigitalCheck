import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10, "La password deve avere almeno 10 caratteri"),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { token, newPassword } = parsed.data;

  if (!isPasswordStrongEnough(newPassword)) {
    return NextResponse.json({ error: "Password troppo debole (minimo 10 caratteri)" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
  });

  if (!user) {
    return NextResponse.json({ error: "Il link non e' valido o e' scaduto. Richiedine uno nuovo." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
  });

  return NextResponse.json({ message: "Password aggiornata. Ora puoi accedere." });
}
