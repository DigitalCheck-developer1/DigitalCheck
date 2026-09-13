import type { AiAnalysis, BusinessGoal, BusinessType, CrawlResult, SeoFacts } from "@/types";
import { buildAiInput, buildSystemPrompt, buildUserPrompt } from "./prompts";
import { parseAiAnalysis } from "./schema";

export interface ContentAnalysisResult {
  analysis: AiAnalysis | null;
  unavailableReason?: string;
}

/**
 * Chiama il provider AI configurato via env var. Se AI_API_KEY non e'
 * impostata, o la risposta non rispetta lo schema atteso, ritorna
 * analysis: null con una motivazione esplicita — il report deve
 * dichiararlo, mai inventare un'interpretazione.
 */
export async function runContentAnalysis(
  facts: SeoFacts,
  crawl: CrawlResult,
  businessType: BusinessType,
  goal: BusinessGoal
): Promise<ContentAnalysisResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return {
      analysis: null,
      unavailableReason:
        "Analisi AI non disponibile: nessun provider configurato (AI_API_KEY assente in .env).",
    };
  }

  const payload = buildAiInput(facts, crawl, businessType, goal);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(payload);

  let rawText: string;
  try {
    rawText = await callAiProvider(system, user, apiKey);
  } catch (err) {
    return {
      analysis: null,
      unavailableReason: `Analisi AI non disponibile: errore nella chiamata al provider (${
        err instanceof Error ? err.message : "errore sconosciuto"
      }).`,
    };
  }

  const parsed = parseAiAnalysis(rawText);
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

/**
 * Adapter verso il provider AI. Implementato per l'endpoint
 * /v1/messages di Anthropic; per usare un altro provider, sostituisci
 * solo questa funzione (l'interfaccia sopra resta invariata).
 */
async function callAiProvider(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.AI_MODEL || "claude-sonnet-4-6";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

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
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Il provider AI ha risposto con status ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const textBlock = data.content?.find((block) => block.type === "text");
    if (!textBlock?.text) {
      throw new Error("Risposta del provider AI priva di contenuto testuale");
    }
    return textBlock.text;
  } finally {
    clearTimeout(timer);
  }
}
