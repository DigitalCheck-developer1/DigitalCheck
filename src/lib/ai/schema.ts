import { z } from "zod";

// Schema dell'output atteso dal modello AI (sezione 25 del brief).
// Ogni risposta del provider viene validata contro questo schema prima
// di essere usata: se non e' conforme, il report la tratta come
// "analisi AI non disponibile" invece di propagare dati inaffidabili.
export const aiAnalysisSchema = z.object({
  summary: z.string().min(1).max(2000),
  strengths: z.array(z.string()).max(10),
  issues: z
    .array(
      z.object({
        title: z.string(),
        category: z.enum(["technical", "ux", "seo", "content", "conversion"]),
        severity: z.enum(["high", "medium", "low"]),
        explanation: z.string(),
        recommendation: z.string(),
      })
    )
    .max(15),
  priorities: z.array(z.string()).max(10),
  conversion_analysis: z.string(),
  content_analysis: z.string(),
});

export type AiAnalysisRaw = z.infer<typeof aiAnalysisSchema>;

export function parseAiAnalysis(rawJson: string): AiAnalysisRaw | null {
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawJson);
  } catch {
    return null;
  }
  const result = aiAnalysisSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
