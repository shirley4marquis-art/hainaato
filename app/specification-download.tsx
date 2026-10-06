"use client";

import { useId, useState } from "react";
import { QuoteCopy } from "./quote-copy";

type DocumentLanguage = "en" | "es" | "zh" | "es-zh";
const LANGUAGES: { value: DocumentLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "zh", label: "中文" },
  { value: "es-zh", label: "Español + 中文" },
];

export function SpecificationDownload({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const id = useId();
  const [language, setLanguage] = useState<DocumentLanguage>("en");
  const href = `/api/vehicle-specification-pdf?slug=${encodeURIComponent(slug)}&language=${language}`;

  return (
    <div className={`specification-download${compact ? " compact" : ""}`}>
      <label htmlFor={id}><QuoteCopy en="PDF language" es="Idioma del PDF" /></label>
      <select id={id} value={language} onChange={event => setLanguage(event.target.value as DocumentLanguage)}>
        {LANGUAGES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <a className="btn ghost" href={href}>
        <QuoteCopy en={compact ? "Download PDF" : "Download specs PDF"} es={compact ? "Descargar PDF" : "Descargar ficha técnica"} />
      </a>
    </div>
  );
}
