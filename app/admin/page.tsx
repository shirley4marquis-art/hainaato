import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "./admin-shell";
import { adminListQuotes } from "../../lib/crm";
import styles from "./admin.module.css";

const STATUS_LABELS: Record<string, string> = {
  quoted: "Quoted",
  negotiating: "Negotiating",
  deposit_paid: "Deposit paid",
  paid_full: "Paid in full",
  shipped: "Shipped",
  delivered: "Delivered",
  lost: "Lost",
};

// "Orders" = quotes that have moved past the negotiation stage — same table,
// just a later slice of the same status lifecycle (see supabase/crm-schema.sql).
const ORDER_STATUSES = new Set(["deposit_paid", "paid_full", "shipped", "delivered"]);

export default async function AdminDashboard() {
  const quotes = await adminListQuotes();

  const counts = new Map<string, number>();
  for (const q of quotes) counts.set(q.status, (counts.get(q.status) ?? 0) + 1);
  const openQuotes = quotes.filter((q) => q.status === "quoted" || q.status === "negotiating").length;
  const activeOrders = quotes.filter((q) => ORDER_STATUSES.has(q.status)).length;
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

      <div className={styles.grid} style={{ marginBottom: 26 }}>
        <div className={styles.itemCard}>
          <b style={{ fontSize: 11, color: "#6b7684" }}>OPEN QUOTES</b>
          <p style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>{openQuotes}</p>
        </div>
        <div className={styles.itemCard}>
          <b style={{ fontSize: 11, color: "#6b7684" }}>ACTIVE ORDERS</b>
          <p style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>{activeOrders}</p>
        </div>
        <div className={styles.itemCard}>
          <b style={{ fontSize: 11, color: "#6b7684" }}>OPEN PIPELINE VALUE</b>
          <p style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>${pipelineValue.toLocaleString()}</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>By status</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <span className={styles.statusPill} key={key}>
              {label}: {counts.get(key) ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.pageHeading} style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Recent quotes</h2>
          <Link className={styles.btnGhost} href="/admin/quotes">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>No quotes yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Vehicle(s)</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {recent.map((q) => (
                <tr key={q.ref}>
                  <td><Link href={`/admin/quotes/${q.ref}`}>{q.documentNumber ?? q.ref}</Link></td>
                  <td>{q.customerName}</td>
                  <td>{q.vehicleSummary}</td>
                  <td><span className={styles.statusPill}>{q.status.replace(/_/g, " ")}</span></td>
                  <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
