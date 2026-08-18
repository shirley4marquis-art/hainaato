// Client-only localStorage cart of vehicle slugs, mirroring compare-store.ts.
// No backend needed until checkout — the cart is per-browser, then submitted
// as one combined quote request (see app/cart/page.tsx).
import { useSyncExternalStore } from "react";
import { CART_MAX } from "../lib/cart-constants";

export { CART_MAX } from "../lib/cart-constants";

const KEY = "haina-cart-slugs";

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

const EMPTY_SLUGS: string[] = [];

function getServerSnapshot(): string[] {
  // Must return a referentially-stable value — a fresh [] literal here
  // trips React's "getServerSnapshot should be cached" warning (and worse,
  // this store is read on every page via SiteShell's cart count, not just
  // one page like compare-store.ts's equivalent).
  return EMPTY_SLUGS;
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

export function useCartSlugs(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getCartSlugs(): string[] {
  return getSnapshot();
}

export function addToCart(slug: string): string[] {
  const current = getSnapshot();
  if (current.includes(slug)) return current;
  return write([...current, slug].slice(-CART_MAX));
}

export function removeFromCart(slug: string): string[] {
  return write(getSnapshot().filter((s) => s !== slug));
}

export function clearCart(): string[] {
  return write([]);
}
