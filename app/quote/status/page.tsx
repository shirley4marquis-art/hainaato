"use client";
import { FormEvent, useState } from "react";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { PageHero, SiteShell } from "../../ui";
import { QUOTE_STATUS_LABELS } from "../../../lib/format";

type QuoteStatus = {
  ref: string;
  status: string;
  destinationCountry: string;
  quoteDate: string;
  updatedAt: string;
};

type State = "idle" | "loading" | "found" | "not-found" | "error";
type DownloadState = "idle" | "preparing" | "downloading" | "done" | "error";

export default function Status() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteStatus | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    const ref = new FormData(event.currentTarget).get("reference");
    if (typeof ref !== "string" || !ref.trim()) return;

    setState("loading");
    setError(null);
    setQuote(null);
    setDownloadState("idle");
    setDownloadError(null);
    try {
      const response = await fetch(`/api/quote-status?ref=${encodeURIComponent(ref.trim())}`);
      const data = await response.json();
      if (response.ok && data.ok) {
        setQuote(data.quote);
        setState("found");
      } else if (response.status === 404) {
        setState("not-found");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
      setState("error");
    }
  }

  async function downloadPdf(ref: string) {
    if (downloadState === "preparing" || downloadState === "downloading") return;
    setDownloadState("preparing");
    setDownloadPct(0);
    setDownloadError(null);
    try {
      const response = await fetch(`/api/quote-pdf?ref=${encodeURIComponent(ref)}`);
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not download the PDF.");
      }
      const total = Number(response.headers.get("Content-Length") || 0);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      setDownloadState("downloading");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0) setDownloadPct(Math.min(100, Math.round((received / total) * 100)));
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `HainaAuto-Quote-${ref}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadPct(100);
      setDownloadState("done");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Could not download the PDF.");
      setDownloadState("error");
    }
  }

  return (
    <SiteShell>
      <PageHero kicker="REQUEST TRACKING" title="Quote Status" copy="Enter the reference supplied by our team to check your request." />
      <section className="section">
        <form className="container status-form" onSubmit={submit} aria-busy={state === "loading"}>
          <label htmlFor="reference">Quote reference</label>
          <div>
            <input id="reference" name="reference" placeholder="EST0000" required />
            <button className="btn primary" disabled={state === "loading"}>
              {state === "loading" ? "Checking…" : "Check status"}
            </button>
          </div>
          {state === "idle" && <p>Status tracking requires a reference created by the HainaAuto team.</p>}
          {state === "not-found" && (
            <p className="form-error" role="alert">
              No request found for that reference. Double-check the code we sent you.
            </p>
          )}
          {state === "error" && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {state === "found" && quote && (
            <>
              <p className="success" role="status">
                <b>{quote.ref}</b> — {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                <br />
                Destination: {quote.destinationCountry} · Requested {quote.quoteDate} · Last updated {quote.updatedAt}
              </p>
              <div className="pdf-download">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => downloadPdf(quote.ref)}
                  disabled={downloadState === "preparing" || downloadState === "downloading"}
                >
                  {downloadState === "preparing" && <>Preparing your document…</>}
                  {downloadState === "downloading" && <>Downloading… {downloadPct}%</>}
                  {downloadState === "done" && (
                    <>
                      <CheckCircle2 size={16} /> Downloaded
                    </>
                  )}
                  {(downloadState === "idle" || downloadState === "error") && (
                    <>
                      <Download size={16} /> Download quote PDF
                    </>
                  )}
                </button>
                {(downloadState === "preparing" || downloadState === "downloading") && (
                  <div className="pdf-download-bar" aria-hidden="true">
                    <i
                      className={downloadState === "preparing" ? "indeterminate" : ""}
                      style={downloadState === "downloading" ? { width: `${downloadPct}%` } : undefined}
                    />
                  </div>
                )}
                {downloadState === "done" && (
                  <p className="pdf-download-note">
                    <FileText size={13} /> Saved as HainaAuto-Quote-{quote.ref}.pdf
                  </p>
                )}
                {downloadState === "error" && downloadError && (
                  <p className="form-error" role="alert">
                    {downloadError}
                  </p>
                )}
              </div>
            </>
          )}
        </form>
      </section>
    </SiteShell>
  );
}
