"use client";
import { DEFAULT_CURRENCY, formatPrice } from "../lib/currency";

// Buyer-facing prices stay in USD regardless of browser language or locale.
export function Price({ cny, basis = "FOB" }: { cny: number | null | undefined; basis?: "FOB" | null }) {
  const value = formatPrice(cny, DEFAULT_CURRENCY);
  return <>{basis ? `${value} ${basis}` : value}</>;
}
