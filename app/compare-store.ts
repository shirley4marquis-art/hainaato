// Client-only localStorage list of vehicle slugs selected for comparison.
// No backend needed — the shortlist is per-browser, same as a cart.
// Exposed as a useSyncExternalStore hook so components stay in sync with
// localStorage (including same-tab writes from compare-button.tsx) without
// reaching for setState-in-an-effect.
import { useSyncExternalStore } from "react";
import { COMPARE_MAX } from "../lib/compare-constants";

export { COMPARE_MAX } from "../lib/compare-constants";

const KEY = "haina-compare-slugs";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSlugs: string[] = [];

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function readRaw(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
}

function getSnapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSlugs = parse(raw);
  }
  return cachedSlugs;
}

function getServerSnapshot(): string[] {
  return [];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function emitChange() {
  for (const listener of listeners) listener();
}

function write(slugs: string[]): string[] {
  window.localStorage.setItem(KEY, JSON.stringify(slugs));
  emitChange();
  return slugs;
}

export function useCompareSlugs(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getCompareSlugs(): string[] {
  return getSnapshot();
}

export function addToCompare(slug: string): string[] {
  const current = getSnapshot();
  if (current.includes(slug)) return current;
  return write([...current, slug].slice(-COMPARE_MAX));
}

export function removeFromCompare(slug: string): string[] {
  return write(getSnapshot().filter((s) => s !== slug));
}
