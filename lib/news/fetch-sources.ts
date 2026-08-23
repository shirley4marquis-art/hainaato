import crypto from "node:crypto";
import { NEWS_SOURCES, NEWS_USER_AGENT } from "./sources";
import type { NewsArticle } from "./types";

const MAX_ITEMS_PER_SOURCE = 10;
const REQUEST_TIMEOUT_MS = 8000;
const FALLBACK_IMAGE = "/hainaauto-logo.webp";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function textOf(tag: string, block: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities(cdata ? cdata[1] : raw);
}

async function fetchWithTimeout(url: string, accept: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": NEWS_USER_AGENT, Accept: accept },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseFeedItems(xml: string): { title: string; link: string; pubDate: string | null }[] {
  const items: { title: string; link: string; pubDate: string | null }[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const title = textOf("title", block);
    const link = textOf("link", block);
    if (!title || !link) continue;
    items.push({ title, link: link.trim(), pubDate: textOf("pubDate", block) });
  }
  return items;
}

async function fetchOgImage(articleUrl: string): Promise<string> {
  try {
    const html = await fetchWithTimeout(articleUrl, "text/html");
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? match[1] : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLatestNews(): Promise<{ articles: NewsArticle[]; errors: string[] }> {
  const articles: NewsArticle[] = [];
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  for (const source of NEWS_SOURCES) {
    try {
      const xml = await fetchWithTimeout(source.feedUrl, "application/rss+xml, text/xml");
      const items = parseFeedItems(xml).slice(0, MAX_ITEMS_PER_SOURCE);
      for (const item of items) {
        try {
          const image = await fetchOgImage(item.link);
          const publishedAt = item.pubDate && !Number.isNaN(Date.parse(item.pubDate)) ? new Date(item.pubDate).toISOString() : fetchedAt;
          articles.push({
            id: crypto.createHash("sha1").update(item.link).digest("hex"),
            source: source.name,
            title: item.title,
            link: item.link,
            image,
            published_at: publishedAt,
            fetched_at: fetchedAt,
          });
        } catch (error) {
          errors.push(`${item.link}: ${error instanceof Error ? error.message : String(error)}`);
        }
        await sleep(300);
      }
    } catch (error) {
      errors.push(`${source.name} feed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { articles, errors };
}
