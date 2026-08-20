import { CircleDollarSign, Target, TrendingUp, Trophy } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const quotes = await adminListQuotes();
  const won = quotes.filter((q) => q.status === "delivered" || q.status === "paid_full");
  const active = quotes.filter((q) => !["lost", "delivered"].includes(q.status));
  const wonValue = won.reduce((sum, q) => sum + q.cifTotal, 0);
  const pipeline = active.reduce((sum, q) => sum + q.cifTotal, 0);
  const conversion = quotes.length ? Math.round((won.length / quotes.length) * 100) : 0;
  const markets = Object.entries(quotes.reduce<Record<string, number>>((map, quote) => { map[quote.destinationCountry] = (map[quote.destinationCountry] ?? 0) + quote.cifTotal; return map; }, {})).sort((a,b) => b[1]-a[1]).slice(0,6);
  return <AdminShell>
    <div className={styles.pageHeading}><div><span className={styles.eyebrow}>Commercial overview</span><h1>Sales</h1><p>Live performance calculated from the quote and order pipeline.</p></div></div>
    <div className={styles.statGrid}>
      <div className={styles.statCard}><span className={styles.statIcon}><CircleDollarSign size={18}/></span><div><p className={styles.statLabel}>Won value</p><p className={styles.statValue}>${wonValue.toLocaleString()}</p></div></div>
      <div className={styles.statCard}><span className={styles.statIcon}><TrendingUp size={18}/></span><div><p className={styles.statLabel}>Open pipeline</p><p className={styles.statValue}>${pipeline.toLocaleString()}</p></div></div>
      <div className={styles.statCard}><span className={styles.statIcon}><Target size={18}/></span><div><p className={styles.statLabel}>Conversion</p><p className={styles.statValue}>{conversion}%</p></div></div>
    </div>
    <section className={styles.panel}><div className={styles.panelHeading}><Trophy size={17}/><div><h2>Top destination markets</h2><p>Pipeline value by client destination.</p></div></div>
      <div className={styles.marketBars}>{markets.map(([country,value]) => <div key={country}><span>{country}</span><div><i style={{width:`${markets[0]?.[1] ? Math.max(8,(value/markets[0][1])*100) : 0}%`}}/></div><b>${value.toLocaleString()}</b></div>)}</div>
    </section>
  </AdminShell>;
}
