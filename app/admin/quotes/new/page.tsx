import { AdminShell } from "../../admin-shell";
import { QuoteForm } from "../../quote-form";
import styles from "../../admin.module.css";

export default function NewQuote() {
  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>New quote</h1>
      </div>
      <QuoteForm initial={null} />
    </AdminShell>
  );
}
