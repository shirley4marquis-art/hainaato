"use client";
import { useState } from "react";
import { RefreshCw, Eye } from "lucide-react";
import styles from "./admin.module.css";
import type { QuoteEmailRecord } from "../../lib/crm";

export function EmailHistory({ quoteRef, emails }: { quoteRef: string; emails: QuoteEmailRecord[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteRef)}/resend`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Resend failed.");
      } else {
        setNotice("Quotation regenerated and re-sent.");
        location.reload();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.pageHeading} style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Quotation emails</h2>
        <button type="button" className={styles.btnGhost} onClick={resend} disabled={busy}>
          <RefreshCw size={13} /> {busy ? "Sending…" : "Regenerate & resend"}
        </button>
      </div>
      {error && <p className={styles.formError}>{error}</p>}
      {notice && <p className={styles.formSuccess}>{notice}</p>}
      {emails.length === 0 ? (
        <div className={styles.emptyState}>
          <p style={{ margin: 0 }}>No emails sent yet for this quote.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Sent</th><th>To</th><th>Subject</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <tr key={email.id}>
                <td>{new Date(email.createdAt).toLocaleString()}</td>
                <td>{email.toEmail}</td>
                <td>{email.subject}</td>
                <td>
                  <span className={styles.statusPill} data-tone={email.status === "sent" ? "green" : "red"}>
                    {email.status}
                  </span>
                  {email.status === "failed" && email.error && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{email.error}</div>
                  )}
                </td>
                <td>
                  <a
                    className={styles.smallBtn}
                    href={`/api/admin/quotes/${encodeURIComponent(quoteRef)}/emails/${email.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye size={12} /> View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
