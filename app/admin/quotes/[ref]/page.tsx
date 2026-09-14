import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import Link from "next/link";
import { TransactionTimeline } from "../../transaction-timeline";
import { AdminShell } from "../../admin-shell";
import { QuoteForm } from "../../quote-form";
import { QuoteEmailCenter } from "../../quote-email-center";
import { adminGetQuote, listQuoteEmails } from "../../../../lib/crm";
import { buildQuoteEmailDrafts, defaultDraftTypeForStatus } from "../../../../lib/quote-email-drafts";
import { quoteStatusMeta } from "../../status";
import styles from "../../admin.module.css";

const SOURCE_LABELS: Record<string, string> = {
  "cart-checkout": "Website — cart checkout (automated)",
};

export default async function EditQuote({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [quote, emails] = await Promise.all([adminGetQuote(ref), listQuoteEmails(ref)]);
  if (!quote) notFound();
  const drafts = buildQuoteEmailDrafts(quote);
  const defaultDraftType = defaultDraftTypeForStatus(quote.status ?? "quoted");
  const statusMeta = quoteStatusMeta(quote.status ?? "quoted");

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>{quote.documentNumber ?? quote.ref}</h1>
        <Link className={styles.btnGhost} href={`/admin/documents?ref=${encodeURIComponent(ref)}`}>Generate official document</Link>
        <a className={styles.btnGhost} href={`/api/admin/quotes/${encodeURIComponent(ref)}/pdf`}>
          <Download size={14} /> Download PDF
        </a>
      </div>
      {quote.source && SOURCE_LABELS[quote.source] && (
        <p style={{ margin: "-8px 0 16px", fontSize: 12, color: "#6b7684" }}>
          Source: {SOURCE_LABELS[quote.source]}
        </p>
      )}
      <details className={styles.actionSheet}><summary>More actions</summary><div className={styles.formActions}>
        <Link href={`/admin/clients/${quote.customer.id}`}>Customer profile</Link>
        <Link href={`/admin/documents?ref=${ref}`}>Document history</Link>
        <Link href={`/admin/operations?kind=payment&new=1&ref=${ref}`}>Record payment</Link>
        <Link href={`/admin/operations?kind=shipment&new=1&ref=${ref}`}>Add shipment</Link>
        <Link href={`/admin/operations?kind=customs&new=1&ref=${ref}`}>Customs</Link>
      </div></details>
      <TransactionTimeline quoteRef={ref} status={quote.status || "quoted"}/>
      <QuoteForm initial={quote} />
      <QuoteEmailCenter
        quoteRef={ref}
        customerEmail={quote.customer.email ?? null}
        drafts={drafts}
        emails={emails}
        defaultDraftType={defaultDraftType}
        currentStatusLabel={statusMeta.label}
      />
    </AdminShell>
  );
}
