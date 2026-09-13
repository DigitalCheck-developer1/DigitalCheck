import type { BusinessGoal, BusinessType, CrawlResult, SeoFacts } from "@/types";

// Dati strutturati e minimi da inviare al modello (sezione 24 del
// brief): mai l'HTML grezzo dell'intero sito. Questo riduce costi e
// rende l'output piu' consistente.
export interface AiInputPayload {
  business_type: BusinessType;
  goal: BusinessGoal;
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string[];
  pages_analyzed: number;
  cta_signals: {
    phone_present: boolean;
    whatsapp_present: boolean;
    booking_present: boolean;
    email_present: boolean;
  };
  visible_text_excerpt: string; // testo visibile, troncato, non l'HTML
}

const MAX_TEXT_EXCERPT_CHARS = 6000;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAiInput(
  facts: SeoFacts,
  crawl: CrawlResult,
  businessType: BusinessType,
  goal: BusinessGoal
): AiInputPayload {
  const combinedText = crawl.pages
    .map((p) => stripHtmlToText(p.html))
    .join(" ")
    .slice(0, MAX_TEXT_EXCERPT_CHARS);

  return {
    business_type: businessType,
    goal,
    url: facts.url,
    title: facts.title,
    meta_description: facts.metaDescription,
    h1: facts.h1,
    pages_analyzed: crawl.pages.length,
    cta_signals: {
      phone_present: /\+?\d[\d\s\-().]{7,}\d/.test(combinedText),
      whatsapp_present: /wa\.me\/|whatsapp/i.test(combinedText),
      booking_present: /prenota|booking|disponibilit/i.test(combinedText),
      email_present: /@[\w.-]+\.\w+/.test(combinedText),
    },
    visible_text_excerpt: combinedText,
  };
}

export function buildSystemPrompt(): string {
  return [
    "Sei un analista che interpreta dati tecnici di siti web per proprietari di piccole attivita' (B&B, ristoranti, negozi, professionisti) senza competenze tecniche.",
    "Ricevi SOLO dati strutturati estratti automaticamente da un sito: non hai accesso al sito stesso, non puoi navigarlo, e non devi inventare informazioni che non ti vengono fornite.",
    "Se un dato non ti e' stato fornito, non affermarlo: dillo esplicitamente come non disponibile.",
    "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido conforme allo schema richiesto, senza testo introduttivo, senza markdown, senza backtick.",
    "Scrivi in italiano, in un linguaggio chiaro e pratico, orientato all'impatto per l'attivita' (non solo tecnico).",
  ].join(" ");
}

export function buildUserPrompt(payload: AiInputPayload): string {
  const schemaHint = `{
  "summary": string,
  "strengths": string[] (max 3-5),
  "issues": [{ "title": string, "category": "technical"|"ux"|"seo"|"content"|"conversion", "severity": "high"|"medium"|"low", "explanation": string, "recommendation": string }] (max 5),
  "priorities": string[] (ordinate per importanza),
  "conversion_analysis": string,
  "content_analysis": string
}`;

  return [
    `Dati strutturati del sito:\n${JSON.stringify(payload, null, 2)}`,
    `\nProduci un JSON conforme a questo schema:\n${schemaHint}`,
    `\nL'obiettivo dichiarato dal proprietario dell'attivita' e' "${payload.goal}": valuta in che misura il sito, sulla base dei soli dati forniti, sembra facilitare questo obiettivo.`,
  ].join("\n");
}
