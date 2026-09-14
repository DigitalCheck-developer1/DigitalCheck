import pathlib

def replace_checked(path, old, new):
    p = pathlib.Path(path)
    text = p.read_text()
    if old not in text:
        print("ATTENZIONE: non trovato in " + path)
        return
    p.write_text(text.replace(old, new, 1))
    print("OK: " + path)

replace_checked(
    "src/lib/ai/content-analyzer.ts",
    '''async function callAiProvider(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.AI_MODEL || "claude-sonnet-5";

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
}''',
    '''async function callAiProvider(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.AI_MODEL || "gemini-2.5-flash";

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
      throw new Error(`Il provider AI ha risposto con status ${response.status}`);
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
}''',
)

replace_checked(
    "src/lib/ai/advisor.ts",
    '''  const controller = new AbortController();
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
        model: process.env.AI_MODEL || "claude-sonnet-5",
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
  } catch (err) {''',
    '''  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const model = process.env.AI_MODEL || "gemini-2.5-flash";

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
      return { answer: null, unavailableReason: `Il provider AI ha risposto con status ${response.status}` };
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { answer: null, unavailableReason: "Risposta del provider AI priva di contenuto testuale" };
    }
    return { answer: text };
  } catch (err) {''',
)
