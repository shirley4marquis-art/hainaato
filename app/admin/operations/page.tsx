import Link from "next/link";
import {AdminShell} from "../admin-shell";
import {listOperations} from "../../../lib/admin-store";
import {adminListQuotes} from "../../../lib/crm";
import {OperationEditor} from "./operation-editor";
import type {Operation} from "../../../lib/documents/model";
import styles from "../admin.module.css";
export const dynamic="force-dynamic";
const names={payment:"Payments",shipment:"Shipping",customs:"Customs",vehicle:"Managed vehicles"};
export default async function Operations({searchParams}:{searchParams:Promise<{kind?:string;new?:string;id?:string;ref?:string}>}){
 const sp=await searchParams;const kind=(Object.hasOwn(names,sp.kind||"")?sp.kind:"payment") as Operation["kind"];
 const [records,quotes]=await Promise.all([listOperations(kind,sp.ref),adminListQuotes()]);const initial=sp.id?records.find(r=>r.id===sp.id):undefined;
 return <AdminShell><div className={styles.pageHeading}><h1>{names[kind]}</h1><Link className={styles.btn} href={`/admin/operations?kind=${kind}&new=1${sp.ref?`&ref=${sp.ref}`:""}`}>Add record</Link></div><div className={styles.filterRow}>{Object.entries(names).map(([k,n])=><Link key={k} className={kind===k?styles.filterActive:undefined} href={`/admin/operations?kind=${k}`}>{n}</Link>)}</div>{(sp.new||initial)?<OperationEditor key={initial?.id||kind} kind={kind} initial={initial} initialRef={sp.ref} quotes={quotes}/>:<div className={styles.recordList}>{records.map(r=><article key={r.id} className={styles.documentCard}><Link href={`/admin/operations?kind=${kind}&id=${r.id}`}><strong>{r.title}</strong></Link><span>{r.status.replace(/_/g," ")}</span><span>{[r.data.amount,r.data.currency,r.data.tracking,r.data.reference].filter(Boolean).join(" · ")}</span>{r.quote_ref&&<Link href={`/admin/quotes/${r.quote_ref}`}>Order {r.quote_ref}</Link>}<small>{new Date(r.updated_at).toLocaleDateString()}</small></article>)}{!records.length&&<div className={styles.emptyState}><p>No records yet. Add the first {kind} record.</p></div>}</div>}</AdminShell>;
}
