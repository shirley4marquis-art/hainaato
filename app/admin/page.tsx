import Link from "next/link";
import { ArrowRight, DatabaseZap, FileText, Inbox, Plus, Truck, Users, Wallet } from "lucide-react";
import { AdminShell } from "./admin-shell";
import { adminListQuotes } from "../../lib/crm";
import { ACTIVE_ORDER_STATUSES, STATUS_META, STATUS_ORDER, quoteStatusMeta } from "./status";
import styles from "./admin.module.css";

// See the identical note in app/admin/quotes/page.tsx — without this, this
// page gets statically cached (no cookies()/headers() call of its own to
// signal otherwise) and silently stops reflecting new quotes after the
// first render.
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const quotes = await adminListQuotes();

  const counts = new Map<string, number>();
  for (const q of quotes) counts.set(q.status, (counts.get(q.status) ?? 0) + 1);
  const openQuotes = quotes.filter((q) => q.status === "quoted" || q.status === "negotiating").length;
  const activeOrders = quotes.filter((q) => ACTIVE_ORDER_STATUSES.has(q.status)).length;
  const pipelineValue = quotes
    .filter((q) => q.status !== "lost" && q.status !== "delivered")
    .reduce((sum, q) => sum + q.cifTotal, 0);
  const recent = quotes.slice(0, 8);

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Operations center</span>
          <h1>Good to see you</h1>
          <p>Keep quotes, orders, clients, and inventory moving from one place.</p>
        </div>
        <Link className={styles.btn} href="/admin/quotes/new">
          <Plus size={14} /> New quote
        </Link>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <FileText size={18} />
          </span>
          <div>
            <p className={styles.statLabel}>Open quotes</p>
            <p className={styles.statValue}>{openQuotes}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <Truck size={18} />
          </span>
          <div>
            <p className={styles.statLabel}>Active orders</p>
            <p className={styles.statValue}>{activeOrders}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>
            <Wallet size={18} />
          </span>
          <div>
            <p className={styles.statLabel}>Open pipeline value</p>
            <p className={styles.statValue}>${pipelineValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <section className={styles.quickActions} aria-label="Quick actions">
        <Link href="/admin/quotes/new">
          <span className={`${styles.quickActionIcon} ${styles.statIconBlue}`}><FileText size={17} /></span>
          <span><b>Create a quote</b><small>Start a new customer proposal</small></span>
          <ArrowRight size={16} />
        </Link>
        <Link href="/admin/quotes">
          <span className={`${styles.quickActionIcon} ${styles.statIconGreen}`}><Truck size={17} /></span>
          <span><b>Manage orders</b><small>{activeOrders} active order{activeOrders === 1 ? "" : "s"} in progress</small></span>
          <ArrowRight size={16} />
        </Link>
        <Link href="/admin/clients">
          <span className={`${styles.quickActionIcon} ${styles.statIconAmber}`}><Users size={17} /></span>
          <span><b>Review clients</b><small>Open your customer records</small></span>
          <ArrowRight size={16} />
        </Link>
        <Link href="/admin/imports">
          <span className={styles.quickActionIcon}><DatabaseZap size={17} /></span>
          <span><b>Review imports</b><small>Approve inventory candidates</small></span>
          <ArrowRight size={16} />
        </Link>
      </section>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Pipeline by status</h2>
        <div className={styles.statusSummary}>
          {STATUS_ORDER.map((key) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            return (
              <span className={styles.statusPill} data-tone={meta.tone} key={key}>
                <Icon size={11} /> {meta.label}: {counts.get(key) ?? 0}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>Latest activity</span><h2>Recent orders</h2></div>
          <Link className={styles.btnGhost} href="/admin/quotes">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={28} />
            <p style={{ margin: 0 }}>No orders yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Vehicle(s)</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {recent.map((q) => {
                const meta = quoteStatusMeta(q.status);
                const Icon = meta.icon;
                return (
                  <tr key={q.ref}>
                    <td><Link href={`/admin/quotes/${q.ref}`}>{q.documentNumber ?? q.ref}</Link></td>
                    <td>{q.customerName}</td>
                    <td>{q.vehicleSummary}</td>
                    <td>
                      <span className={styles.statusPill} data-tone={meta.tone}>
                        <Icon size={11} /> {meta.label}
                      </span>
                    </td>
                    <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
