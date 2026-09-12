import {getPool} from "../../lib/crm";
import styles from "./admin.module.css";
const stages=["Inquiry","Quote","Contract","Deposit","Vehicle preparation","Export","Shipping","Arrival","Final payment","Customs / nationalization","Completed"];
export async function TransactionTimeline({quoteRef,status}:{quoteRef:string;status:string}){
 const {rows}=await getPool().query("SELECT action,actor,created_at FROM admin_activity WHERE quote_ref=$1 ORDER BY created_at DESC LIMIT 30",[quoteRef]);
 const current:Record<string,number>={quoted:1,negotiating:1,deposit_paid:4,inspection_scheduled:4,inspection_passed:5,export_docs_ready:5,booked_for_shipping:6,shipped:6,departed_port:6,arrived_port:7,customs_clearance:9,out_for_delivery:10,delivered:10,paid_full:4,usdt_payment_confirmed:4,bitcoin_payment_confirmed:4};const step=current[status]??0;
 return <section className={styles.section}><h2 className={styles.sectionTitle}>Transaction timeline</h2><ol className={styles.timeline}>{stages.map((label,i)=><li key={label} aria-current={i===step?"step":undefined} data-current={i===step}><span>{i+1}</span><div><b>{label}</b><small>{i===step?`Current: ${status.replace(/_/g," ")}`:i===step+1?"Next stage":""}</small></div></li>)}</ol><details><summary>Recorded activity & responsible admin</summary>{rows.map((r,i)=><p key={i}>{r.action} · {new Date(r.created_at).toLocaleString()} · {r.actor}</p>)}{!rows.length&&<p>No historical events recorded yet. Earlier stages are not assumed complete.</p>}</details></section>;
}
