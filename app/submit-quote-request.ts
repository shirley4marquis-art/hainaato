// Client-side caller for the automated cart-checkout quote flow
// (app/api/quote-requests/route.ts) — mirrors submit-lead.ts's shape but
// posts the structured {vehicles, qty, country, ...} payload that route
// needs to pull real listing data and generate a PDF, rather than a single
// free-text message.
export type QuoteRequestResult =
  | { ok: true; ref: string; documentNumber: string | null; accessToken: string; deliveryStatus: "processing" | "whatsapp-only" }
  | { ok: false; error: string };

const GENERIC_ERROR = "Something went wrong. Please try again or contact us on WhatsApp.";

export async function submitQuoteRequest(payload: Record<string, unknown>): Promise<QuoteRequestResult> {
  let response: Response;
  try {
    response = await fetch("/api/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "Network error — please check your connection and try again." };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    return { ok: false, error: (data && typeof data.error === "string" && data.error) || GENERIC_ERROR };
  }
  return {
    ok: true,
    ref: data.ref as string,
    documentNumber: (data.documentNumber as string) ?? null,
    accessToken: data.accessToken as string,
    deliveryStatus: data.deliveryStatus === "whatsapp-only" ? "whatsapp-only" : "processing",
  };
}
