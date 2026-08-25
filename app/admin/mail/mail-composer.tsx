"use client";
import { FormEvent, useMemo, useState } from "react";
import { Eye, Send } from "lucide-react";
import type { AdminCustomerSummary } from "../../../lib/crm";
import styles from "../admin.module.css";

export function MailComposer({ clients, initialCustomerId }: { clients: AdminCustomerSummary[]; initialCustomerId?: number }) {
  const initial = clients.find((client) => client.id === initialCustomerId && client.email) ?? null;
  const [customerId, setCustomerId] = useState(initial?.id ? String(initial.id) : "");
  const [to, setTo] = useState(initial?.email ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => clients.find((client) => String(client.id) === customerId), [clients, customerId]);

  function selectClient(value: string) {
    setCustomerId(value);
    const client = clients.find((item) => String(item.id) === value);
    if (client) { setTo(client.email ?? ""); setName(client.name); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/admin/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: selected?.id ?? null, customerName: name, to, subject, heading, message, callToActionLabel: ctaLabel, callToActionUrl: ctaUrl }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) setError(data?.error || "Email could not be sent.");
      else { setNotice(`Email sent to ${to} from HAINA AUTO | 海纳百川国际汽贸.`); setSubject(""); setHeading(""); setMessage(""); setCtaLabel(""); setCtaUrl(""); }
    } catch { setError("Network error — please try again."); }
    finally { setBusy(false); }
  }

  return <form className={styles.mailComposer} onSubmit={submit}>
    <div className={styles.mailComposerHead}><div><span>FROM</span><b>HAINA AUTO | 海纳百川国际汽贸</b></div><Send size={18}/></div>
    <div className={styles.mailFields}>
      <label>CRM client<select value={customerId} onChange={(event) => selectClient(event.target.value)}><option value="">Manual recipient</option>{clients.filter((client) => client.email).map((client) => <option value={client.id} key={client.id}>{client.name} — {client.email}</option>)}</select></label>
      <label>Recipient name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Client name" /></label>
      <label className={styles.mailWide}>To<input type="email" value={to} onChange={(event) => setTo(event.target.value)} required placeholder="client@example.com" /></label>
      <label className={styles.mailWide}>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={180} placeholder="Your HainaAuto order update" /></label>
      <label className={styles.mailWide}>Email heading<input value={heading} onChange={(event) => setHeading(event.target.value)} required maxLength={180} placeholder="An update from our export team" /></label>
      <label className={styles.mailWide}>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={9} maxLength={12000} placeholder="Write the full client message here. Separate paragraphs with a blank line." /></label>
      <label>Optional button label<input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="View your quotation" /></label>
      <label>Optional button URL<input type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://..." /></label>
    </div>
    <div className={styles.mailPreviewNote}><Eye size={13}/><span>Your text is automatically placed inside the complete HainaAuto branded email design with greeting, signature and contact footer.</span></div>
    {error && <p className={styles.formError}>{error}</p>}{notice && <p className={styles.formSuccess}>{notice}</p>}
    <button className={styles.btn} type="submit" disabled={busy}><Send size={14}/>{busy ? "Sending through Resend…" : "Send client email"}</button>
  </form>;
}
