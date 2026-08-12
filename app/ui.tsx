"use client";
/* Brand marks use their source files directly; vehicle imagery uses next/image. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {Bot,CarFront,House,Menu,Newspaper,Search,Sparkles,UserRound,X} from "lucide-react";
import {TELEGRAM_URL,WECHAT_CONTACT_URL,WECHAT_USERNAME,WHATSAPP_URL,TelegramIcon,WeChatIcon,WhatsAppIcon} from "./contact-links";
import type { VehicleIndexEntry, VehicleSite } from "../lib/format";
import { formatCNY, formatKm, imagePath } from "../lib/format";
import { ResilientVehicleImage, rankVehicleImages } from "./vehicle-image";

export function Gallery({site,id,images,title}:{site:VehicleSite,id:string,images:string[],title:string}) {
  const [active,setActive]=useState(0);
  const gallery=rankVehicleImages(images).map(img=>imagePath(site,id,img));
  const main=gallery[active];
  return <div><div className="gallery-main"><ResilientVehicleImage candidates={[main,...gallery.filter(img=>img!==main)]} alt={title} sizes="(max-width: 900px) 100vw, 760px" priority/></div>{gallery.length>1&&<div className="gallery-thumbs">{gallery.slice(0,12).map((img,i)=><button key={img} type="button" className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={`Show photo ${i+1}`}><ResilientVehicleImage candidates={[img]} alt="" sizes="120px" minimumWidth={80} minimumHeight={60}/></button>)}</div>}</div>;
}

const nav=[[/^\/$/,"/","Home"],[/^\/vehicles/,"/vehicles","Vehicles"],[/^\/brands/,"/brands","Used Cars"],[/^\/new-cars/,"/new-cars","New cars"],[/^\/news/,"/news","News"],[/^\/services/,"/services","Services"],[/^\/about/,"/about","About"]] as const;

export function HeroSpotlight({vehicles}:{vehicles:VehicleIndexEntry[]}) {
  const [active,setActive]=useState(0);
  if (!vehicles.length) return null;
  const v=vehicles[active];
  const specLine=[v.fuel?normalizeLabel(v.fuel):null,v.bodyType?normalizeLabel(v.bodyType):null].filter(Boolean).join(" · ");
  const go=(delta:number)=>setActive((current)=>(current+delta+vehicles.length)%vehicles.length);
  return <div className="hero-spotlight">
    <button type="button" className="spotlight-nav prev" onClick={()=>go(-1)} aria-label="Previous vehicle">←</button>
    <button type="button" className="spotlight-nav next" onClick={()=>go(1)} aria-label="Next vehicle">→</button>
    <div className="spotlight-card">
      <div className="spotlight-head">
        <Link href={`/vehicles/${v.slug}`}>{v.title}</Link>
        <p>{specLine||"Export ready"}</p>
        <div><small>Price</small><b>{formatCNY(v.priceCNY)}</b></div>
        <span>Export Ready</span>
      </div>
      <div className="spotlight-image"><ResilientVehicleImage candidates={(v.thumbs.length?v.thumbs:v.thumb?[v.thumb]:[]).map(img=>imagePath(v.site,v.id,img))} alt={v.title} sizes="(max-width: 600px) 90vw, 430px" priority/></div>
      <div className="spotlight-dots" role="tablist" aria-label="Spotlight vehicles">{vehicles.map((item,index)=><button key={item.slug} type="button" role="tab" aria-selected={index===active} aria-label={`Show vehicle ${index+1} of ${vehicles.length}`} className={index===active?"active":""} onClick={()=>setActive(index)}/>)}</div>
    </div>
  </div>;
}

function normalizeLabel(value:string){return value.charAt(0).toUpperCase()+value.slice(1);}

export type NewsSpotlightItem={title:string,source:string,date:string,url:string,image:string};

export function NewsSpotlight({articles}:{articles:readonly NewsSpotlightItem[]}) {
  const [active,setActive]=useState(0);
  const [failed,setFailed]=useState<Set<number>>(new Set());
  useEffect(()=>{
    if(articles.length<2) return;
    const timer=window.setInterval(()=>setActive(current=>(current+1)%articles.length),6000);
    return ()=>window.clearInterval(timer);
  },[articles.length]);
  if (!articles.length) return null;
  const a=articles[active];
  const go=(delta:number)=>setActive((current)=>(current+delta+articles.length)%articles.length);
  return <div className="hero-spotlight">
    <button type="button" className="spotlight-nav prev" onClick={()=>go(-1)} aria-label="Previous story">←</button>
    <button type="button" className="spotlight-nav next" onClick={()=>go(1)} aria-label="Next story">→</button>
    <div className="spotlight-card">
      <div className="spotlight-head">
        <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
        <p>China auto industry update</p>
        <div><small>Source</small><b className="news-spotlight-source">{a.source}{a.date?` · ${a.date}`:""}</b></div>
        <span>China Auto News</span>
      </div>
      <div className="spotlight-image">{a.image&&!failed.has(active)?<Image src={a.image} alt="" fill sizes="(max-width: 600px) 90vw, 430px" unoptimized onError={()=>setFailed(s=>new Set(s).add(active))}/>:<div className="news-spotlight-noimage"><Newspaper size={28}/></div>}</div>
      <div className="spotlight-dots" role="tablist" aria-label="News stories">{articles.map((item,index)=><button key={item.url} type="button" role="tab" aria-selected={index===active} aria-label={`Show story ${index+1} of ${articles.length}`} className={index===active?"active":""} onClick={()=>setActive(index)}/>)}</div>
    </div>
  </div>;
}

export function DetailTabs({panels}:{panels:[string,ReactNode][]}) {
  const [active,setActive]=useState(0);
  return <div className="detail-tabs">
    <div className="detail-tabs-nav" role="tablist">{panels.map(([label],i)=><button key={label} type="button" role="tab" aria-selected={i===active} className={i===active?"active":""} onClick={()=>setActive(i)}>{label}</button>)}</div>
    <div className="detail-tabs-panel">{panels[active][1]}</div>
  </div>;
}

export function ShareButton({title}:{title:string}) {
  const [copied,setCopied]=useState(false);
  async function share(){
    const url=window.location.href;
    if(navigator.share){try{await navigator.share({title,url});return}catch{return}}
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),2000);
  }
  return <button type="button" onClick={share}>{copied?"Link copied":"Share"}</button>;
}

export function SiteShell({children}:{children:ReactNode}) {
  const path=usePathname();
  const [open,setOpen]=useState(false);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="ah-header"><div className="container">
      <div className="mobile-header-minimal"><button type="button" className="mobile-menu-trigger" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu-panel" aria-label={open?"Close menu":"Open menu"}>{open?<X/>:<Menu/>}</button><form className="mobile-header-search" action="/vehicles"><Search/><input name="q" type="search" placeholder="Search vehicle" aria-label="Search vehicle"/></form><Link className="mobile-header-quote" href="/quote">Get Quote</Link></div>
      <div id="mobile-menu-panel" className={`mobile-menu-panel${open?" open":""}`}>{nav.map(([test,href,label])=>{const active=test.test(path);return <Link className={active?"active":""} aria-current={active?"page":undefined} href={href} key={href} onClick={()=>setOpen(false)}>{label}</Link>})}</div>
      <div className="ah-header-brand-row">
        <Link className="ah-brand-lockup" href="/"><img src="https://img.hainaauto.com/vehicle/site_187121eacd6e44cc.webp" alt="HainaAuto" className="ah-header-brand-logo"/><div className="ah-brand-copy"><div className="ah-brand-headline"><span className="ah-brand-title">HainaAuto.com</span><span className="ah-brand-ribbon">China auto export</span></div><span className="ah-brand-lead">Used &amp; new vehicles from China — transparent condition, export-ready docs, worldwide delivery.</span><span className="ah-brand-tagline">◎ <span>From China, to the world</span></span></div></Link>
        <div className="ah-header-aside"><div className="ah-header-actions"><Link className="ah-btn-gold" href="/quote">Request Quote</Link><Link className="ah-btn-outline" href="/contact">Contact</Link></div><div className="ah-header-meta"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp at +8615060610146"><WhatsAppIcon/> +8615060610146</a><a href="mailto:info@hainaauto.com">✉ info@hainaauto.com</a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>WhatsApp</a><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><TelegramIcon/>Telegram</a><a href={WECHAT_CONTACT_URL}><WeChatIcon/>WeChat</a></div></div>
      </div>
      <div className="ah-header-nav-wrap"><button className="menu" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">{open?"×":"☰"}</button><nav className={open?"open":""}><div className="ah-nav-links">{nav.map(([test,href,label])=>{const active=test.test(path);return <Link className={active?"active":""} aria-current={active?"page":undefined} href={href} key={href} onClick={()=>setOpen(false)}>{label}</Link>})}</div><div className="ah-nav-end"><form className="ah-header-search" action="/vehicles"><input type="search" name="q" placeholder="Quick search..." aria-label="Search vehicles"/><button type="submit">Search</button></form></div></nav></div>
    </div>
    </header>
    <main id="main-content">{children}</main><Footer/>
    <aside className="mobile-social-rail" aria-label="Quick contact"><a className="wechat" href={WECHAT_CONTACT_URL} aria-label={`Contact by WeChat: ${WECHAT_USERNAME}`}><WeChatIcon/><small>WeChat</small></a><a className="telegram" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on Telegram"><TelegramIcon/></a><a className="mobile-wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on WhatsApp"><WhatsAppIcon/></a><Link className="assistant" href="/contact" aria-label="Open assistant"><Bot/></Link></aside>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><Link className={path==="/"?"active":""} href="/"><House/><span>Home</span></Link><Link className={path.startsWith("/vehicles")?"active":""} href="/vehicles"><CarFront/><span>Vehicles</span></Link><Link className={path.startsWith("/new-cars")?"active":""} href="/new-cars"><Sparkles/><span>New cars</span></Link><Link className={path.startsWith("/contact")?"active":""} href="/contact"><UserRound/><span>Me</span></Link></nav>
    <a className="whatsapp" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on WhatsApp"><WhatsAppIcon/></a>
  </>;
}

function Footer(){return <footer className="footer"><div className="container footer-grid"><div className="footer-about"><div className="brand light"><img src="https://img.hainaauto.com/vehicle/site_187121eacd6e44cc.webp" alt=""/><span>HAINA<b>AUTO</b></span></div><p>Professional Chinese parallel auto exporter serving global buyers with carefully inspected vehicles and end-to-end export services.</p><div className="social"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>WhatsApp</a><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><TelegramIcon/>Telegram</a><a href={WECHAT_CONTACT_URL}><WeChatIcon/>WeChat</a></div></div><div><h4>User Guide</h4><Link href="/help">FAQ (Help)</Link><Link href="/services#export-flow">Purchase Process</Link><Link href="/vehicles">Vehicle Market</Link><Link href="/news">Industry News</Link></div><div><h4>Export Services</h4><Link href="/services">Logistics Solutions</Link><Link href="/services">Customs Clearance</Link><Link href="/services">Refurbishment</Link><Link href="/services">Overseas Warehousing</Link></div><div><h4>Contact Us</h4><p>Contact Us (24/7)<br/><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">+86 150 6061 0146</a></p><p>Business Email<br/><a href="mailto:info@hainaauto.com">info@hainaauto.com</a></p><p>Fujian Province, China</p></div></div><div className="container footer-bottom"><span>© 2026 HainaAuto.com · China Used Cars Export</span><span><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link> · <Link href="/cookie">Cookie Policy</Link> · <Link href="/disclaimer">Disclaimer</Link></span></div></footer>}

export function PageHero({kicker,title,copy}:{kicker:string,title:string,copy:string}){return <section className="page-hero"><div className="container"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{copy}</p></div></section>}

export function SortSelect({sort,hidden}:{sort:string,hidden:Record<string,string|undefined>}){return <form method="get">{Object.entries(hidden).map(([k,v])=>v?<input key={k} type="hidden" name={k} value={v}/>:null)}<select name="sort" aria-label="Sort" defaultValue={sort} onChange={(e)=>e.currentTarget.form?.submit()}><option value="latest">Latest listings</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></form>}

export function VehicleCard({v}:{v:VehicleIndexEntry}){const specLine=[v.year,v.mileageKm!=null?formatKm(v.mileageKm):null,v.fuel].filter(Boolean).join(" · ");const candidates=(v.thumbs.length?v.thumbs:v.thumb?[v.thumb]:[]).map(img=>imagePath(v.site,v.id,img));return <article className="car"><Link href={`/vehicles/${v.slug}`}><div className="car-image"><ResilientVehicleImage candidates={candidates} alt={`${v.title} exterior`}/><span>{v.site==="hainaauto"?"HainaAuto":"CN Transit"}</span></div></Link><div className="car-body"><small>{v.bodyType?v.bodyType.toUpperCase():"EXPORT AVAILABLE"}</small><Link href={`/vehicles/${v.slug}`}><h3>{v.title}</h3></Link><p>{specLine||v.location||"Export ready"}</p><div><b>{formatCNY(v.priceCNY)}</b><a href={WHATSAPP_URL}>Inquire →</a></div></div></article>}
