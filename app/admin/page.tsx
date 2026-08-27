import Link from "next/link";
import { Plus, FileText, Truck, Wallet, Inbox } from "lucide-react";
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
        <h1>Dashboard</h1>
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

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>By status</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
        <div className={styles.pageHeading} style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Recent orders</h2>
          <Link className={styles.btnGhost} href="/admin/quotes">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={28} />
            <p style={{ margin: 0 }}>No orders yet.</p>
          </div>
        ) : (
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
        )}
      </div>
    </AdminShell>
  );
}
