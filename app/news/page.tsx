import { NewsCenter, type NewsStory } from "../news-center";
import Image from "next/image";
import { PageHero, SiteShell } from "../ui";
import { listLatestNews } from "../../lib/news/store";
import { newsFeed } from "../../lib/news-feed";

// News refreshes daily via /api/cron/news-refresh — re-checking the store
// every 30 min keeps the page from serving a fully stale cache in between
// without hitting the database on every single request.
export const revalidate = 1800;

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

async function getStories(): Promise<NewsStory[]> {
  const articles = await listLatestNews(40);
  if (!articles.length) return [...newsFeed];
  return articles.map((article) => ({
    title: article.title,
    link: article.link,
    image: article.image ?? "/hainaauto-logo.webp",
    date: dateFormatter.format(new Date(article.published_at)),
    source: article.source,
  }));
}

export default async function News() {
  const stories = await getStories();
  return <SiteShell>
    <PageHero kicker="POLICY, OEMS & CHINA AUTO EXPORT" title="Industry News" copy="Useful perspectives on China’s vehicle market, export logistics and the models shaping global demand."/>
    <section className="section news-feed-section"><div className="container">
      <NewsCenter stories={stories}/>
      <div className="news-feed-grid">{stories.map((article)=><article className="news-feed-card" key={article.link}>
        <a className="news-feed-image" href={article.link} target="_blank" rel="noopener noreferrer"><Image src={article.image} alt="" fill sizes="(max-width: 560px) 120px, 220px" unoptimized/></a>
        <div><span>{article.source} · {article.date}</span><h2><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a></h2><a className="read-link" href={article.link} target="_blank" rel="noopener noreferrer">Read article →</a></div>
      </article>)}</div>
    </div></section>
  </SiteShell>;
}
