"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DOCUMENT_TYPES, DOCUMENT_LANGUAGES, type Template } from "../../../../lib/documents/types";
import styles from "../documents.module.css";
export function TemplateManager() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch("/api/admin/document-templates", { signal: controller.signal }).then(r => r.json()).then(data => { if (data.ok) setTemplates(data.templates); else setError(data.error); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }); return () => controller.abort(); }, []);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try { const file = form.get("file"); if (file instanceof File && file.size > 4 * 1024 * 1024) throw new Error("Upload a PDF smaller than 4 MB."); const response = await fetch("/api/admin/document-templates", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push(`/admin/documents/templates/${data.template.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload PDF template."); setBusy(false); }
  }
  return <div className={styles.root}><header className={styles.heading}><div><small>MASTER LIBRARY</small><h1>Official templates</h1><p>Original artwork stays private and unchanged. Mapping changes create a new version.</p></div><Link href="/admin/documents" className={styles.button}>Generate document</Link></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <form className={styles.panel} onSubmit={upload}><h2>Upload a master PDF</h2><div className={styles.formGrid}><label>Template name<input name="name" required maxLength={160} /></label><label>Document type<select name="type">{Object.entries(DOCUMENT_TYPES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Language<select name="language">{Object.entries(DOCUMENT_LANGUAGES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Official PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label></div><p>Upload the original PDF exported from Word if the source is DOCX. PDF is used directly to preserve its design. Maximum 4 MB.</p><button disabled={busy} className={styles.button}>{busy ? "Validating PDF…" : "Upload & map fields"}</button></form>
    <section className={styles.panel}><h2>Template versions</h2><div className={styles.list}>{templates.map(t => <Link key={t.id} href={`/admin/documents/templates/${t.id}`}><strong>{t.name} · v{t.version}</strong><span>{DOCUMENT_TYPES[t.type]} · {DOCUMENT_LANGUAGES[t.language]} · {t.pages.length} pages</span><small>{t.active ? "Active" : "Inactive"}{t.isDefault ? " · default" : ""}{!t.mapping.reviewed ? " · mapping review needed" : ""}</small></Link>)}</div>{!templates.length && <p>No templates yet. Upload an official master to begin.</p>}</section>
  </div>;
}
