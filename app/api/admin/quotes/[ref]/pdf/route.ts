import { NextRequest, NextResponse } from "next/server";

// Launching a browser and rendering a multi-page document can take longer
// than Vercel's default function timeout.
export const maxDuration = 60;

// Renders the print page (app/admin/quotes/[ref]/print) to PDF via headless
// Chromium rather than a programmatic PDF library — the print page IS the
// PDF layout, so this is also what staff see in the in-browser preview, with
// no second template to keep in sync.
//
// @sparticuz/chromium + playwright-core in production (a Chromium build
// meant for AWS Lambda/Vercel's serverless filesystem); full `playwright`
// (with its own bundled browser) locally, since @sparticuz/chromium's binary
// isn't meant to run outside a Lambda-like environment.
export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const cookie = request.headers.get("cookie") ?? "";
  const printUrl = new URL(`/admin/quotes/${encodeURIComponent(ref)}/print`, request.url).toString();

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
    // Forward the admin session cookie so the print page's own auth (proxy.ts)
    // lets this server-side render through — same origin, same session.
    const url = new URL(printUrl);
    await context.addCookies(
      cookie
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const eq = c.indexOf("=");
          return { name: c.slice(0, eq), value: c.slice(eq + 1), domain: url.hostname, path: "/" };
        })
    );
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 30000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HainaAuto-Quote-${ref}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await browser.close();
    console.error("[admin/quotes/pdf] render failed:", error);
    return NextResponse.json({ ok: false, error: "PDF generation failed." }, { status: 500 });
  }
}
