// Shared headless-Chromium rendering of a quote's print page
// (app/admin/quotes/[ref]/print) to PDF — the print page IS the PDF layout,
// so this is also what staff see in the in-browser preview, with no second
// template to keep in sync.
//
// Two callers, two auth modes: the staff-authenticated download route
// (app/api/admin/quotes/[ref]/pdf) forwards the requester's own session
// cookie; the automated customer quote-request flow
// (app/api/quote-requests) has no end-user admin session to forward, so it
// authenticates the internal navigation with a shared secret header instead
// (checked in proxy.ts alongside the normal Supabase session check).
//
// @sparticuz/chromium + playwright-core in production (a Chromium build
// meant for AWS Lambda/Vercel's serverless filesystem); full `playwright`
// (with its own bundled browser) locally, since @sparticuz/chromium's binary
// isn't meant to run outside a Lambda-like environment.
export type RenderQuotePdfAuth = { kind: "cookie"; cookieHeader: string } | { kind: "internal-secret" };

export function requireInternalPdfSecret(): string {
  const secret = process.env.INTERNAL_PDF_SECRET;
  if (!secret) throw new Error("INTERNAL_PDF_SECRET is not set.");
  return secret;
}

export async function renderQuotePdf(ref: string, baseUrl: string, auth: RenderQuotePdfAuth): Promise<Buffer> {
  const printUrl = new URL(`/admin/quotes/${encodeURIComponent(ref)}/print`, baseUrl).toString();

  let browser: import("playwright-core").Browser;
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: playwrightChromium } = await import("playwright-core");
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const { chromium: playwrightChromium } = await import("playwright");
    browser = await playwrightChromium.launch();
  }

  try {
    const context = await browser.newContext();
    const url = new URL(printUrl);
    if (auth.kind === "cookie") {
      // Forward the requester's admin session cookie so the print page's own
      // auth (proxy.ts) lets this server-side render through — same origin,
      // same session.
      await context.addCookies(
        auth.cookieHeader
          .split(";")
          .map((c: string) => c.trim())
          .filter(Boolean)
          .map((c: string) => {
            const eq = c.indexOf("=");
            return { name: c.slice(0, eq), value: c.slice(eq + 1), domain: url.hostname, path: "/" };
          })
      );
    } else {
      await context.setExtraHTTPHeaders({ "x-internal-pdf-secret": requireInternalPdfSecret() });
    }
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 30000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
