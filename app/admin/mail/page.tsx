import { Mail, Send } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListCustomers, listClientEmails } from "../../../lib/crm";
import { MailComposer } from "./mail-composer";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminMailPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const [{ customer }, clients, emails] = await Promise.all([searchParams, adminListCustomers(), listClientEmails()]);
  const initialCustomerId = customer && /^\d+$/.test(customer) ? Number(customer) : undefined;
  return <AdminShell>
    <div className={styles.pageHeading}><div><span className={styles.eyebrow}>Resend mailing centre</span><h1>Client Mail</h1><p>Compose branded sales emails and review every delivery attempt.</p></div></div>
    <div className={styles.mailLayout}><MailComposer clients={clients} initialCustomerId={initialCustomerId}/><aside className={styles.mailGuide}><Mail size={20}/><h2>Ready-to-send design</h2><p>Every message includes the HainaAuto identity, sales signature, contact details and an optional action button.</p><div><span>Sender</span><b>sales@nindgeauto.com</b></div><div><span>Delivery</span><b>Resend</b></div><div><span>Reply inbox</span><b>Sales</b></div></aside></div>
    <section className={styles.mailHistory}><h2><Send size={15}/> Recent sent mail</h2>{emails.length === 0 ? <div className={styles.emptyState}><p>No custom client emails sent yet.</p></div> : <div className={styles.mailHistoryList}>{emails.map((email) => <article key={email.id}><div><b>{email.subject}</b><span>{email.customerName || email.toEmail} · {new Date(email.createdAt).toLocaleString()}</span></div><span className={styles.statusPill} data-tone={email.status === "sent" ? "green" : "red"}>{email.status}</span>{email.error && <small>{email.error}</small>}</article>)}</div>}</section>
  </AdminShell>;
}
