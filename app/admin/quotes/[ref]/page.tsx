import { notFound } from "next/navigation";
import { AdminShell } from "../../admin-shell";
import { QuoteForm } from "../../quote-form";
import { adminGetQuote } from "../../../../lib/crm";
import styles from "../../admin.module.css";

export default async function EditQuote({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) notFound();

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>{quote.documentNumber ?? quote.ref}</h1>
      </div>
      <QuoteForm initial={quote} />
    </AdminShell>
  );
}
