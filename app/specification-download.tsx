"use client";

import { useId, useState } from "react";
import { QuoteCopy } from "./quote-copy";
import { SPECIFICATION_LANGUAGES, type SpecificationLanguage } from "../lib/documents/types";

export function SpecificationDownload({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const id = useId();
  const [language, setLanguage] = useState<SpecificationLanguage>("en");
  const href = `/api/vehicle-specification-pdf?slug=${encodeURIComponent(slug)}&language=${language}`;

  return (
    <div className={`specification-download${compact ? " compact" : ""}`}>
      <label htmlFor={id}><QuoteCopy en="PDF language" es="Idioma del PDF" /></label>
      <select id={id} value={language} onChange={event => setLanguage(event.target.value as SpecificationLanguage)}>
        {Object.entries(SPECIFICATION_LANGUAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <a className="btn ghost" href={href}>
        <QuoteCopy en={compact ? "Download PDF" : "Download specs PDF"} es={compact ? "Descargar PDF" : "Descargar ficha técnica"} />
      </a>
    </div>
  );
}
