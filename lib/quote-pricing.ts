// Placeholder commercial defaults for auto-generated (cart-checkout) quotes —
// there's no real freight/insurance rate table anywhere in this codebase, so
// these are flat per-vehicle figures (matching the real sample quote's own
// numbers, e.g. the Toyota Sequoia Trailhunter Cotización: $120 inland /
// $180 export docs / $950 freight / $210 insurance for one unit) scaled by
// quantity, meant to get the customer an instant PDF. Staff correct the real
// numbers afterward in the admin quote editor — see the "Simple flat
// defaults, staff adjusts after" decision this was built against.
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

export function languageForCountry(country: string): "en" | "es" {
  return SPANISH_SPEAKING_COUNTRIES.has(country.trim().toLowerCase()) ? "es" : "en";
}
