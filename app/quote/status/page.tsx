"use client";
import { FormEvent, useState } from "react";
import { PageHero, SiteShell } from "../../ui";

type QuoteStatus = {
  ref: string;
  status: string;
  destinationCountry: string;
  quoteDate: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  quoted: "Quote received — under review",
  negotiating: "In discussion with our export desk",
  deposit_paid: "Deposit received — preparing order",
  paid_full: "Paid in full — preparing shipment",
  shipped: "Shipped — in transit",
  delivered: "Delivered",
  lost: "Closed",
};

type State = "idle" | "loading" | "found" | "not-found" | "error";

export default function Status() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteStatus | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    const ref = new FormData(event.currentTarget).get("reference");
    if (typeof ref !== "string" || !ref.trim()) return;

    setState("loading");
    setError(null);
    setQuote(null);
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
            <p className="success" role="status">
              <b>{quote.ref}</b> — {STATUS_LABELS[quote.status] || quote.status}
              <br />
              Destination: {quote.destinationCountry} · Requested {quote.quoteDate} · Last updated {quote.updatedAt}
            </p>
          )}
        </form>
      </section>
    </SiteShell>
  );
}
