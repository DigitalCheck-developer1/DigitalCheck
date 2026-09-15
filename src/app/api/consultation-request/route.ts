import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mail/mailer";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(1).max(2000),
  url: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi. Controlla i campi e riprova." }, { status: 400 });
  }

  const { name, email, phone, message, url } = parsed.data;
  const to = process.env.SUPPORT_EMAIL || "imperiumdigitalitaly@gmail.com";

  const text = [
    "Nuova richiesta di consulenza da DigitalCheck",
    "",
    `Nome: ${name}`,
    `Email: ${email}`,
    phone ? `Telefono: ${phone}` : null,
    url ? `Sito analizzato: ${url}` : null,
    "",
    "Esigenze:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendMail({ to, subject: `Richiesta di consulenza — ${name}`, text });

  if (!result.sent) {
    return NextResponse.json(
      { error: "Non e' stato possibile inviare la richiesta in questo momento. Riprova tra poco." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
