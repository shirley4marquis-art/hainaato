"use client";
import { formatPrice } from "../lib/currency";
import { useCurrency } from "./currency-store";

// Renders a CNY amount converted into whichever currency the visitor picked
// from the header selector (defaults to CNY). Use this instead of
// lib/format.ts's formatCNY anywhere the price is user-visible.
export function Price({ cny }: { cny: number | null | undefined }) {
  const currency = useCurrency();
  return <>{formatPrice(cny, currency)}</>;
}
