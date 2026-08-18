import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { AdminShell } from "../../admin-shell";
import { QuoteForm } from "../../quote-form";
import { EmailHistory } from "../../email-history";
import { adminGetQuote, listQuoteEmails } from "../../../../lib/crm";
import styles from "../../admin.module.css";

const SOURCE_LABELS: Record<string, string> = {
  "cart-checkout": "Website — cart checkout (automated)",
};

export default async function EditQuote({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [quote, emails] = await Promise.all([adminGetQuote(ref), listQuoteEmails(ref)]);
  if (!quote) notFound();

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>{quote.documentNumber ?? quote.ref}</h1>
        <a className={styles.btnGhost} href={`/api/admin/quotes/${encodeURIComponent(ref)}/pdf`}>
          <Download size={14} /> Download PDF
        </a>
      </div>
      {quote.source && SOURCE_LABELS[quote.source] && (
        <p style={{ margin: "-8px 0 16px", fontSize: 12, color: "#6b7684" }}>
          Source: {SOURCE_LABELS[quote.source]}
        </p>
      )}
      <QuoteForm initial={quote} />
      <EmailHistory quoteRef={ref} emails={emails} />
    </AdminShell>
  );
}
