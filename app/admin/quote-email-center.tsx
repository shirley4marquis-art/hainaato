"use client";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { CheckCircle2, Eye, FileText, Paperclip, RefreshCw, Send } from "lucide-react";
import styles from "./admin.module.css";
import type { QuoteEmailRecord } from "../../lib/crm";
import type { QuoteEmailDraft, QuoteEmailDraftType } from "../../lib/quote-email-drafts";

export function QuoteEmailCenter({
  quoteRef,
  customerEmail,
  drafts,
  emails,
}: {
  quoteRef: string;
  customerEmail: string | null;
  drafts: QuoteEmailDraft[];
  emails: QuoteEmailRecord[];
}) {
  const [selectedType, setSelectedType] = useState<QuoteEmailDraftType>("quotation");
  const [busyType, setBusyType] = useState<QuoteEmailDraftType | null>(null);
  const [customBusy, setCustomBusy] = useState(false);
  const [customTo, setCustomTo] = useState(customerEmail ?? "");
  const [customSubject, setCustomSubject] = useState(`Regarding your HainaAuto quotation ${quoteRef}`);
  const [customMessage, setCustomMessage] = useState("");
  const [customFiles, setCustomFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = useMemo(() => drafts.find((draft) => draft.type === selectedType) ?? drafts[0], [drafts, selectedType]);

  async function sendDraft(type: QuoteEmailDraftType) {
    if (busyType) return;
    const draftToSend = drafts.find((draft) => draft.type === type) ?? selected;
    setBusyType(type);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteRef)}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftType: type }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.error || "Email could not be sent.");
      } else {
        setNotice(`${draftToSend.label} sent to ${customerEmail}.`);
        location.reload();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyType(null);
    }
  }

  async function sendCustomEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customBusy) return;
    setCustomBusy(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("mode", "custom");
      form.set("toEmail", customTo);
      form.set("subject", customSubject);
      form.set("message", customMessage);
      customFiles.forEach((file) => form.append("attachments", file));
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteRef)}/resend`, {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.error || "Custom email could not be sent.");
      } else {
        setNotice(`Custom email sent to ${customTo}.`);
        location.reload();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCustomBusy(false);
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.pageHeading} style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 15, margin: 0 }}>Email draft center</h2>
          <p>Preview the customer email after the quotation is recorded. The quote email is ready first and attaches the PDF.</p>
        </div>
        <button type="button" className={styles.btn} onClick={() => sendDraft(selected.type)} disabled={Boolean(busyType) || !customerEmail}>
          <Send size={13} /> {busyType === selected.type ? "Sending..." : selected.attachesPdf ? "Send quote + PDF" : "Send selected email"}
        </button>
      </div>
      {!customerEmail && <p className={styles.formError}>This customer has no email address on file. Add one before sending.</p>}
      {error && <p className={styles.formError}>{error}</p>}
      {notice && <p className={styles.formSuccess}>{notice}</p>}

      <div className={styles.emailDraftLayout}>
        <div className={styles.emailDraftList} role="tablist" aria-label="Quote email drafts">
          {drafts.map((draft) => (
            <button
              type="button"
              key={draft.type}
              className={draft.type === selected.type ? styles.emailDraftActive : ""}
              onClick={() => setSelectedType(draft.type)}
              role="tab"
              aria-selected={draft.type === selected.type}
            >
              <span>{draft.eyebrow}</span>
              <b>{draft.label}</b>
              <small>{draft.summary}</small>
              <em>{draft.attachesPdf ? <><FileText size={11} /> PDF attached</> : <><CheckCircle2 size={11} /> Branded email</>}</em>
            </button>
          ))}
        </div>

        <article className={styles.emailDraftPreview}>
          <header>
            <div>
              <span>TO</span>
              <b>{customerEmail || "No customer email"}</b>
            </div>
            <div>
              <span>SUBJECT</span>
              <b>{selected.subject}</b>
            </div>
          </header>
          <iframe title={`${selected.label} preview`} srcDoc={selected.html} />
        </article>
      </div>

      <form className={styles.mailComposer} style={{ marginTop: 18 }} onSubmit={sendCustomEmail}>
        <div className={styles.mailComposerHead}>
          <div>
            <span>CUSTOM EMAIL</span>
            <b>Send a branded message with attachments</b>
          </div>
          <Paperclip size={18} />
        </div>
        <div className={styles.mailFields}>
          <label className={styles.mailWide}>
            To
            <input
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              placeholder="client@email.com, second@email.com"
              type="text"
              required
            />
          </label>
          <label className={styles.mailWide}>
            Subject
            <input value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} type="text" required />
          </label>
          <label className={styles.mailWide}>
            Message
            <textarea
              rows={7}
              value={customMessage}
              onChange={(event) => setCustomMessage(event.target.value)}
              placeholder="Write the custom message for this client..."
              required
            />
          </label>
          <label className={styles.mailWide}>
            Attachments
            <input
              type="file"
              multiple
              onChange={(event) => setCustomFiles(Array.from(event.currentTarget.files ?? []))}
            />
          </label>
        </div>
        {customFiles.length > 0 && (
          <div className={styles.attachmentList}>
            {customFiles.map((file) => (
              <span key={`${file.name}-${file.size}`}>{file.name}</span>
            ))}
          </div>
        )}
        <p className={styles.mailPreviewNote}>
          <Paperclip size={13} /> Sent through the HainaAuto Resend styling. Attach up to 5 files, 8 MB total.
        </p>
        <button type="submit" className={styles.btn} disabled={customBusy}>
          <Send size={13} /> {customBusy ? "Sending..." : "Send custom email"}
        </button>
      </form>

      <div className={styles.emailHistoryBlock}>
        <div className={styles.pageHeading} style={{ margin: "24px 0 12px" }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Sent email history</h2>
          <button type="button" className={styles.btnGhost} onClick={() => sendDraft("quotation")} disabled={Boolean(busyType) || !customerEmail}>
            <RefreshCw size={13} /> {busyType === "quotation" ? "Sending..." : "Regenerate & resend quote"}
          </button>
        </div>
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
    </div>
  );
}
