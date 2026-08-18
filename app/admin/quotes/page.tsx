import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import styles from "../admin.module.css";

export default async function AdminQuotesList() {
  const quotes = await adminListQuotes();

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>Quotes &amp; orders</h1>
        <Link className={styles.btn} href="/admin/quotes/new">
          <Plus size={14} /> New quote
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className={styles.emptyState}>No quotes yet. Website leads land here automatically, or start one manually.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Customer</th>
              <th>Vehicle(s)</th>
              <th>Destination</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.ref}>
                <td><Link href={`/admin/quotes/${q.ref}`}>{q.documentNumber ?? q.ref}</Link></td>
                <td>{q.customerName}</td>
                <td>{q.vehicleSummary}</td>
                <td>{q.destinationCountry}</td>
                <td>{q.currency} {q.cifTotal.toLocaleString()}</td>
                <td><span className={styles.statusPill}>{q.status.replace(/_/g, " ")}</span></td>
                <td>{new Date(q.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
