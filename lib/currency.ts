// Static, approximate CNY-based conversion — not a live feed. There is no
// exchange-rate API wired into this project; these rates are a fixed
// snapshot and will drift from the real market over time. Revisit
// periodically (or wire up a real FX API) rather than treating this as
// authoritative. CNY remains the primary/source-of-truth currency: every
// stored price is CNY, and everything else is a display-only conversion.
export type CurrencyCode = "CNY" | "USD" | "EUR" | "GBP" | "AED" | "NGN";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "CNY", label: "CNY — Chinese Yuan", symbol: "¥" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "AED " },
  { code: "NGN", label: "NGN — Nigerian Naira", symbol: "₦" },
];

export const DEFAULT_CURRENCY: CurrencyCode = "CNY";

// Units of currency per 1 CNY. Snapshot rates, set 2026-08-13 — approximate.
const RATE_PER_CNY: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 0.139,
  EUR: 0.128,
  GBP: 0.11,
  AED: 0.511,
  NGN: 215,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in RATE_PER_CNY;
}

export function convertFromCNY(cny: number, currency: CurrencyCode): number {
  return cny * RATE_PER_CNY[currency];
}

// Non-CNY amounts are approximate conversions, so they're prefixed with "≈"
// rather than presented as an exact figure.
export function formatPrice(cny: number | null | undefined, currency: CurrencyCode): string {
  if (cny == null) return "Price on request";
  const symbol = CURRENCIES.find((c) => c.code === currency)!.symbol;
  const amount = Math.round(convertFromCNY(cny, currency));
  const prefix = currency === "CNY" ? "" : "≈";
  return `${prefix}${symbol}${amount.toLocaleString("en-US")}`;
}
