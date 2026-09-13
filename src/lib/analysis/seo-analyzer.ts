import * as cheerio from "cheerio";
import type { CrawlResult, SeoFacts } from "@/types";

/**
 * Estrae SOLO fatti tecnici direttamente verificabili nell'HTML
 * scaricato. Non dichiara mai "indicizzato su Google" o simili: quella
 * e' un'affermazione che richiederebbe un servizio esterno (es. Search
 * Console) che questo modulo non ha. Vedi report-builder per come
 * questi fatti vengono etichettati "rilevato tecnicamente" nel report.
 */
export function analyzeSeoFacts(crawl: CrawlResult): SeoFacts {
  const home = crawl.pages[0];
  const $ = cheerio.load(home.html);
  const origin = new URL(home.finalUrl).origin;

  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;

  const h1 = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const viewportPresent = $('meta[name="viewport"]').length > 0;
  const langAttribute = $("html").attr("lang") || null;

  const images = $("img");
  const imagesWithAlt = images.filter((_, el) => {
    const alt = $(el).attr("alt");
    return typeof alt === "string" && alt.trim().length > 0;
  });

  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#")) return;
    try {
      const resolved = new URL(href, origin);
      if (resolved.origin === origin) internalLinks++;
      else externalLinks++;
    } catch {
      // href non risolvibile (mailto:, tel:, javascript:, ecc.) — ignorato
    }
  });

  const ogTags = $('meta[property^="og:"]')
    .map((_, el) => $(el).attr("property") ?? "")
    .get()
    .filter(Boolean);

  const jsonLdTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (entry && typeof entry === "object" && "@type" in entry) {
          jsonLdTypes.push(String((entry as Record<string, unknown>)["@type"]));
        }
      }
    } catch {
      // JSON-LD malformato — non blocca l'analisi, semplicemente non contribuisce
    }
  });

  return {
    url: home.finalUrl,
    httpsUsed: home.finalUrl.startsWith("https://"),
    statusCode: home.statusCode,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    h1,
    h2Count: $("h2").length,
    h3Count: $("h3").length,
    canonical,
    viewportPresent,
    langAttribute,
    images: { total: images.length, withAlt: imagesWithAlt.length },
    internalLinks,
    externalLinks,
    openGraph: { present: ogTags.length > 0, tags: ogTags },
    structuredData: { present: jsonLdTypes.length > 0, types: jsonLdTypes },
    robotsTxtPresent: crawl.robotsTxt.present,
    sitemapPresent: crawl.sitemapXml.present,
  };
}
