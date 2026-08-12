import { NewsCenter } from "../news-center";
import Image from "next/image";
import { PageHero, SiteShell } from "../ui";
import { newsFeed } from "../../lib/news-feed";

export default function News() {
  return <SiteShell>
    <PageHero kicker="POLICY, OEMS & CHINA AUTO EXPORT" title="Industry News" copy="Useful perspectives on China’s vehicle market, export logistics and the models shaping global demand."/>
    <section className="section news-feed-section"><div className="container">
      <NewsCenter stories={[...newsFeed]}/>
      <div className="news-feed-grid">{newsFeed.map((article)=><article className="news-feed-card" key={article.link}>
        <a className="news-feed-image" href={article.link} target="_blank" rel="noopener noreferrer"><Image src={article.image} alt="" fill sizes="(max-width: 560px) 120px, 220px" unoptimized/></a>
        <div><span>{article.source} · {article.date}</span><h2><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a></h2><a className="read-link" href={article.link} target="_blank" rel="noopener noreferrer">Read article →</a></div>
      </article>)}</div>
    </div></section>
  </SiteShell>;
}
