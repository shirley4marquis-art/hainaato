import {AdminShell} from "../admin-shell";
import {COMPANY} from "../../../lib/documents/model";
import styles from "../admin.module.css";
export default function Settings(){return <AdminShell><h1>Company & document settings</h1><section className={styles.section}><h2>Company identity</h2><dl>{Object.entries(COMPANY).filter(([k])=>k!=="logo").map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section><section className={styles.section}><h2>Document defaults</h2><p>English / Español · A4 · ND document numbering</p><p>Currency and payment terms are selected per order. Generated documents preserve their original company and transaction details.</p></section></AdminShell>;}
