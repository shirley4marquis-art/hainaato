"use client";
import { FormEvent, useState } from "react";
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

export default function Status() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteStatus | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    const link = new FormData(event.currentTarget).get("reference");
    if (typeof link !== "string" || !link.trim()) return;
    let ref = "";
    let token = "";
    try {
      const url = new URL(link.trim(), window.location.origin);
      ref = url.searchParams.get("ref") || "";
      token = url.searchParams.get("token") || "";
    } catch { /* Show the same helpful error for malformed links. */ }
    if (!ref || !token) {
      setError("Paste the complete secure quotation link provided after submission. Contact our team if you only have a reference.");
      setQuote(null);
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setQuote(null);
    try {
      const response = await fetch(`/api/quote-status?ref=${encodeURIComponent(ref.trim())}&token=${encodeURIComponent(token)}`, { cache: "no-store" });
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

  return (
    <SiteShell>
      <PageHero kicker="REQUEST TRACKING" title="Quote Status" copy="Paste your secure quotation link to check your request." />
      <section className="section">
        <form className="container status-form" onSubmit={submit} aria-busy={state === "loading"}>
          <label htmlFor="reference">Secure quotation link</label>
          <div>
            <input id="reference" name="reference" placeholder="Paste your quotation link" required />
            <button className="btn primary" disabled={state === "loading"}>
              {state === "loading" ? "Checking…" : "Check status"}
            </button>
          </div>
          {state === "idle" && <p>Use the link shown after submitting your quote request. Contact our team if you need help accessing it.</p>}
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
              <p>Your PDF is available only through the secure link shown after submission or sent to your email.</p>
            </>
          )}
        </form>
      </section>
    </SiteShell>
  );
}
