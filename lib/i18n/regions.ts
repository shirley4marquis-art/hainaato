// Region -> language mapping for the site's automatic on-load translation.
//
// The site content is authored in English. proxy.ts resolves the visitor's
// country (Cloudflare / Vercel geo headers) and picks a target language here;
// app/auto-translate.tsx then drives the Google Translate widget to translate
// en -> that language before the visitor interacts (so e.g. a Venezuelan buyer
// sees Spanish through the whole checkout without touching anything).
//
// "en" means "leave the original" — no translation is applied.

// ISO 3166-1 alpha-2 country code -> Google Translate target language code.
const COUNTRY_LANGUAGE: Record<string, string> = {
  // Spanish — Latin America + Spain + Eq. Guinea
  VE: "es", CO: "es", MX: "es", AR: "es", PE: "es", CL: "es", EC: "es", BO: "es",
  PY: "es", UY: "es", GT: "es", HN: "es", SV: "es", NI: "es", CR: "es", PA: "es",
  DO: "es", CU: "es", PR: "es", ES: "es", GQ: "es",
  // Portuguese
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // French — France + Francophone Africa + others
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", CI: "fr", SN: "fr", CM: "fr", CD: "fr",
  CG: "fr", GA: "fr", BJ: "fr", BF: "fr", ML: "fr", NE: "fr", TG: "fr", GN: "fr",
  MG: "fr", HT: "fr",
  // Arabic — MENA
  SA: "ar", AE: "ar", EG: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", JO: "ar",
  IQ: "ar", LB: "ar", LY: "ar", SD: "ar", YE: "ar", MA: "ar", DZ: "ar", TN: "ar",
  MR: "ar", PS: "ar",
  // Russian — Russia + much of the CIS
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru", AM: "ru", AZ: "ru", MD: "ru",
  // Chinese (Traditional) — Greater China ex-mainland (mainland is geo-blocked)
  TW: "zh-TW", HK: "zh-TW", MO: "zh-TW",
  // Other single-country languages relevant to vehicle-import demand
  TR: "tr", VN: "vi", ID: "id", TH: "th", IR: "fa", PK: "ur", BD: "bn",
  DE: "de", AT: "de", CH: "de", IT: "it", NL: "nl", PL: "pl", UA: "uk", RO: "ro",
  GR: "el", JP: "ja", KR: "ko", ET: "am", KE: "sw", TZ: "sw", UG: "sw", NG: "en",
  ZA: "en", GH: "en", PH: "en", IN: "en",
};

// Every language the translate widget offers (source + all auto targets). Used
// for `includedLanguages` so a visitor can also switch manually if a picker is
// ever added.
export const AUTO_TRANSLATE_LANGUAGES = [
  "en", "es", "pt", "fr", "ar", "ru", "zh-CN", "zh-TW", "tr", "vi", "id", "th",
  "fa", "ur", "bn", "de", "it", "nl", "pl", "uk", "ro", "el", "ja", "ko", "am", "sw",
] as const;

const LANG_SET = new Set<string>(AUTO_TRANSLATE_LANGUAGES);

/** Target translation language for a visitor's country. "en" = no translation. */
export function autoTranslateLang(country: string | null | undefined): string {
  if (!country) return "en";
  return COUNTRY_LANGUAGE[country.trim().toUpperCase()] ?? "en";
}

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
