export type QuoteLanguage = "en" | "es";

export const QUOTE_LANGUAGE_OPTIONS: { value: QuoteLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

export function normalizeQuoteLanguage(value: unknown, fallback: QuoteLanguage = "en"): QuoteLanguage {
  return value === "es" || value === "en" ? value : fallback;
}
