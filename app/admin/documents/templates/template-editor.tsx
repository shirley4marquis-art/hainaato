"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { defaultField, FIELD_NAMES, type FieldMapping, type Template, type TemplateMapping } from "../../../../lib/documents/types";
import { PdfViewer } from "../pdf-viewer";
import styles from "../documents.module.css";

export function TemplateEditor({ id }: { id: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null), [mapping, setMapping] = useState<TemplateMapping | null>(null), [selected, setSelected] = useState("");
  const [page, setPage] = useState(1), [zoom, setZoom] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState(""), [prepared, setPrepared] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; field: FieldMapping; resize: boolean } | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch(`/api/admin/document-templates/${id}`, { signal: controller.signal }).then(r => r.json()).then(data => { if (!data.ok) throw new Error(data.error); setTemplate(data.template); setMapping(data.template.mapping); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }); return () => controller.abort(); }, [id]);
  if (!template || !mapping) return <div className={styles.root}><p role={error ? "alert" : "status"}>{error || "Loading template…"}</p></div>;
  const info = template.pages[page - 1], field = mapping.fields.find(f => f.id === selected);
  const change = (patch: Partial<FieldMapping>) => setMapping(m => m ? { ...m, reviewed: false, fields: m.fields.map(f => f.id === selected ? { ...f, ...patch } : f) } : m);
  function start(event: PointerEvent<HTMLButtonElement>, f: FieldMapping, resize = false) {
    event.preventDefault(); event.stopPropagation(); setSelected(f.id); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { x: event.clientX, y: event.clientY, field: f, resize };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current, bounds = stage.current?.getBoundingClientRect(); if (!drag || !bounds) return;
    const dx = (event.clientX - drag.x) / bounds.width * info.width, dy = (event.clientY - drag.y) / bounds.height * info.height;
    const f = drag.field;
    const patch = drag.resize ? { width: Math.max(10, Math.min(info.width - f.x, f.width + dx)), height: Math.max(10, Math.min(info.height - f.y, f.height + dy)) } : { x: Math.max(0, Math.min(info.width - f.width, f.x + dx)), y: Math.max(0, Math.min(info.height - f.height, f.y + dy)) };
    setMapping(m => m ? { ...m, reviewed: false, fields: m.fields.map(item => item.id === f.id ? { ...item, ...patch } : item) } : m);
  }
  async function save(activate: boolean) {
    setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/document-templates/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mapping, activate }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push(`/admin/documents/templates/${data.template.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save template."); setBusy(false); }
  }
  async function deactivate() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/document-templates/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deactivate" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setTemplate(t => t ? { ...t, active: false } : t);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to deactivate template."); }
    finally { setBusy(false); }
  }
  function numberControl(label: string, key: "x" | "y" | "width" | "height" | "fontSize" | "minFontSize" | "maxLines" | "lineHeight" | "characterSpacing", step = 1) { return field && <label>{label}<input type="number" value={Math.round(field[key] * 100) / 100} step={step} onChange={e => change({ [key]: Number(e.target.value) })} /></label>; }
  const overlay = <>
    {mapping.protectedRegions.filter(r => r.page === page).map((r, index) => <div key={index} className={styles.protected} style={{ left: `${r.x / info.width * 100}%`, top: `${r.y / info.height * 100}%`, width: `${r.width / info.width * 100}%`, height: `${r.height / info.height * 100}%` }}><span>🔒 {r.label}</span></div>)}
    {mapping.fields.filter(f => f.page === page).map(f => <button type="button" key={f.id} aria-label={`Move ${f.field}`} className={`${styles.field} ${selected === f.id ? styles.selected : ""}`} style={{ left: `${f.x / info.width * 100}%`, top: `${f.y / info.height * 100}%`, width: `${f.width / info.width * 100}%`, height: `${f.height / info.height * 100}%` }} onPointerDown={event => start(event, f)} onPointerMove={move} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} onClick={() => setSelected(f.id)}><span>{f.field.replaceAll("_", " ")}</span><span className={styles.resize} onPointerDown={event => start(event as unknown as PointerEvent<HTMLButtonElement>, f, true)}>↘</span></button>)}
  </>;
  return <div className={styles.root}><header className={styles.heading}><div><small>TEMPLATE MAPPING · VERSION {template.version}</small><h1>{template.name}</h1><p>Place fields in PDF points. Green areas protect signatures and stamps.</p></div><Link href="/admin/documents/templates">All templates</Link></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.toolbar}><label>Page<select value={page} onChange={e => setPage(Number(e.target.value))}>{template.pages.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><label>Zoom<select value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map(n => <option key={n} value={n}>{n * 100}%</option>)}</select></label><label className={styles.check}><input type="checkbox" checked={prepared} onChange={e => setPrepared(e.target.checked)} />Show saved prepared master</label><button type="button" disabled={mapping.lockedPages.includes(page)} onClick={() => { const f = defaultField(page); setMapping({ ...mapping, reviewed: false, fields: [...mapping.fields, f] }); setSelected(f.id); }}>Add dynamic field</button></div>
    <div className={styles.editorColumns}><PdfViewer url={`/api/admin/document-templates/${id}?file=${prepared ? "prepared" : "original"}`} page={page} zoom={zoom} stageRef={stage} overlay={overlay} /><aside className={styles.panel}>
      <h2>Field settings</h2><label>Mapped fields<select value={selected} onChange={e => { setSelected(e.target.value); const f = mapping.fields.find(item => item.id === e.target.value); if (f) setPage(f.page); }}><option value="">Select a field</option>{mapping.fields.map(f => <option value={f.id} key={f.id}>Page {f.page} · {f.field} · {f.id.slice(0, 4)}</option>)}</select></label>
      {field && <><label>Dynamic value<select value={field.field} onChange={e => change({ field: e.target.value, kind: e.target.value === "vehicles" ? "vehicles" : e.target.value === "vehicle_image" ? "image" : "text" })}>{FIELD_NAMES.map(f => <option value={f} key={f}>{f.replaceAll("_", " ")}</option>)}</select></label><div className={styles.formGrid}>{numberControl("X", "x", 0.25)}{numberControl("Y from top", "y", 0.25)}{numberControl("Width", "width", 0.25)}{numberControl("Height", "height", 0.25)}{numberControl("Font size", "fontSize", 0.25)}{numberControl("Minimum size", "minFontSize", 0.25)}</div>
      <label>Font<select value={field.font} onChange={e => change({ font: e.target.value as FieldMapping["font"] })}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label><div className={styles.formGrid}><label>Weight<select value={field.fontWeight} onChange={e => change({ fontWeight: e.target.value as FieldMapping["fontWeight"] })}><option>normal</option><option>bold</option></select></label><label>Alignment<select value={field.align} onChange={e => change({ align: e.target.value as FieldMapping["align"] })}><option>left</option><option>center</option><option>right</option></select></label></div>
      <label>Text color<input type="color" value={field.color} onChange={e => change({ color: e.target.value })} /></label>
      {([['wrap','Wrap text'],['autoShrink','Shrink to fit'],['required','Required value'],['replaceExisting','Remove old variable text in this area']] as const).map(([key,label]) => <label key={key} className={styles.check}><input type="checkbox" checked={Boolean(field[key])} onChange={e => change({ [key]: e.target.checked })} />{label}</label>)}
      <details><summary>Advanced text & continuation</summary><label className={styles.check}><input type="checkbox" checked={!!field.replaceImages} onChange={e => change({ replaceImages: e.target.checked })} />Remove old vehicle photos / VIN QR codes in this variable area</label>{numberControl("Line height", "lineHeight", 0.05)}{numberControl("Maximum lines", "maxLines")}{numberControl("Character spacing", "characterSpacing", 0.1)}<label>Vehicle index (starting at 1; blank uses default)<input type="number" min={1} max={100} value={field.itemIndex == null ? "" : field.itemIndex + 1} onChange={e => change({ itemIndex: e.target.value ? Number(e.target.value) - 1 : undefined })} /></label><label>Sentence with placeholders (optional)<textarea rows={5} value={field.text ?? ""} onChange={e => change({ text: e.target.value || undefined })} placeholder="Buyer: {{buyer_name}}" /></label>
      <label className={styles.check}><input type="checkbox" checked={!!field.overflow} onChange={e => change({ overflow: e.target.checked ? { page, x: 40, y: 80, width: info.width - 80, height: info.height - 160, insertBefore: template.pages.length } : undefined })} />Continue onto an unsigned template page</label>
      {field.overflow && <div className={styles.formGrid}>{(["page", "x", "y", "width", "height", "insertBefore"] as const).map(key => <label key={key}>{key}<input type="number" value={field.overflow![key]} onChange={e => change({ overflow: { ...field.overflow!, [key]: Number(e.target.value) } })} /></label>)}</div>}</details>
      <button type="button" onClick={() => { setMapping({ ...mapping, reviewed: false, fields: mapping.fields.filter(f => f.id !== selected) }); setSelected(""); }}>Remove field</button></>}
      <details><summary>Protect signatures & stamps</summary><label className={styles.check}><input type="checkbox" checked={mapping.lockedPages.includes(page)} onChange={e => setMapping({ ...mapping, reviewed: false, lockedPages: e.target.checked ? [...mapping.lockedPages, page] : mapping.lockedPages.filter(p => p !== page) })} />Lock entire page {page}</label>
      {mapping.protectedRegions.map((r, index) => <fieldset key={index}><legend>{r.label}</legend><label>Area name<input value={r.label} onChange={e => setMapping({ ...mapping, reviewed: false, protectedRegions: mapping.protectedRegions.map((p, i) => i === index ? { ...p, label: e.target.value } : p) })} /></label><div className={styles.formGrid}>{(["page", "x", "y", "width", "height"] as const).map(key => <label key={key}>{key}<input type="number" value={r[key]} onChange={e => setMapping({ ...mapping, reviewed: false, protectedRegions: mapping.protectedRegions.map((p, i) => i === index ? { ...p, [key]: Number(e.target.value) } : p) })} /></label>)}</div><button type="button" onClick={() => setMapping({ ...mapping, reviewed: false, protectedRegions: mapping.protectedRegions.filter((_, i) => i !== index) })}>Remove protection</button></fieldset>)}
      <button type="button" onClick={() => setMapping({ ...mapping, reviewed: false, protectedRegions: [...mapping.protectedRegions, { page, x: 40, y: Math.max(0, info.height - 220), width: 180, height: 140, label: "Signature / stamp" }] })}>Add protected area</button></details>
      <label className={styles.check}><input type="checkbox" checked={mapping.reviewed} onChange={e => setMapping({ ...mapping, reviewed: e.target.checked })} />I reviewed every page, mapped old client/transaction data, and protected the authorized signatures and stamps.</label>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void save(false)}>Save new version</button><button type="button" className={styles.button} disabled={busy || !mapping.reviewed} onClick={() => void save(true)}>{busy ? "Saving…" : "Save & set as default"}</button>{template.active && <button type="button" disabled={busy} onClick={() => void deactivate()}>Deactivate template</button>}</div>
    </aside></div>
  </div>;
}
