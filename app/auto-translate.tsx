"use client";

import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { AUTO_TRANSLATE_LANGUAGES, normalizeLangParam } from "../lib/i18n/regions";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: Record<string, unknown>, elementId: string) => void } };
    hainaAutoTranslateInit?: () => void;
  }
}

const LOCALE_COOKIE = "haina_locale";
const EXPLICIT_LOCALE_COOKIE = "haina_locale_explicit";
const INCLUDED_LANGUAGES = AUTO_TRANSLATE_LANGUAGES.join(",");

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge = 31_536_000) {
  const attrs = `path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${name}=${value};${attrs}`;
  // Google Translate also looks for the cookie on the registrable domain.
  document.cookie = `${name}=${value};domain=.${window.location.hostname};${attrs}`;
}

// `/en/<target>` is what Google Translate reads to auto-translate on load.
function applyTranslation(lang: string) {
  if (lang && lang !== "en") {
    writeCookie("googtrans", `/en/${lang}`);
    document.documentElement.lang = lang;
  } else {
    writeCookie("googtrans", "", 0);
    document.documentElement.lang = "en";
  }
}

export function AutoTranslate() {
  const searchParams = useSearchParams();
  const initialOverride = normalizeLangParam(searchParams.get("lang"));
  const [translationEnabled, setTranslationEnabled] = useState(
    initialOverride !== null && initialOverride !== "en",
  );

  useEffect(() => {
    const override = normalizeLangParam(searchParams.get("lang"));
    const current = readCookie(LOCALE_COOKIE);
    const hasExplicitLocale = readCookie(EXPLICIT_LOCALE_COOKIE) === "1";

    // Explicit ?lang= switch: persist it and reload once (without the param) so
    // the widget re-initialises against the new googtrans cookie.
    if (override) {
      writeCookie(LOCALE_COOKIE, override);
      writeCookie(EXPLICIT_LOCALE_COOKIE, "1");
      applyTranslation(override);
      startTransition(() => setTranslationEnabled(override !== "en"));
      const url = new URL(window.location.href);
      url.searchParams.delete("lang");
      window.location.replace(url.toString());
      return;
    }

    if (!hasExplicitLocale && current) writeCookie(LOCALE_COOKIE, "", 0);
    const active = hasExplicitLocale && current ? current : "en";
    applyTranslation(active);
    startTransition(() => setTranslationEnabled(active !== "en"));
  }, [searchParams]);

  useEffect(() => {
    window.hainaAutoTranslateInit = () => {
      if (!window.google?.translate || document.querySelector(".goog-te-combo")) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: INCLUDED_LANGUAGES, autoDisplay: false },
        "google_translate_element",
      );
    };
    return () => { delete window.hainaAutoTranslateInit; };
  }, []);

  return <>
    <div id="google_translate_element" className="auto-translate-element" aria-hidden="true" />
    {translationEnabled ? (
      <Script src="https://translate.google.com/translate_a/element.js?cb=hainaAutoTranslateInit" strategy="afterInteractive" />
    ) : null}
  </>;
}
