// Optional fallback figures for explicitly FOB quotes only. HAINA AUTO's
// normal website/admin quotations default to CIF, where the entered unit price
// already includes vehicle, international ocean freight and marine insurance.
import type { QuoteLanguage } from "./quote-language";

export const DEFAULT_RATES_PER_UNIT = {
  inlandTransportCost: 120,
  exportDocumentationCost: 180,
  freightCost: 950,
  insuranceCost: 210,
} as const;

export const DEFAULT_DEPOSIT_PCT = 40;

// Nudges the auto-quote's document language toward Spanish for the regions
// this business's Latin American buyers are concentrated in (matching the
// real sample quote, which was in Spanish for a Colombian buyer) — staff can
// always change it in the editor afterward.
const SPANISH_SPEAKING_COUNTRIES = new Set(
  [
    "mexico", "méxico", "colombia", "argentina", "chile", "peru", "perú", "venezuela",
    "ecuador", "guatemala", "cuba", "bolivia", "dominican republic", "república dominicana",
    "honduras", "paraguay", "el salvador", "nicaragua", "costa rica", "panama", "panamá",
    "uruguay", "puerto rico", "spain", "españa", "equatorial guinea",
  ].map((c) => c.toLowerCase())
);

export function languageForCountry(country: string): QuoteLanguage {
  return SPANISH_SPEAKING_COUNTRIES.has(country.trim().toLowerCase()) ? "es" : "en";
}
