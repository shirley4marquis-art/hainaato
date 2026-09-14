import Link from "next/link";
import {AdminShell} from "../admin-shell";
import {getPool} from "../../../lib/crm";
import {searchVehicles} from "../../../lib/vehicles";
import styles from "../admin.module.css";
export const dynamic="force-dynamic";
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){const q=((await searchParams).q||"").trim().slice(0,150);let rows:{title:string;detail:string;href:string}[]=[];if(q.length>=2){const pattern=`%${q.replace(/[\\%_]/g,"\\$&")}%`;const {rows:found}=await getPool().query(`
 SELECT c.name AS title, COALESCE(c.email,c.phone,'Customer') AS detail, '/admin/clients/'||c.id AS href FROM customers c WHERE concat_ws(' ',c.name,c.email,c.phone) ILIKE $1
 UNION ALL SELECT COALESCE(q.document_number,q.ref),c.name,'/admin/quotes/'||q.ref FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE concat_ws(' ',q.ref,q.document_number,c.name,c.email,c.phone) ILIKE $1 OR EXISTS(SELECT 1 FROM quote_items i WHERE i.quote_id=q.id AND concat_ws(' ',i.make,i.model,i.vin) ILIKE $1)
 UNION ALL SELECT d.number,d.snapshot->'quote'->'customer'->>'name','/admin/documents/'||d.id FROM admin_documents d WHERE concat_ws(' ',d.number,d.quote_ref,d.type,d.snapshot->'quote'->'items') ILIKE $1
 UNION ALL SELECT o.title,o.status,'/admin/operations?kind='||o.kind||'&id='||o.id FROM admin_operations o WHERE concat_ws(' ',o.title,o.quote_ref,o.data::text) ILIKE $1
 LIMIT 60`,[pattern]);rows=found;const vehicles=searchVehicles({q,pageSize:10});rows.push(...vehicles.vehicles.map(v=>({title:v.title,detail:"Catalogue vehicle",href:`/vehicles/${v.slug}`})));}return <AdminShell><h1>Search operations</h1><form className={styles.searchBar}><input name="q" defaultValue={q} minLength={2} placeholder="Customer, email, phone, VIN, document or shipment" aria-label="Search all records"/><button>Search</button></form><p>{q.length<2?"Enter at least two characters.":`${rows.length} matching records`}</p><div className={styles.recordList}>{rows.map((r,i)=><Link className={styles.documentCard} key={`${r.href}:${i}`} href={r.href}><strong>{r.title}</strong><span>{r.detail}</span></Link>)}</div></AdminShell>;}
