// Shared headless-Chromium PDF renderer. Callers provide the same-origin path
// to render and optional auth headers/cookies when the page is protected.
export type RenderPagePdfAuth = { kind: "cookie"; cookieHeader: string } | { kind: "headers"; headers: Record<string, string> } | { kind: "none" };

export async function renderPagePdf(pathname: string, baseUrl: string, auth: RenderPagePdfAuth = { kind: "none" }): Promise<Buffer> {
  const printUrl = new URL(pathname, baseUrl).toString();

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
    } else if (auth.kind === "headers") {
      await context.setExtraHTTPHeaders(auth.headers);
    }
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 30000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
