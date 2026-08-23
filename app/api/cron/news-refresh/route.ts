import { NextResponse } from "next/server";
import { fetchLatestNews } from "../../../../lib/news/fetch-sources";
import { NEWS_SOURCES } from "../../../../lib/news/sources";
import { saveNewsRefreshLog, upsertNewsArticles } from "../../../../lib/news/store";
import type { NewsRefreshLog } from "../../../../lib/news/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const log: NewsRefreshLog = {
    run_id: `news-${Date.now()}`,
    started_at: new Date().toISOString(),
    completed_at: null,
    sources: NEWS_SOURCES.map((s) => s.name),
    articles_found: 0,
    articles_imported: 0,
    duplicates: 0,
    errors: [],
  };

  const { articles, errors } = await fetchLatestNews();
  log.articles_found = articles.length;
  log.errors.push(...errors);

  if (articles.length) {
    const { imported, duplicates } = await upsertNewsArticles(articles);
    log.articles_imported = imported;
    log.duplicates = duplicates;
  }

  log.completed_at = new Date().toISOString();
  await saveNewsRefreshLog(log);

  return NextResponse.json({ ok: true, log });
}
