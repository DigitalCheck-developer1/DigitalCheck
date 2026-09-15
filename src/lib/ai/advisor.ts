import type { DigitalCheckReport } from "@/types";
import { callGemini } from "./gemini-client";

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
  const system = [
    "Sei l'assistente di DigitalCheck: aiuti il proprietario di una piccola attivita' a migliorare il proprio sito.",
    "Rispondi SOLO sulla base dei dati del sito forniti qui sotto: non inventare informazioni che non ti sono state date.",
    "Quando la domanda lo permette, non limitarti a un consiglio generico: scrivi il testo pronto da incollare (es. un title, una meta description, un testo alt), tra virgolette, cosi' l'utente puo' copiarlo direttamente.",
    "Rispondi in italiano, in modo diretto e pratico, in pochi paragrafi.",
  ].join(" ");

  const user = `Dati del sito:\n${buildContext(report)}\n\nDomanda dell'utente: ${question}`;

  const result = await callGemini(system, user, { timeoutMs: 25_000 });
  if (!result.text) {
    return { answer: null, unavailableReason: result.errorReason };
  }
  return { answer: result.text };
}
