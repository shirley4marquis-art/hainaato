"use client";

import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: Record<string, unknown>, elementId: string) => void } };
    hainaAutoTranslateInit?: () => void;
  }
}

function setTranslationCookie(value: string) {
  document.cookie = `googtrans=${value};path=/;max-age=31536000;SameSite=Lax`;
  document.cookie = `googtrans=${value};path=/;domain=.${window.location.hostname};max-age=31536000;SameSite=Lax`;
}

export function AutoTranslate() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const requested = searchParams.get("lang")?.toLowerCase();
    if (requested === "es" || requested === "es-ve") {
      document.cookie = "haina_locale=es-VE;path=/;max-age=31536000;SameSite=Lax";
      setTranslationCookie("/en/es");
    }
    if (document.cookie.includes("haina_locale=es-VE")) {
      document.documentElement.lang = "es-VE";
      setTranslationCookie("/en/es");
    }
  }, [searchParams]);

  useEffect(() => {
    window.hainaAutoTranslateInit = () => {
      if (!window.google?.translate || document.querySelector(".goog-te-combo")) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: "en,es", autoDisplay: false },
        "google_translate_element",
      );
    };
    return () => { delete window.hainaAutoTranslateInit; };
  }, []);

  return <>
    <div id="google_translate_element" className="auto-translate-element" aria-hidden="true" />
    <Script src="https://translate.google.com/translate_a/element.js?cb=hainaAutoTranslateInit" strategy="afterInteractive" />
  </>;
}
