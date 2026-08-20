import Link from "next/link";
import { ArrowRight, Inbox, Plus } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import { STATUS_META, STATUS_ORDER, type QuoteStatus } from "../status";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const GROUPS = {
  all: { label: "All", statuses: STATUS_ORDER },
  quotes: { label: "Quotes", statuses: ["quoted", "negotiating"] },
  payment: { label: "Payment", statuses: ["deposit_paid", "paid_full", "usdt_payment_confirmed", "bitcoin_payment_confirmed"] },
  fulfilment: { label: "Fulfilment", statuses: ["inspection_scheduled", "inspection_passed", "export_docs_ready"] },
  shipping: { label: "Shipping", statuses: ["booked_for_shipping", "shipped", "departed_port", "arrived_port", "customs_clearance", "out_for_delivery"] },
  complete: { label: "Complete", statuses: ["delivered", "lost"] },
} as const;

type GroupKey = keyof typeof GROUPS;

export default async function AdminQuotesList({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const quotes = await adminListQuotes();
  const requested = (await searchParams).group;
  const activeGroup: GroupKey = requested && requested in GROUPS ? requested as GroupKey : "all";
  const allowed = new Set<string>(GROUPS[activeGroup].statuses);
  const filtered = quotes.filter((quote) => allowed.has(quote.status));

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div><span className={styles.eyebrow}>Order operations</span><h1>Track every order</h1><p>Move from quote to delivery with one live status record.</p></div>
        <Link className={styles.btn} href="/admin/quotes/new"><Plus size={15} /> New quote</Link>
      </div>

      <div className={styles.filterRow} aria-label="Order progress categories">
        {(Object.entries(GROUPS) as [GroupKey, typeof GROUPS[GroupKey]][]).map(([key, group]) => {
          const groupStatuses = new Set<string>(group.statuses);
          const count = quotes.filter((quote) => groupStatuses.has(quote.status)).length;
          return <Link key={key} href={key === "all" ? "/admin/quotes" : `/admin/quotes?group=${key}`} className={key === activeGroup ? styles.filterActive : undefined}>{group.label}<b>{count}</b></Link>;
        })}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}><Inbox size={28} /><p>No records in this stage.</p></div>
      ) : (
        <div className={styles.recordList}>
          {filtered.map((quote) => {
            const status = quote.status as QuoteStatus;
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const progressIndex = Math.max(0, STATUS_ORDER.indexOf(status));
            const progress = status === "lost" ? 0 : Math.round((progressIndex / (STATUS_ORDER.length - 2)) * 100);
            return (
              <Link className={styles.orderCard} href={`/admin/quotes/${quote.ref}`} key={quote.ref}>
                <div className={styles.orderMain}>
                  <span className={styles.orderRef}>{quote.documentNumber ?? quote.ref}</span>
                  <h2>{quote.customerName}</h2>
                  <p>{quote.vehicleSummary} · {quote.destinationCountry}</p>
                </div>
                <div className={styles.orderProgress}>
                  <span className={styles.statusPill} data-tone={meta.tone}><Icon size={11} /> {meta.label}</span>
                  <div><i style={{ width: `${progress}%` }} /></div>
                  <small>{status === "lost" ? "Closed" : `${progress}% progress`}</small>
                </div>
                <div className={styles.orderValue}><b>{quote.currency} {quote.cifTotal.toLocaleString()}</b><small>{new Date(quote.createdAt).toLocaleDateString()}</small></div>
                <ArrowRight className={styles.orderArrow} size={17} />
              </Link>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
