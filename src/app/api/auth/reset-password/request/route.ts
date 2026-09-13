import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateToken, tokenExpiry } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/mail/mailer";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const genericResponse = {
    message: "Se l'indirizzo e' registrato, riceverai un'email con le istruzioni per reimpostare la password.",
  };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    // Stessa risposta di successo anche se l'utente non esiste: evita
    // di rivelare quali email sono registrate (user enumeration).
    return NextResponse.json(genericResponse);
  }

  const { token, tokenHash } = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: tokenExpiry(60) },
  });

  const resetLink = `${appUrl}/reset-password?token=${token}`;
  const mailResult = await sendMail({
    to: user.email,
    subject: "Reimposta la tua password DigitalCheck",
    text: `Reimposta la password visitando questo link (valido 60 minuti): ${resetLink}`,
  });

  return NextResponse.json({
    ...genericResponse,
    devResetLink: !mailResult.sent && process.env.NODE_ENV !== "production" ? resetLink : undefined,
  });
}
