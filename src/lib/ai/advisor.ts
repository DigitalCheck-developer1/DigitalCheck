import type { DigitalCheckReport } from "@/types";

export interface AdvisorResult {
  answer: string | null;
  unavailableReason?: string;
}

function buildContext(report: DigitalCheckReport): string {
  const topIssues = report.issues
    .slice(0, 8)
    .map((i) => `- [${i.severity}] ${i.title}: ${i.description}`)
    .join("\n");

  return [
    `Sito: ${report.requestedUrl}`,
    `Tipo di attivita': ${report.businessType}`,
    `Obiettivo dichiarato: ${report.goal}`,
    `Digital Score: ${report.overallScore}/100`,
    `Riepilogo: ${report.businessImpactSummary}`,
    `Problemi rilevati nell'ultima scansione:\n${topIssues}`,
  ].join("\n");
}

export async function askAdvisor(
  question: string,
  report: DigitalCheckReport
): Promise<AdvisorResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return {
      answer: null,
      unavailableReason: "Assistente AI non disponibile: nessun provider configurato (AI_API_KEY assente).",
    };
  }

  const system = [
    "Sei l'assistente di DigitalCheck: aiuti il proprietario di una piccola attivita' a migliorare il proprio sito.",
    "Rispondi SOLO sulla base dei dati del sito forniti qui sotto: non inventare informazioni che non ti sono state date.",
    "Quando la domanda lo permette, non limitarti a un consiglio generico: scrivi il testo pronto da incollare (es. un title, una meta description, un testo alt), tra virgolette, cosi' l'utente puo' copiarlo direttamente.",
    "Rispondi in italiano, in modo diretto e pratico, in pochi paragrafi.",
  ].join(" ");

  const user = `Dati del sito:\n${buildContext(report)}\n\nDomanda dell'utente: ${question}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      return { answer: null, unavailableReason: `Il provider AI ha risposto con status ${response.status}` };
    }

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock?.text) {
      return { answer: null, unavailableReason: "Risposta del provider AI priva di contenuto testuale" };
    }
    return { answer: textBlock.text };
  } catch (err) {
    return {
      answer: null,
      unavailableReason: err instanceof Error ? err.message : "Errore sconosciuto durante la richiesta all'assistente",
    };
  } finally {
    clearTimeout(timer);
  }
}
