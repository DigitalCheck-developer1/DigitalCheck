export interface PageSpeedResult {
  score: number; // Punteggio Lighthouse performance, 0-100
  lcpMs: number | null;
  clsScore: number | null;
  inpMs: number | null;
}

/**
 * Chiama Google PageSpeed Insights (strategia mobile) per la homepage.
 * Ritorna null se la chiave non e' configurata, la richiesta fallisce
 * o va in timeout: in quel caso il chiamante deve ricadere sulla stima
 * euristica esistente.
 */
export async function fetchPageSpeedScore(url: string): Promise<PageSpeedResult | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;

    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };

    const rawScore = data.lighthouseResult?.categories?.performance?.score;
    if (typeof rawScore !== "number") return null;

    const audits = data.lighthouseResult?.audits ?? {};
    const lcpMs = audits["largest-contentful-paint"]?.numericValue ?? null;
    const clsScore = audits["cumulative-layout-shift"]?.numericValue ?? null;
    const inpMs =
      audits["interaction-to-next-paint"]?.numericValue ??
      audits["max-potential-fid"]?.numericValue ??
      null;

    return {
      score: Math.round(rawScore * 100),
      lcpMs,
      clsScore,
      inpMs,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
