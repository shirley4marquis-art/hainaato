"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type NewsStory={title:string;link:string;image:string;date:string;source:string};

export function NewsCenter({stories}:{stories:NewsStory[]}){
  const [active,setActive]=useState(0);
  useEffect(()=>{if(stories.length<2)return;const timer=window.setInterval(()=>setActive(current=>(current+1)%stories.length),6500);return()=>window.clearInterval(timer)},[stories.length]);
  if(!stories.length)return null;
  const story=stories[active];
  return <section className="live-news" aria-label="Live China automotive news">
    <div className="live-news-top"><span><i/> LIVE CHINA AUTO NEWS</span><Link href="/news">News center →</Link></div>
    <a className="live-news-feature" href={story.link} target="_blank" rel="noopener noreferrer">
      <Image src={story.image} alt={story.title} fill sizes="(max-width: 900px) 100vw, 1180px" unoptimized/><div className="live-news-shade"/><div className="live-news-copy"><span>{story.source} · {story.date}</span><h2>{story.title}</h2><b>Read the latest →</b></div>
    </a>
    <div className="live-news-controls"><button type="button" onClick={()=>setActive(current=>(current-1+stories.length)%stories.length)} aria-label="Previous story">←</button><div>{stories.slice(0,5).map((item,index)=><button type="button" key={item.link} className={index===active?"active":""} onClick={()=>setActive(index)} aria-label={`Show story ${index+1}`}/>)}</div><button type="button" onClick={()=>setActive(current=>(current+1)%stories.length)} aria-label="Next story">→</button></div>
  </section>
}
