// Client-only, localStorage-persisted currency selection. CNY is always the
// stored/source-of-truth price; this only controls how it's displayed.
import { useSyncExternalStore } from "react";
import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "../lib/currency";

const KEY = "haina-currency";
const listeners = new Set<() => void>();

function readRaw(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
}

function getSnapshot(): CurrencyCode {
  const raw = readRaw();
  return raw && isCurrencyCode(raw) ? raw : DEFAULT_CURRENCY;
}

function getServerSnapshot(): CurrencyCode {
  return DEFAULT_CURRENCY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setCurrency(currency: CurrencyCode): void {
  window.localStorage.setItem(KEY, currency);
  for (const listener of listeners) listener();
}

export function useCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
