import type { BusinessType, CategoryKey } from "@/types";

export type WeightTable = Record<CategoryKey, number>;

// Pesi di default (sezione 7 del brief). Devono sommare a 1.
export const DEFAULT_WEIGHTS: WeightTable = {
  seo: 0.2,
  performance: 0.15,
  mobile: 0.15,
  content: 0.15,
  conversion: 0.2,
  accessibility: 0.05,
  technical: 0.1,
};

// Per categoria di attivita' la conversione conta di piu' o di meno a
// seconda di quanto il sito stesso guida l'azione (es. per un B&B la
// prenotazione e' quasi tutto; per un negozio con e-commerce esterno
// pesa meno). Solo le categorie che si discostano dal default vanno
// elencate qui; le altre ereditano DEFAULT_WEIGHTS.
const OVERRIDES: Partial<Record<BusinessType, Partial<WeightTable>>> = {
  bnb: { conversion: 0.25, content: 0.18, seo: 0.17 },
  hotel: { conversion: 0.25, content: 0.18, seo: 0.17 },
  restaurant: { conversion: 0.22, mobile: 0.18, seo: 0.15 },
  professional: { conversion: 0.22, content: 0.2, seo: 0.18 },
  shop: { conversion: 0.25, performance: 0.18, mobile: 0.17 },
};

export function getWeightsFor(businessType: BusinessType): WeightTable {
  const override = OVERRIDES[businessType];
  if (!override) return DEFAULT_WEIGHTS;

  const merged: WeightTable = { ...DEFAULT_WEIGHTS, ...override };
  const total = Object.values(merged).reduce((sum, w) => sum + w, 0);
  // Rinormalizza cosi' la somma resta 1 anche dopo l'override.
  const normalized = Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, value / total])
  ) as WeightTable;
  return normalized;
}

export function scoreLabel(score: number): string {
  if (score < 40) return "Critico";
  if (score < 60) return "Da migliorare";
  if (score < 75) return "Buono";
  if (score < 90) return "Molto buono";
  return "Eccellente";
}
