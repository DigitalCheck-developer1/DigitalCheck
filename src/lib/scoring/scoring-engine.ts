import type {
  BusinessType,
  CategoryScore,
  CrawlResult,
  ScanIssue,
  SeoFacts,
} from "@/types";
import { getWeightsFor } from "./weights";
import { fetchPageSpeedScore } from "@/lib/analysis/pagespeed";

interface ScoringInput {
  facts: SeoFacts;
  crawl: CrawlResult;
  businessType: BusinessType;
  url: string;
}

export interface ScoringOutput {
  overallScore: number;
  categoryScores: CategoryScore[];
  issues: ScanIssue[];
  unverifiable: string[];
}

function pushIssue(issues: ScanIssue[], issue: ScanIssue) {
  issues.push(issue);
}

// ---------- SEO ----------
function scoreSeo(facts: SeoFacts, issues: ScanIssue[]): number {
  let score = 100;

  if (!facts.title) {
    score -= 20;
    pushIssue(issues, {
      title: "Titolo della pagina mancante",
      description: "La homepage non ha un tag <title>.",
      whyItMatters:
        "Il titolo e' il primo elemento mostrato nei risultati di ricerca e nella scheda del browser: senza, Google e i visitatori non capiscono subito di cosa tratta il sito.",
      evidence: "Tag <title> assente nell'HTML della homepage.",
      recommendation: "Aggiungi un titolo unico di 50-60 caratteri che descriva l'attivita' e la localita'.",
      severity: "high",
      category: "seo",
    });
  } else if (facts.titleLength < 20 || facts.titleLength > 65) {
    score -= 8;
    pushIssue(issues, {
      title: "Lunghezza del titolo non ottimale",
      description: `Il titolo e' lungo ${facts.titleLength} caratteri.`,
      whyItMatters: "Un titolo troppo corto non sfrutta lo spazio disponibile nei risultati di ricerca; uno troppo lungo viene troncato da Google.",
      evidence: facts.title ?? undefined,
      recommendation: "Punta a un titolo tra 50 e 60 caratteri.",
      severity: "low",
      category: "seo",
    });
  }

  if (!facts.metaDescription) {
    score -= 12;
    pushIssue(issues, {
      title: "Meta description assente",
      description: "Non e' presente una meta description.",
      whyItMatters: "E' il testo che Google mostra sotto il titolo nei risultati: senza, il motore di ricerca ne genera una automatica, spesso meno efficace nel convincere l'utente a cliccare.",
      recommendation: "Scrivi una descrizione di 140-160 caratteri che comunichi il valore dell'attivita' e includa una call to action.",
      severity: "medium",
      category: "seo",
    });
  }

  if (facts.h1.length === 0) {
    score -= 12;
    pushIssue(issues, {
      title: "Nessun titolo H1 in pagina",
      description: "La homepage non ha un tag H1.",
      whyItMatters: "L'H1 aiuta sia gli utenti che i motori di ricerca a capire immediatamente il tema principale della pagina.",
      recommendation: "Aggiungi un H1 chiaro, ad esempio il nome dell'attivita' e la localita' o la proposta di valore principale.",
      severity: "medium",
      category: "seo",
    });
  } else if (facts.h1.length > 1) {
    score -= 5;
    pushIssue(issues, {
      title: "Piu' di un H1 nella stessa pagina",
      description: `Rilevati ${facts.h1.length} tag H1.`,
      whyItMatters: "Piu' H1 possono confondere la gerarchia dei contenuti agli occhi dei motori di ricerca.",
      recommendation: "Usa un solo H1 per pagina e struttura il resto con H2/H3.",
      severity: "low",
      category: "seo",
    });
  }

  if (!facts.canonical) {
    score -= 5;
  }

  if (!facts.robotsTxtPresent) {
    score -= 5;
    pushIssue(issues, {
      title: "robots.txt non trovato",
      description: "Il file /robots.txt non e' raggiungibile.",
      whyItMatters: "Senza robots.txt non puoi guidare in modo esplicito il comportamento dei crawler sulle sezioni da non indicizzare.",
      recommendation: "Aggiungi un file robots.txt, anche minimale, nella root del sito.",
      severity: "low",
      category: "technical",
    });
  }

  if (!facts.sitemapPresent) {
    score -= 5;
    pushIssue(issues, {
      title: "sitemap.xml non trovata",
      description: "Il file /sitemap.xml non e' raggiungibile.",
      whyItMatters: "La sitemap aiuta i motori di ricerca a scoprire ed esplorare tutte le pagine del sito, specialmente se non sono ben collegate tra loro.",
      recommendation: "Genera una sitemap.xml e segnalala anche nel robots.txt.",
      severity: "low",
      category: "seo",
    });
  }

  if (!facts.openGraph.present) {
    score -= 4;
  }

  if (!facts.structuredData.present) {
    score -= 4;
    pushIssue(issues, {
      title: "Dati strutturati assenti",
      description: "Non e' presente markup JSON-LD (schema.org).",
      whyItMatters: "I dati strutturati aiutano Google a mostrare risultati arricchiti (rich snippet) e a capire meglio il tipo di attivita'.",
      recommendation: "Aggiungi markup schema.org appropriato (es. LocalBusiness, LodgingBusiness, Restaurant a seconda del tipo di attivita').",
      severity: "medium",
      category: "seo",
    });
  }

  return Math.max(0, Math.min(100, score));
}

// ---------- Technical ----------
function scoreTechnical(facts: SeoFacts, issues: ScanIssue[]): number {
  let score = 100;

  if (!facts.httpsUsed) {
    score -= 35;
    pushIssue(issues, {
      title: "Il sito non usa HTTPS",
      description: "La homepage e' servita su HTTP invece che HTTPS.",
      whyItMatters: "Senza HTTPS i browser mostrano avvisi di sicurezza e Google penalizza il posizionamento; inoltre i dati inviati dai visitatori non sono cifrati.",
      recommendation: "Attiva un certificato SSL (spesso gratuito, es. Let's Encrypt) e forza il redirect da HTTP a HTTPS.",
      severity: "high",
      category: "technical",
    });
  }

  if (facts.statusCode >= 400) {
    score -= 40;
    pushIssue(issues, {
      title: "La homepage restituisce un errore",
      description: `Codice di stato HTTP ${facts.statusCode}.`,
      whyItMatters: "Se la homepage stessa risponde con un errore, sia i visitatori che i motori di ricerca non riescono ad accedere al sito.",
      recommendation: "Verifica la configurazione del server o dell'hosting.",
      severity: "high",
      category: "technical",
    });
  }

  if (!facts.langAttribute) {
    score -= 6;
  }

  return Math.max(0, Math.min(100, score));
}

// ---------- Accessibility ----------
function scoreAccessibility(facts: SeoFacts, issues: ScanIssue[]): number {
  let score = 100;

  const altRatio = facts.images.total > 0 ? facts.images.withAlt / facts.images.total : 1;
  if (facts.images.total > 0 && altRatio < 0.8) {
    const missing = facts.images.total - facts.images.withAlt;
    score -= Math.min(40, missing * 4);
    pushIssue(issues, {
      title: "Immagini senza testo alternativo",
      description: `${missing} immagini su ${facts.images.total} non hanno l'attributo alt.`,
      whyItMatters: "Il testo alternativo permette a chi usa uno screen reader di capire il contenuto delle immagini, ed e' anche un segnale che i motori di ricerca usano per indicizzarle.",
      recommendation: "Aggiungi un testo alt descrittivo a ogni immagine significativa.",
      severity: "medium",
      category: "ux",
    });
  }

  if (!facts.langAttribute) {
    score -= 15;
    pushIssue(issues, {
      title: "Lingua della pagina non dichiarata",
      description: "Il tag <html> non ha l'attributo lang.",
      whyItMatters: "Senza questo attributo gli screen reader non sanno con quale pronuncia leggere la pagina.",
      recommendation: 'Aggiungi lang="it" (o la lingua corretta) al tag <html>.',
      severity: "low",
      category: "ux",
    });
  }

  return Math.max(0, Math.min(100, score));
}

// ---------- Mobile (parzialmente verificato: solo il viewport e' un
// dato certo dall'HTML; il resto richiederebbe un vero rendering
// browser, che questo MVP non esegue) ----------
function scoreMobile(facts: SeoFacts, issues: ScanIssue[]): { score: number; verified: boolean } {
  let score = 100;

  if (!facts.viewportPresent) {
    score -= 40;
    pushIssue(issues, {
      title: "Meta viewport assente",
      description: "Manca il tag <meta name=\"viewport\">.",
      whyItMatters: "Senza questo tag i browser mobile spesso mostrano il sito come una versione desktop rimpicciolita, difficile da leggere e usare.",
      recommendation: 'Aggiungi <meta name="viewport" content="width=device-width, initial-scale=1">.',
      severity: "high",
      category: "technical",
    });
  }

  return { score: Math.max(0, Math.min(100, score)), verified: false };
}

// ---------- Performance (senza una vera misura Core Web Vitals, si
// dichiara esplicitamente come stima non verificata) ----------
async function scorePerformance(
  url: string,
  crawl: CrawlResult,
  issues: ScanIssue[]
): Promise<{ score: number; verified: boolean; notes?: string }> {
  const pagespeed = await fetchPageSpeedScore(url);

  if (pagespeed) {
    if (pagespeed.score < 50) {
      pushIssue(issues, {
        title: "Performance reale sotto la soglia",
        description: `Google PageSpeed Insights assegna un punteggio performance di ${pagespeed.score}/100 (mobile).`,
        whyItMatters: "Un sito lento aumenta l'abbandono dei visitatori e puo' penalizzare il posizionamento su Google.",
        recommendation: "Ottimizza le immagini, riduci il JavaScript non necessario e valuta il caching delle risorse statiche.",
        severity: pagespeed.score < 30 ? "high" : "medium",
        category: "technical",
      });
    }

    const notesParts = ["Dati reali da Google PageSpeed Insights (mobile)."];
    if (pagespeed.lcpMs != null) notesParts.push(`LCP: ${(pagespeed.lcpMs / 1000).toFixed(1)}s`);
    if (pagespeed.clsScore != null) notesParts.push(`CLS: ${pagespeed.clsScore.toFixed(2)}`);
    if (pagespeed.inpMs != null) notesParts.push(`INP: ${Math.round(pagespeed.inpMs)}ms`);

    return { score: pagespeed.score, verified: true, notes: notesParts.join(" ") };
  }

  // Fallback: PAGESPEED_API_KEY assente o chiamata fallita. Euristica
  // grezza basata solo sulla dimensione dell'HTML scaricato: NON e' un
  // Core Web Vital reale. Va trattata come stima.
  const homeSize = crawl.pages[0]?.sizeBytes ?? 0;
  let score = 100;

  if (homeSize > 500_000) {
    score -= 30;
    pushIssue(issues, {
      title: "Pagina HTML molto pesante",
      description: `La homepage pesa circa ${Math.round(homeSize / 1024)} KB solo di HTML.`,
      whyItMatters: "Pagine piu' pesanti tendono a caricare piu' lentamente, soprattutto su connessioni mobili, aumentando il rischio di abbandono.",
      recommendation: "Valuta di ridurre markup superfluo, script inline e contenuti non necessari nella pagina principale.",
      severity: "medium",
      category: "technical",
    });
  } else if (homeSize > 250_000) {
    score -= 12;
  }

  return { score: Math.max(0, Math.min(100, score)), verified: false };
}

// ---------- Conversion: checklist specifica per tipo di attivita' ----------
const CONVERSION_SIGNALS: Record<
  BusinessType,
  { pattern: RegExp; label: string; weight: number }[]
> = {
  bnb: [
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 15 },
    { pattern: /wa\.me\/|api\.whatsapp\.com/i, label: "contatto WhatsApp", weight: 10 },
    { pattern: /prenota|booking|disponibilit/i, label: "prenotazione/disponibilita'", weight: 25 },
    { pattern: /check.?in/i, label: "informazioni check-in", weight: 10 },
    { pattern: /recension|review/i, label: "recensioni", weight: 15 },
    { pattern: /€|eur\b|prezzo|tariffe/i, label: "prezzi/tariffe", weight: 15 },
    { pattern: /@[\w.-]+\.\w+/, label: "email di contatto", weight: 10 },
  ],
  hotel: [
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 15 },
    { pattern: /prenota|booking|disponibilit/i, label: "prenotazione/disponibilita'", weight: 30 },
    { pattern: /camere|rooms/i, label: "informazioni sulle camere", weight: 15 },
    { pattern: /recension|review/i, label: "recensioni", weight: 15 },
    { pattern: /€|eur\b|prezzo|tariffe/i, label: "prezzi/tariffe", weight: 15 },
    { pattern: /@[\w.-]+\.\w+/, label: "email di contatto", weight: 10 },
  ],
  restaurant: [
    { pattern: /menu/i, label: "menu", weight: 25 },
    { pattern: /prenota|booking/i, label: "prenotazione tavolo", weight: 20 },
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 20 },
    { pattern: /orari|apertura/i, label: "orari di apertura", weight: 15 },
    { pattern: /via |piazza |corso |indirizzo/i, label: "indirizzo", weight: 10 },
    { pattern: /delivery|asporto|takeaway/i, label: "delivery/asporto", weight: 10 },
  ],
  shop: [
    { pattern: /carrello|cart|acquista|buy now/i, label: "carrello/acquisto", weight: 25 },
    { pattern: /€|eur\b|prezzo/i, label: "prezzi", weight: 20 },
    { pattern: /spedizion|shipping/i, label: "informazioni spedizione", weight: 15 },
    { pattern: /reso|rimborso|return policy/i, label: "politica resi", weight: 10 },
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 10 },
    { pattern: /@[\w.-]+\.\w+/, label: "email di contatto", weight: 10 },
    { pattern: /recension|review/i, label: "recensioni prodotto", weight: 10 },
  ],
  professional: [
    { pattern: /preventivo|richiedi informazioni|contattaci/i, label: "richiesta preventivo/contatto", weight: 25 },
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 20 },
    { pattern: /@[\w.-]+\.\w+/, label: "email di contatto", weight: 15 },
    { pattern: /servizi|services/i, label: "elenco servizi", weight: 15 },
    { pattern: /recension|testimonianz/i, label: "recensioni/testimonianze", weight: 15 },
    { pattern: /albo|iscrizion|certificaz/i, label: "credenziali professionali", weight: 10 },
  ],
  other: [
    { pattern: /\+?\d[\d\s\-().]{7,}\d/, label: "numero di telefono", weight: 25 },
    { pattern: /@[\w.-]+\.\w+/, label: "email di contatto", weight: 25 },
    { pattern: /contattaci|contact/i, label: "sezione contatti", weight: 25 },
    { pattern: /servizi|prodotti/i, label: "servizi/prodotti", weight: 25 },
  ],
};

function scoreConversion(
  crawl: CrawlResult,
  businessType: BusinessType,
  issues: ScanIssue[]
): number {
  const html = crawl.pages.map((p) => p.html).join("\n");
  const signals = CONVERSION_SIGNALS[businessType];
  let score = 0;

  for (const signal of signals) {
    if (signal.pattern.test(html)) {
      score += signal.weight;
    } else {
      pushIssue(issues, {
        title: `Elemento di conversione mancante: ${signal.label}`,
        description: `Non e' stato rilevato alcun riferimento a "${signal.label}" nelle pagine analizzate.`,
        whyItMatters: `Per questo tipo di attivita', ${signal.label} e' uno degli elementi che piu' aiuta un visitatore a compiere l'azione desiderata.`,
        recommendation: `Valuta di aggiungere in modo evidente ${signal.label} nella homepage o in una pagina facilmente raggiungibile.`,
        severity: signal.weight >= 20 ? "high" : signal.weight >= 12 ? "medium" : "low",
        category: "conversion",
      });
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function computeScoring(input: ScoringInput): Promise<ScoringOutput> {
  const { facts, crawl, businessType, url } = input;
  const issues: ScanIssue[] = [];
  const unverifiable: string[] = [];

  const seoScore = scoreSeo(facts, issues);
  const technicalScore = scoreTechnical(facts, issues);
  const accessibilityScore = scoreAccessibility(facts, issues);
  const mobile = scoreMobile(facts, issues);
  const performance = await scorePerformance(url, crawl, issues);
  const conversionScore = scoreConversion(crawl, businessType, issues);

  // Il content score reale viene assegnato altrove (content-analyzer,
  // via AI) quando disponibile; qui un fallback minimo se l'AI non e'
  // configurata, per non lasciare la categoria priva di punteggio.
  const contentFallback = facts.title && facts.metaDescription ? 55 : 35;

  if (!mobile.verified) {
    unverifiable.push(
      "Mobile: verificato solo tramite i tag HTML (viewport); non e' stato eseguito un rendering reale su dispositivo."
    );
  }
  if (!performance.verified) {
    unverifiable.push(
      "Performance: nessuna misura Core Web Vitals reale disponibile (PAGESPEED_API_KEY non configurata o richiesta non riuscita). Punteggio basato su una stima approssimativa della dimensione della pagina."
    );
  }

  const weights = getWeightsFor(businessType);

  const categoryScores: CategoryScore[] = [
    { category: "seo", score: seoScore, weight: weights.seo, verified: true },
    { category: "performance", score: performance.score, weight: weights.performance, verified: performance.verified, notes: performance.notes ?? "Stima, non una misura Core Web Vitals reale." },
    { category: "mobile", score: mobile.score, weight: weights.mobile, verified: mobile.verified, notes: "Basato solo sul tag viewport, non su un rendering reale." },
    { category: "content", score: contentFallback, weight: weights.content, verified: false, notes: "In attesa di analisi AI del contenuto." },
    { category: "conversion", score: conversionScore, weight: weights.conversion, verified: true },
    { category: "accessibility", score: accessibilityScore, weight: weights.accessibility, verified: true },
    { category: "technical", score: technicalScore, weight: weights.technical, verified: true },
  ];

  const overallScore = Math.round(
    categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  return { overallScore, categoryScores, issues, unverifiable };
}
