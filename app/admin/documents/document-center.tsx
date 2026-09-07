"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DOCUMENT_LANGUAGES, DOCUMENT_TYPES, type DocumentLanguage, type DocumentType, type GeneratedDocument, type Template } from "../../../lib/documents/types";
import { PdfViewer } from "./pdf-viewer";
import styles from "./documents.module.css";

type Order = { ref: string; customerName: string; documentNumber: string | null; vehicleSummary: string };
export function DocumentCenter({ initialRef = "", initialType = "quotation" }: { initialRef?: string; initialType?: string }) {
  const [templates, setTemplates] = useState<Template[]>([]), [orders, setOrders] = useState<Order[]>([]), [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [type, setType] = useState<DocumentType>(Object.hasOwn(DOCUMENT_TYPES, initialType) ? initialType as DocumentType : "quotation"), [language, setLanguage] = useState<DocumentLanguage>("es"), [templateId, setTemplateId] = useState(""), [quoteRef, setQuoteRef] = useState(initialRef);
  const [vins, setVins] = useState<Record<string, string>>({}), [items, setItems] = useState<{ id: number; make: string; model: string }[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [preview, setPreview] = useState<GeneratedDocument | null>(null), [page, setPage] = useState(1), [pageCount, setPageCount] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const generating = useRef(false), requestIdentity = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetch("/api/admin/document-templates", { signal: controller.signal }), fetch("/api/admin/quotes", { signal: controller.signal }), fetch("/api/admin/documents", { signal: controller.signal })].map(async promise => { const response = await promise; const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })).then(([t, q, d]) => { setTemplates(t.templates); setOrders(q.quotes); setDocuments(d.documents); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (quoteRef) fetch(`/api/admin/quotes/${encodeURIComponent(quoteRef)}`, { signal: controller.signal }).then(r => r.json()).then(data => { if (data.ok) setItems(data.quote.items); else setError(data.error); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [quoteRef]);
  const available = templates.filter(t => t.active && t.mapping.reviewed && t.type === type && t.language === language);
  const selected = available.find(t => t.id === templateId) ?? available.find(t => t.isDefault) ?? available[0];
  async function generate(event: React.FormEvent) {
    event.preventDefault(); if (generating.current) return; generating.current = true; setBusy(true); setError("");
    try {
      const payload = { quoteRef, templateId: selected?.id, type, language, overrides, vins }, fingerprint = JSON.stringify(payload);
      if (requestIdentity.current?.fingerprint !== fingerprint) requestIdentity.current = { fingerprint, key: crypto.randomUUID() };
      const response = await fetch("/api/admin/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: requestIdentity.current.key }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setPreview(data.document); setDocuments(previous => [data.document, ...previous]); setPage(1);
      requestIdentity.current = null;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to generate document. Please retry."); }
    finally { generating.current = false; setBusy(false); }
  }
  async function download(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault(); if (!preview || downloading) return;
    setDownloading(true); setError("");
    try {
      const response = await fetch(`/api/admin/documents/${preview.id}?download=1`);
      if (!response.ok) { const failure = await response.json(); throw new Error(failure.error || "Unable to download PDF."); }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = preview.filename; document.body.append(link); link.click(); link.remove();
      // Safari may begin reading after the click handler has returned.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download PDF. Please retry."); }
    finally { setDownloading(false); }
  }
  return <div className={styles.root}>
    <header className={styles.heading}><div><small>OFFICIAL COMPANY DOCUMENTS</small><h1>Documents</h1><p>Generate from your approved master templates.</p></div><Link className={styles.button} href="/admin/documents/templates">Manage templates</Link></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.columns}><form className={styles.panel} onSubmit={generate}>
      <h2>Generate a document</h2>
      <label>Document type<select value={type} onChange={e => { setType(e.target.value as DocumentType); setTemplateId(""); }}>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Language<select value={language} onChange={e => { setLanguage(e.target.value as DocumentLanguage); setTemplateId(""); }}>{Object.entries(DOCUMENT_LANGUAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Official template<select value={selected?.id ?? ""} onChange={e => setTemplateId(e.target.value)} required><option value="">Select a template</option>{available.map(t => <option key={t.id} value={t.id}>{t.name} · v{t.version}{t.isDefault ? " · default" : ""}</option>)}</select></label>
      {!available.length && <p>No active template for this document and language. <Link href="/admin/documents/templates">Upload or activate one.</Link></p>}
      <label>Client / order<select value={quoteRef} onChange={e => { setQuoteRef(e.target.value); setItems([]); setVins({}); }} required><option value="">Select a client’s order</option>{orders.map(q => <option key={q.ref} value={q.ref}>{q.customerName} · {q.documentNumber ?? q.ref} · {q.vehicleSummary}</option>)}</select></label>
      {items.length > 0 && <fieldset><legend>Selected vehicles</legend>{items.map((item, i) => <label key={item.id}>{i + 1}. {item.make} {item.model} — VIN<input value={vins[item.id] ?? ""} onChange={e => setVins(previous => ({ ...previous, [item.id]: e.target.value.toUpperCase() }))} maxLength={17} minLength={17} pattern="[A-HJ-NPR-Z0-9]{17}" required={selected?.mapping.requiredFields.includes("vin")} title="VIN must contain 17 letters and digits, excluding I, O and Q" placeholder="VIN, if assigned" /></label>)}</fieldset>}
      <label>Payment method<input required={selected?.mapping.requiredFields.includes("payment_method")} value={overrides.payment_method ?? ""} onChange={e => setOverrides(previous => ({ ...previous, payment_method: e.target.value }))} placeholder="Use the approved payment method" /></label>
      <label>Payment terms<textarea required={type === "contract"} value={overrides.payment_terms ?? ""} onChange={e => setOverrides(previous => ({ ...previous, payment_terms: e.target.value }))} placeholder="Contract payment schedule and conditions" rows={3} /></label>
      <details><summary>Additional document information</summary>{["buyer_company", "sales_manager", "contract_terms", "inspection_notes", "export_documents", "notes"].map(key => <label key={key}>{key.replaceAll("_", " ")}<textarea value={overrides[key] ?? ""} onChange={e => setOverrides(previous => ({ ...previous, [key]: e.target.value }))} rows={3} /></label>)}</details>
      <button className={styles.button} disabled={busy || !selected || !quoteRef}>{busy ? "Generating PDF…" : "Generate & preview"}</button>
      <p className={styles.help}>Prices and buyer details come from the order. Each generated PDF is saved with its template version.</p>
    </form><section className={styles.panel}>
      <div className={styles.toolbar}><h2>{preview ? preview.number : "PDF preview"}</h2>{preview && <a className={styles.button} href={`/api/admin/documents/${preview.id}?download=1`} download={preview.filename} onClick={download} aria-disabled={downloading}>{downloading ? "Downloading…" : "Download PDF"}</a>}</div>
      {preview ? <><div className={styles.toolbar}><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div><PdfViewer url={`/api/admin/documents/${preview.id}`} page={page} onPages={setPageCount} /></> : <p className={styles.empty}>Your generated PDF will appear here. Preview and download use the same saved file.</p>}
    </section></div>
    <section className={styles.panel}><h2>Generated documents</h2><div className={styles.list}>{documents.map(doc => <button key={doc.id} type="button" onClick={() => { setPreview(doc); setPage(1); }}><strong>{doc.number}</strong><span>{DOCUMENT_TYPES[doc.type]} · {doc.language.toUpperCase()} · {doc.quoteRef}</span><small>{new Date(doc.createdAt).toLocaleString()}</small></button>)}</div></section>
  </div>;
}
