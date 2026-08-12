export type LeadResult = { ok: true; ref: string } | { ok: false; error: string };

const GENERIC_ERROR = "Something went wrong. Please try again or contact us on WhatsApp.";

export async function submitLead(payload: Record<string, unknown>): Promise<LeadResult> {
  let response: Response;
  try {
    response = await fetch("/api/leads", {
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
  return { ok: true, ref: data.ref as string };
}
