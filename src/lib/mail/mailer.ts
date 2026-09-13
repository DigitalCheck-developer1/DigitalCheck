interface SendMailInput {
  to: string;
  subject: string;
  text: string;
}

export interface SendMailResult {
  sent: boolean;
  reason?: string;
}

/**
 * Adapter email transazionale, implementato per Resend. Per usare un
 * altro provider, sostituisci solo questa funzione — le route che la
 * chiamano non cambiano.
 *
 * Se RESEND_API_KEY non e' configurata, NON inventa un invio riuscito:
 * logga il contenuto lato server (utile in sviluppo) e ritorna
 * sent: false, cosi' la route chiamante puo' comunicarlo onestamente
 * all'utente invece di promettere un'email che non arrivera' mai.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "DigitalCheck <no-reply@digitalcheck.app>";

  if (!apiKey) {
    console.log(
      `[mailer] RESEND_API_KEY assente — email non inviata realmente.\nA: ${input.to}\nOggetto: ${input.subject}\n${input.text}`
    );
    return { sent: false, reason: "Provider email non configurato (RESEND_API_KEY mancante)." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      return { sent: false, reason: `Il provider email ha risposto con status ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "Errore sconosciuto durante l'invio email",
    };
  }
}
