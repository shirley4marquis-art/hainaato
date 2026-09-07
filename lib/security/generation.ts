// Keep rendering targets independent of the incoming Host / forwarded headers.
export function pdfOrigin(baseUrl: string): string {
  const configured = process.env.PDF_RENDER_ORIGIN;
  if (configured) {
    const url = new URL(configured);
    if (url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
      throw new Error("Invalid PDF_RENDER_ORIGIN.");
    }
    return url.origin;
  }
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const url = new URL(baseUrl);
    if (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password) return url.origin;
  }
  return "https://www.nindgeauto.com";
}

export function pdfTarget(pathname: string, baseUrl: string): URL {
  const origin = pdfOrigin(baseUrl);
  const url = new URL(pathname, origin);
  if (!pathname.startsWith("/") || pathname.startsWith("//") || url.origin !== origin || url.username || url.password) throw new Error("Invalid PDF path.");
  if (!/^\/admin\/quotes\/[A-Za-z0-9-]+\/print$/.test(url.pathname) && !/^\/vehicles\/[^/]+\/specification$/.test(url.pathname)) throw new Error("Unsupported PDF page.");
  if (url.search || url.hash) throw new Error("Invalid PDF path.");
  return url;
}

export function safeEmailUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || /[\u0000-\u0020\u007f]/.test(value)) return null;
    return url.href;
  } catch { return null; }
}

export function isSingleEmail(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254) return false;
  // A single bare mailbox, never a display name or recipient list.
  return /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value) && value.split("@")[0].length <= 64;
}
