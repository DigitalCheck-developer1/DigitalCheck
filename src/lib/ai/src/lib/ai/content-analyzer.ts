import type { AiAnalysis, BusinessGoal, BusinessType, CrawlResult, SeoFacts } from "@/types";
import { buildAiInput, buildSystemPrompt, buildUserPrompt } from "./prompts";
import { parseAiAnalysis } from "./schema";

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

async function callAiProvider(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.AI_MODEL || "gemini-3.6-flash";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: system }] },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Il provider AI ha risposto con status ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Risposta del provider AI priva di contenuto testuale");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
