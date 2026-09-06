import Link from "next/link";
import { Download, Eye, FileText, Search } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import { quoteStatusMeta } from "../status";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

type Params = { q?: string; lang?: string };

export default async function AdminDocumentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const lang = sp.lang === "en" || sp.lang === "es" ? sp.lang : "";

  const quotes = await adminListQuotes();
  const filtered = quotes.filter((doc) => {
    if (lang && doc.language !== lang) return false;
    if (!q) return true;
    return [doc.documentNumber, doc.ref, doc.customerName, doc.vehicleSummary, doc.destinationCountry, doc.destinationPort]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q));
  });

  const spanish = quotes.filter((doc) => doc.language === "es").length;

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Document centre</span>
          <h1>Documents</h1>
          <p>Generate, preview and download customer documents in English or Español.</p>
        </div>
        <Link className={styles.btn} href="/admin/quotes/new">
          New document
        </Link>
      </div>

      <div className={styles.opsGrid}>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <FileText size={15} />
            <span className={styles.opCardLabel}>Quotations</span>
          </span>
          <span className={styles.opCardValue}>{quotes.length.toLocaleString()}</span>
        </div>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <span className={styles.opCardLabel}>Spanish</span>
          </span>
          <span className={styles.opCardValue}>{spanish.toLocaleString()}</span>
        </div>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <span className={styles.opCardLabel}>English</span>
          </span>
          <span className={styles.opCardValue}>{(quotes.length - spanish).toLocaleString()}</span>
        </div>
      </div>

      <form className={styles.searchBar} action="/admin/documents" method="get">
        <Search size={16} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Customer, vehicle, VIN, document or quote number" aria-label="Search documents" />
        {lang ? <input type="hidden" name="lang" value={lang} /> : null}
        <button type="submit">Search</button>
      </form>

      <div className={styles.filterRow} aria-label="Language">
        <Link href={sp.q ? `/admin/documents?q=${encodeURIComponent(sp.q)}` : "/admin/documents"} className={!lang ? styles.filterActive : undefined}>
          All
        </Link>
        <Link
          href={`/admin/documents?lang=en${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
          className={lang === "en" ? styles.filterActive : undefined}
        >
          English
        </Link>
        <Link
          href={`/admin/documents?lang=es${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
          className={lang === "es" ? styles.filterActive : undefined}
        >
          Español
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={28} />
          <p style={{ margin: 0 }}>No documents match this search.</p>
        </div>
      ) : (
        <div className={styles.rowList}>
          {filtered.map((doc) => {
            const meta = quoteStatusMeta(doc.status);
            return (
              <div className={styles.dataRow} key={doc.ref}>
                <span className={styles.dataRowThumbIcon}>
                  <FileText size={20} />
                </span>
                <Link className={styles.dataRowMain} href={`/admin/quotes/${doc.ref}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <b>{doc.documentNumber ?? doc.ref}</b>
                  <p>
                    {doc.customerName} · {doc.vehicleSummary}
                  </p>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={styles.statusPill} data-tone={meta.tone}>
                      {meta.label}
                    </span>
                    <span className={styles.statusPill}>{doc.language === "es" ? "Español" : "English"}</span>
                  </span>
                </Link>
                <div className={styles.dataRowMeta}>
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <a
                      href={`/admin/quotes/${doc.ref}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.smallBtn}
                      aria-label="Preview document"
                    >
                      <Eye size={13} />
                    </a>
                    <a
                      href={`/api/admin/quotes/${encodeURIComponent(doc.ref)}/pdf`}
                      className={styles.smallBtn}
                      aria-label="Download PDF"
                    >
                      <Download size={13} />
                    </a>
                  </span>
                  <small>{new Date(doc.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
