export interface GeminiCallResult {
  text: string | null;
  errorReason?: string;
}

export async function callGemini(
  system: string,
  user: string,
  options?: { timeoutMs?: number }
): Promise<GeminiCallResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return { text: null, errorReason: "Nessun provider AI configurato (AI_API_KEY assente)." };
  }

  const model = process.env.AI_MODEL || "gemini-3.6-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 20_000);

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
      return {
        text: null,
        errorReason: `Il provider AI ha risposto con status ${response.status}: ${errorBody.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { text: null, errorReason: "Risposta del provider AI priva di contenuto testuale" };
    }
    return { text };
  } catch (err) {
    return {
      text: null,
      errorReason: err instanceof Error ? err.message : "Errore sconosciuto durante la chiamata AI",
    };
  } finally {
    clearTimeout(timer);
  }
}
