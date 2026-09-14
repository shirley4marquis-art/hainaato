"use client";
import {useState,useRef} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {AdminQuoteDetail,AdminQuoteSummary} from "../../../lib/crm";
import {DOCUMENT_TYPES,makeSnapshot,type DocumentType,type Language,type Operation} from "../../../lib/documents/model";
import {DocumentPreview} from "./document-preview";
import {useDraft} from "../use-draft";
import styles from "../admin.module.css";
type Draft={ref:string;type:DocumentType;language:Language;enNotes:string;esNotes:string;enTerms:string;esTerms:string;requestId:string};
export function DocumentEditor({quotes,initialRef=""}:{quotes:AdminQuoteSummary[];initialRef?:string}){
 const router=useRouter();const lock=useRef(false);
 const [form,setForm]=useState<Draft>({ref:initialRef,type:"quote",language:"en",enNotes:"",esNotes:"",enTerms:"",esTerms:"",requestId:""});
 const [source,setSource]=useState<{quote:AdminQuoteDetail;operations:Operation[]}|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const draft=useDraft("document:new",form,(d)=>{if(d&&typeof d.ref==="string"&&Object.hasOwn(DOCUMENT_TYPES,d.type))setForm(d);});
 const notes=form.language==="es"?form.esNotes:form.enNotes;const paymentTerms=form.language==="es"?form.esTerms:form.enTerms;
 function change(p:Partial<Draft>){setForm(v=>({...v,...p,requestId:""}));}
 async function preview(){if(lock.current)return;lock.current=true;setBusy(true);setError("");try{const r=await fetch(`/api/admin/documents/source?ref=${encodeURIComponent(form.ref)}`);const d=await r.json();if(!r.ok)throw new Error(d.error);setSource(d);}catch(e){setError(e instanceof Error?e.message:"Could not load document. Retry.");}finally{lock.current=false;setBusy(false);}}
 async function generate(){if(lock.current||!source)return;lock.current=true;setBusy(true);setError("");const id=form.requestId||crypto.randomUUID();setForm(v=>({...v,requestId:id}));try{const r=await fetch("/api/admin/documents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,expectedUpdatedAt:source.quote.updatedAt,ref:form.ref,type:form.type,language:form.language,notes,paymentTerms})});const d=await r.json();if(!r.ok)throw new Error(d.error);await draft.clear();router.push(`/admin/documents/${d.id}`);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Generation failed. Retry.");}finally{lock.current=false;setBusy(false);}}
 const customerNames=[...new Set(quotes.map(q=>q.customerName))].sort();const [customer,setCustomer]=useState("");
 return <div className={styles.form}><p role="status" className={styles.draftStatus}>{draft.state}</p><section className={styles.section}><h2 className={styles.sectionTitle}>Prepare document</h2><div className={styles.grid}>
 <label>Customer filter<select value={customer} onChange={e=>{setCustomer(e.target.value);change({ref:""});setSource(null);}}><option value="">All customers</option>{customerNames.map(n=><option key={n}>{n}</option>)}</select></label>
 <label>Order / vehicle<select value={form.ref} onChange={e=>{change({ref:e.target.value});setSource(null);}}><option value="">Choose an order</option>{quotes.filter(q=>!customer||q.customerName===customer).map(q=><option value={q.ref} key={q.ref}>{q.customerName} · {q.documentNumber||q.ref} · {q.vehicleSummary}</option>)}</select></label>
 <label>Document type<select value={form.type} onChange={e=>change({type:e.target.value as DocumentType})}>{Object.entries(DOCUMENT_TYPES).map(([key,v])=><option key={key} value={key}>{v[form.language==="es"?1:0]}</option>)}</select></label>
 <label>Language<select value={form.language} onChange={e=>change({language:e.target.value as Language})}><option value="en">English</option><option value="es">Español</option></select></label>
 <label className={styles.wide}>{form.language==="es"?"Observaciones en español":"Document notes in English"}<textarea rows={3} value={notes} onChange={e=>change(form.language==="es"?{esNotes:e.target.value}:{enNotes:e.target.value})}/></label>
 <label className={styles.wide}>{form.language==="es"?"Condiciones de pago en español (opcional)":"Payment terms in English (optional)"}<textarea rows={2} value={paymentTerms} onChange={e=>change(form.language==="es"?{esTerms:e.target.value}:{enTerms:e.target.value})}/></label>
 </div><p className={styles.draftStatus}>Standard content switches immediately. Enter custom notes and terms in the selected language.</p><div className={styles.formActions}><button className={styles.btn} disabled={busy||!form.ref} onClick={preview}>{busy?"Loading…":"Preview"}</button>{form.ref&&<Link href={`/admin/quotes/${form.ref}`} className={styles.btnGhost}>Edit customer, vehicles & pricing</Link>}</div></section>
 {error&&<p className={styles.formError} role="alert">{error}</p>}
 {source&&source.quote.ref===form.ref&&<><div className={styles.formActions}><button className={styles.btn} disabled={busy} onClick={generate}>{busy?"Generating…":"Generate document"}</button></div><DocumentPreview snapshot={makeSnapshot(source.quote,form.type,form.language,source.operations,notes,paymentTerms)} number={form.language==="es"?"BORRADOR":"DRAFT"}/></>}
 </div>;
}
