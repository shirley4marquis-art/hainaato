"use client";
import { DEFAULT_CURRENCY, formatPrice } from "../lib/currency";

// Buyer-facing prices stay in USD regardless of browser language or locale.
export function Price({ cny }: { cny: number | null | undefined }) {
  return <>{formatPrice(cny, DEFAULT_CURRENCY)}</>;
}
