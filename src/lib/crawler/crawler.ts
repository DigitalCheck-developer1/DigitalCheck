import { assertUrlIsSafe, checkUrlIsSafe } from "@/lib/security/ssrf-guard";
import type { CrawlResult, CrawledPage } from "@/types";

const TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT_MS ?? 8000);
const MAX_RESPONSE_BYTES = Number(process.env.SCAN_MAX_RESPONSE_BYTES ?? 3_000_000);
const MAX_REDIRECTS = 5;

interface FetchSafeOptions {
  maxBytes?: number;
  timeoutMs?: number;
}

/**
 * fetch() con: validazione SSRF sull'URL iniziale E su ogni redirect
 * (redirect:"manual", cosi' possiamo ricontrollare ogni hop noi stessi),
 * timeout, limite dimensione risposta, e validazione del Content-Type.
 */
async function fetchSafe(
  targetUrl: string,
  options: FetchSafeOptions = {}
): Promise<{ finalUrl: string; statusCode: number; body: string; contentType: string }> {
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;

  let currentUrl = targetUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertUrlIsSafe(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "DigitalCheck-Bot/0.1 (+https://digitalcheck.app/bot)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    // 3xx: rivalida manualmente l'URL di destinazione prima di seguirlo.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return { finalUrl: currentUrl, statusCode: response.status, body: "", contentType: "" };
      }
      const nextUrl = new URL(location, currentUrl).toString();
      const check = await checkUrlIsSafe(nextUrl);
      if (!check.ok) {
        throw new Error(`Redirect verso una destinazione non sicura: ${check.reason}`);
      }
      currentUrl = nextUrl;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { finalUrl: currentUrl, statusCode: response.status, body: "", contentType };
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > maxBytes) {
      throw new Error("Risposta troppo grande, superato il limite consentito");
    }

    // Leggi con un limite duro anche se content-length manca o mente.
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return { finalUrl: currentUrl, statusCode: response.status, body: text, contentType };
    }

    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error("Risposta troppo grande, superato il limite consentito");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    return { finalUrl: currentUrl, statusCode: response.status, body, contentType };
  }

  throw new Error("Troppi redirect");
}

export interface CrawlOptions {
  maxPages: number;
}

/**
 * Esegue il crawl della homepage e, opzionalmente, di un numero limitato
 * di pagine interne collegate (fino a maxPages). Recupera anche
 * robots.txt e sitemap.xml, quando presenti, per l'analisi SEO.
 */
export async function crawlSite(requestedUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const result: CrawlResult = {
    requestedUrl,
    pages: [],
    robotsTxt: { present: false },
    sitemapXml: { present: false },
    errors: [],
  };

  let normalizedUrl: string;
  try {
    const parsed = new URL(requestedUrl);
    normalizedUrl = parsed.toString();
  } catch {
    result.errors.push({ url: requestedUrl, code: "INVALID_URL", message: "URL non valido" });
    return result;
  }

  const origin = new URL(normalizedUrl).origin;

  // Homepage
  try {
    const home = await fetchSafe(normalizedUrl);
    result.pages.push(toPage(normalizedUrl, home));
  } catch (err) {
    result.errors.push({
      url: normalizedUrl,
      code: "FETCH_FAILED",
      message: err instanceof Error ? err.message : "Errore sconosciuto",
    });
    return result; // senza homepage non ha senso proseguire il crawl
  }

  // robots.txt
  try {
    const robots = await fetchSafe(`${origin}/robots.txt`, { maxBytes: 100_000 });
    if (robots.statusCode === 200 && robots.body) {
      result.robotsTxt = { present: true, content: robots.body.slice(0, 5000) };
    }
  } catch {
    // assenza non e' un errore bloccante: resta "present: false"
  }

  // sitemap.xml
  try {
    const sitemap = await fetchSafe(`${origin}/sitemap.xml`, { maxBytes: 200_000 });
    if (sitemap.statusCode === 200 && sitemap.body) {
      result.sitemapXml = { present: true, url: `${origin}/sitemap.xml` };
    }
  } catch {
    // idem
  }

  // Pagine interne aggiuntive, estratte dai link della homepage,
  // limitate a options.maxPages (piano Free/Pro).
  const internalLinks = extractInternalLinks(result.pages[0].html, origin).slice(
    0,
    Math.max(0, options.maxPages - 1)
  );

  for (const link of internalLinks) {
    try {
      const page = await fetchSafe(link);
      if (page.contentType.includes("text/html")) {
        result.pages.push(toPage(link, page));
      }
    } catch (err) {
      result.errors.push({
        url: link,
        code: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    }
  }

  return result;
}

function toPage(
  requestedUrl: string,
  fetched: { finalUrl: string; statusCode: number; body: string; contentType: string }
): CrawledPage {
  return {
    url: requestedUrl,
    finalUrl: fetched.finalUrl,
    statusCode: fetched.statusCode,
    html: fetched.body,
    contentType: fetched.contentType,
    fetchedAt: new Date().toISOString(),
    sizeBytes: Buffer.byteLength(fetched.body, "utf-8"),
  };
}

function extractInternalLinks(html: string, origin: string): string[] {
  const hrefPattern = /href\s*=\s*["']([^"'#]+)["']/gi;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], origin);
      if (resolved.origin === origin) {
        found.add(resolved.toString());
      }
    } catch {
      // link non risolvibile, ignoralo
    }
  }
  return Array.from(found);
}
