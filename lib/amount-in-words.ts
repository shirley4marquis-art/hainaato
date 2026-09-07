// Spelt-out money amounts for the "En letras / In words" line on the
// quotation ("siete mil seiscientos dólares…"). Covers 0–9,999,999, which is
// well beyond any realistic quote total.
import type { QuoteLanguage } from "./quote-language";

const ES_UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const ES_TEENS = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const ES_TENS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function esBelow1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ES_HUNDREDS[h]);
  if (rest) {
    if (rest < 10) parts.push(ES_UNITS[rest]);
    else if (rest < 20) parts.push(ES_TEENS[rest - 10]);
    else if (rest < 30) parts.push(rest === 20 ? "veinte" : `veinti${rest === 21 ? "uno" : rest === 22 ? "dós" : rest === 23 ? "trés" : rest === 26 ? "séis" : ES_UNITS[rest - 20]}`);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${ES_TENS[t]} y ${ES_UNITS[u]}` : ES_TENS[t]);
    }
  }
  return parts.join(" ");
}

function esInteger(n: number): string {
  if (n === 0) return "cero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${esBelow1000(millions)} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${esBelow1000(thousands)} mil`);
  if (rest) parts.push(esBelow1000(rest));
  return parts.join(" ").replace(/\buno mil\b/, "un mil").replace(/\bveintiuno mil\b/, "veintiún mil");
}

const EN_UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelow1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(`${EN_UNITS[h]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(EN_UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${EN_TENS[t]}-${EN_UNITS[u]}` : EN_TENS[t]);
    }
  }
  return parts.join(" ");
}

function enInteger(n: number): string {
  if (n === 0) return "zero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(`${enBelow1000(millions)} million`);
  if (thousands) parts.push(`${enBelow1000(thousands)} thousand`);
  if (rest) parts.push(enBelow1000(rest));
  return parts.join(" ");
}

const CURRENCY_WORDS: Record<string, { es: string; en: string }> = {
  USD: { es: "dólares de los Estados Unidos de América", en: "United States dollars" },
  EUR: { es: "euros", en: "euros" },
  CNY: { es: "yuanes chinos (renminbi)", en: "Chinese yuan (renminbi)" },
};

export function amountInWords(amount: number, currency: string, language: QuoteLanguage): string {
  const safe = Math.max(0, Math.round((amount + Number.EPSILON) * 100) / 100);
  const whole = Math.floor(safe);
  const cents = Math.round((safe - whole) * 100);
  const words = CURRENCY_WORDS[currency] ?? { es: currency, en: currency };
  if (language === "es") {
    const base = `${esInteger(whole)} ${words.es}`;
    return cents ? `${base} con ${cents}/100` : base;
  }
  const base = `${enInteger(whole)} ${words.en}`;
  const capped = base.charAt(0).toUpperCase() + base.slice(1);
  return cents ? `${capped} and ${cents}/100` : capped;
}
