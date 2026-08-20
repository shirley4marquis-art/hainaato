import Link from "next/link";
import { ExternalLink, FileCheck2, FileSignature, Plus } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await adminListQuotes();
  return <AdminShell>
    <div className={styles.pageHeading}><div><span className={styles.eyebrow}>Document centre</span><h1>Contracts</h1><p>The branded commercial document is the master record for every agreement.</p></div><Link className={styles.btn} href="/admin/quotes/new"><Plus size={15}/> New contract</Link></div>
    <section className={styles.contractHero}><span><FileSignature size={23}/></span><div><small>MASTER DOCUMENT</small><h2>HainaAuto commercial contract</h2><p>Customer, vehicle, pricing, payment, freight and delivery terms remain linked to the operational order record.</p></div><FileCheck2 size={34}/></section>
    <div className={styles.recordList}>{contracts.map((contract) => <article className={styles.contractRow} key={contract.ref}>
      <span className={styles.documentIcon}><FileSignature size={18}/></span><div><b>{contract.documentNumber ?? contract.ref}</b><h2>{contract.customerName}</h2><p>{contract.vehicleSummary} · {contract.destinationCountry}</p></div><span className={styles.statusPill}>{contract.status.replaceAll("_"," ")}</span><strong>{contract.currency} {contract.cifTotal.toLocaleString()}</strong><div className={styles.contractActions}><Link href={`/admin/quotes/${contract.ref}/print`} target="_blank">Open document <ExternalLink size={12}/></Link><Link href={`/admin/quotes/${contract.ref}`}>Edit</Link></div>
    </article>)}</div>
  </AdminShell>;
}
