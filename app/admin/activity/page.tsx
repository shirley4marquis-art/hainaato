import Link from "next/link";
import {AdminShell} from "../admin-shell";
import {getPool} from "../../../lib/crm";
import styles from "../admin.module.css";
export const dynamic="force-dynamic";
export default async function Activity(){const {rows}=await getPool().query("SELECT * FROM admin_activity ORDER BY created_at DESC LIMIT 200");return <AdminShell><h1>Activity logs</h1><Link href="/admin/security">Security events</Link><div className={styles.recordList}>{rows.map(r=><article key={r.id} className={styles.documentCard}><b>{r.action}</b><span>{r.reference}</span><small>{new Date(r.created_at).toLocaleString()} · {r.actor}</small>{r.quote_ref&&<Link href={`/admin/quotes/${r.quote_ref}`}>Open order</Link>}</article>)}{!rows.length&&<p>No operational activity recorded yet.</p>}</div></AdminShell>;}
