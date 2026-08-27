// Shared headless-Chromium PDF renderer. Callers provide the same-origin path
// to render and optional auth headers/cookies when the page is protected.
export type RenderPagePdfAuth = { kind: "cookie"; cookieHeader: string } | { kind: "headers"; headers: Record<string, string> } | { kind: "none" };

const MAX_PDF_IMAGE_WIDTH = 1200;
const MAX_PDF_IMAGE_HEIGHT = 900;

// Vercel's Fluid Compute can route several concurrent requests into the same
// warm instance to avoid cold starts. Each renderPagePdf() call launches its
// own headless Chromium process, and a handful of those launching at once in
// one instance is enough to exhaust it (observed in production as
// page.goto: net::ERR_INSUFFICIENT_RESOURCES, sometimes before the page even
// starts loading). This caps how many renders run at once *per instance* —
// extra callers queue briefly rather than piling every Chromium launch on top
// of each other. It does nothing to throttle requests spread across separate
// instances; the real fix for sustained abusive traffic is at the route level
// (auth/rate limiting), not here.
const MAX_CONCURRENT_RENDERS = 1;
const RENDER_QUEUE_TIMEOUT_MS = 25_000;
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

async function acquireRenderSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = renderQueue.indexOf(onTurn);
      if (index !== -1) renderQueue.splice(index, 1);
      reject(new Error("Timed out waiting for a free PDF renderer slot."));
    }, RENDER_QUEUE_TIMEOUT_MS);
    function onTurn() {
      clearTimeout(timer);
      resolve();
    }
    renderQueue.push(onTurn);
  });
  activeRenders += 1;
}

function releaseRenderSlot(): void {
  activeRenders -= 1;
  renderQueue.shift()?.();
}

export async function renderPagePdf(pathname: string, baseUrl: string, auth: RenderPagePdfAuth = { kind: "none" }): Promise<Buffer> {
  await acquireRenderSlot();
  try {
    return await renderPagePdfNow(pathname, baseUrl, auth);
  } finally {
    releaseRenderSlot();
  }
}

async function renderPagePdfNow(pathname: string, baseUrl: string, auth: RenderPagePdfAuth): Promise<Buffer> {
  const printUrl = new URL(pathname, baseUrl).toString();
  const printOrigin = new URL(printUrl).origin;

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
    await context.route("**/*", async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      const resourceType = request.resourceType();

      if (requestUrl.origin !== printOrigin) {
        if (resourceType === "script" || resourceType === "image" || resourceType === "font" || resourceType === "stylesheet") {
          await route.abort();
          return;
        }
        await route.continue();
        return;
      }

      if (resourceType !== "image") {
        await route.continue();
        return;
      }

      try {
        const response = await fetch(request.url(), { headers: await request.allHeaders() });
        if (!response.ok) {
          await route.continue();
          return;
        }
        const source = Buffer.from(await response.arrayBuffer());
        const sharp = (await import("sharp")).default;
        const optimized = await sharp(source)
          .rotate()
          .resize({
            width: MAX_PDF_IMAGE_WIDTH,
            height: MAX_PDF_IMAGE_HEIGHT,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 78, mozjpeg: true })
          .toBuffer();
        await route.fulfill({
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(optimized.length),
            "cache-control": "no-store",
          },
          body: optimized,
        });
      } catch {
        await route.continue();
      }
    });
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((image) => {
          if (image.complete) return undefined;
          return new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        })
      );
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
