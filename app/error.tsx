"use client";

// Generic error boundary (spec §12): never render error.message / error.stack
// to the visitor. The real error is still reported to the server console /
// Vercel logs by Next.js automatically.
import { useEffect } from "react";
import { SiteShell } from "./ui";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Next.js already logs the error server-side; this is a client breadcrumb.
    console.error("An unexpected client error occurred.");
  }, []);

  return (
    <SiteShell>
      <section className="container empty-state" role="alert">
        <h1>Something went wrong</h1>
        <p>We hit an unexpected problem loading this page. Please try again in a moment.</p>
        <button className="btn primary" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </SiteShell>
  );
}
