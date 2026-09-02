// Languages supported by the visitor-selected Google Translate integration.
// The app does not select a language from country or region data.
export const AUTO_TRANSLATE_LANGUAGES = [
  "en", "es", "pt", "fr", "ar", "ru", "zh-CN", "zh-TW", "tr", "vi", "id", "th",
  "fa", "ur", "bn", "de", "it", "nl", "pl", "uk", "ro", "el", "ja", "ko", "am", "sw",
] as const;

const LANG_SET = new Set<string>(AUTO_TRANSLATE_LANGUAGES);

/**
 * Normalises a `?lang=` override to a supported code, or null if unrecognised.
 * Accepts region-tagged values (`es-VE`, `pt-BR`) by falling back to the base
 * language; `zh` resolves to Simplified Chinese.
 */
export function normalizeLangParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === "zh") return "zh-CN";
  for (const lang of AUTO_TRANSLATE_LANGUAGES) {
    if (lang.toLowerCase() === v) return lang;
  }
  const base = v.split("-")[0];
  for (const lang of AUTO_TRANSLATE_LANGUAGES) {
    if (lang.toLowerCase().split("-")[0] === base) return lang;
  }
  return null;
}

export function isSupportedLang(value: string | null | undefined): boolean {
  return Boolean(value && LANG_SET.has(value));
}
