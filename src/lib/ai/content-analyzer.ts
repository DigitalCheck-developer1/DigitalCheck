import type { AiAnalysis, BusinessGoal, BusinessType, CrawlResult, SeoFacts } from "@/types";
import { buildAiInput, buildSystemPrompt, buildUserPrompt } from "./prompts";
import { parseAiAnalysis } from "./schema";
import { callGemini } from "./gemini-client";

export interface ContentAnalysisResult {
  analysis: AiAnalysis | null;
  unavailableReason?: string;
}

export async function runContentAnalysis(
  facts: SeoFacts,
  crawl: CrawlResult,
  businessType: BusinessType,
  goal: BusinessGoal
): Promise<ContentAnalysisResult> {
  const payload = buildAiInput(facts, crawl, businessType, goal);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(payload);

  const result = await callGemini(system, user, { timeoutMs: 20_000 });
  if (!result.text) {
    return {
      analysis: null,
      unavailableReason: `Analisi AI non disponibile: ${result.errorReason ?? "errore sconosciuto"}.`,
    };
  }

  const parsed = parseAiAnalysis(result.text);
  if (!parsed) {
    return {
      analysis: null,
      unavailableReason:
        "Analisi AI non disponibile: la risposta del modello non era conforme al formato atteso.",
    };
  }

  const analysis: AiAnalysis = {
    summary: parsed.summary,
    strengths: parsed.strengths,
    issues: parsed.issues,
    priorities: parsed.priorities,
    conversionAnalysis: parsed.conversion_analysis,
    contentAnalysis: parsed.content_analysis,
  };

  return { analysis };
}
