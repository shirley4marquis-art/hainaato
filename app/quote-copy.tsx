"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}

export function useSpanish() {
  return useSyncExternalStore(subscribe, () => document.documentElement.lang.startsWith("es"), () => false);
}

export function QuoteCopy({ en, es }: { en: string; es: string }) {
  const spanish = useSpanish();
  return <span translate={spanish ? "no" : undefined} lang={spanish ? "es" : undefined}>{spanish ? es : en}</span>;
}
