"use client";
/* Brand marks use their source files directly; vehicle imagery uses next/image. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, TouchEvent, useEffect, useRef, useState } from "react";
import {BadgeCheck,Building2,CarFront,ChevronDown,House,Menu,Newspaper,Search,Ship,ShoppingCart,Sparkles,X,type LucideIcon} from "lucide-react";
import {TELEGRAM_URL,WECHAT_CONTACT_URL,WECHAT_USERNAME,WHATSAPP_URL,TelegramIcon,WeChatIcon,WhatsAppIcon} from "./contact-links";
import type { VehicleIndexEntry, VehicleSite } from "../lib/format";
import { formatKm, imagePath } from "../lib/format";
import { ResilientVehicleImage, rankVehicleImages } from "./vehicle-image";
import { ShipmentTicker } from "./shipment-ticker";
import { RevealObserver } from "./reveal";
import { Price } from "./price";
import { useCartSlugs } from "./cart-store";
import { fuelChoiceLabel } from "../lib/fuel-options";

export function Gallery({site,id,images,title}:{site:VehicleSite,id:string,images:string[],title:string}) {
  const [active,setActive]=useState(0);
  const touchStartX=useRef<number|null>(null);
  const gallery=rankVehicleImages(images).map(img=>imagePath(site,id,img));
  const main=gallery[active];
  const go=(delta:number)=>setActive(current=>(current+delta+gallery.length)%gallery.length);
  function finishSwipe(event:TouchEvent<HTMLDivElement>){
    if(touchStartX.current===null) return;
    const distance=event.changedTouches[0].clientX-touchStartX.current;
    touchStartX.current=null;
    if(Math.abs(distance)>=40) go(distance<0?1:-1);
  }
  return <div className="vehicle-gallery"><div className="gallery-main" onTouchStart={(event)=>{touchStartX.current=event.touches[0].clientX}} onTouchEnd={finishSwipe} onTouchCancel={()=>{touchStartX.current=null}}><ResilientVehicleImage candidates={[main,...gallery.filter(img=>img!==main)]} alt={`${title}, photo ${active+1} of ${gallery.length}`} sizes="(max-width: 900px) 100vw, 760px" priority/>{gallery.length>1&&<><button className="gallery-arrow previous" type="button" onClick={()=>go(-1)} aria-label="Previous photo">&#8249;</button><button className="gallery-arrow next" type="button" onClick={()=>go(1)} aria-label="Next photo">&#8250;</button><span className="gallery-count" aria-live="polite">{active+1} / {gallery.length}</span></>}</div>{gallery.length>1&&<div className="gallery-thumbs">{gallery.slice(0,7).map((img,i)=><button key={img} type="button" className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={`Show photo ${i+1}`}><ResilientVehicleImage candidates={[img]} alt="" sizes="120px"/></button>)}</div>}</div>;
}

type NavItem={test:RegExp;href:string;label:string;zh:string;Icon:LucideIcon;children?:readonly NavItem[]};

const nav:readonly NavItem[]=[
  {test:/^\/$/,href:"/",label:"Home",zh:"首页",Icon:House},
  {test:/^\/(vehicles|brands|new-cars)/,href:"/vehicles",label:"Vehicles",zh:"车辆",Icon:CarFront,children:[
    {test:/^\/vehicles/,href:"/vehicles",label:"All vehicles",zh:"全部车辆",Icon:CarFront},
    {test:/^\/brands/,href:"/brands",label:"Used cars",zh:"二手车",Icon:BadgeCheck},
    {test:/^\/new-cars/,href:"/new-cars",label:"New cars",zh:"新车",Icon:Sparkles},
  ]},
  {test:/^\/news/,href:"/news",label:"News",zh:"新闻",Icon:Newspaper},
  {test:/^\/(services|export-process)/,href:"/services",label:"Services",zh:"服务",Icon:Ship},
  {test:/^\/about/,href:"/about",label:"About",zh:"关于我们",Icon:Building2},
];

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
        <div><small>Price</small><b><Price cny={v.priceCNY}/></b></div>
        <span>CIF Included</span>
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
  const [vehiclesOpen,setVehiclesOpen]=useState(false);
  const cartCount=useCartSlugs().length;
  return <>
    <RevealObserver/>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="ah-header"><div className="container">
      <div className="mobile-header-minimal"><div className="mobile-header-brand"><Link href="/" aria-label="HainaAuto home"><img src="/hainaauto-logo.webp" alt="HainaAuto"/></Link></div><form className="mobile-header-search" action="/vehicles"><Search/><input name="q" type="search" placeholder="Search vehicle" aria-label="Search vehicle"/></form><Link className="ah-cart-link" href="/cart" aria-label={`Cart, ${cartCount} vehicle${cartCount===1?"":"s"}`}><ShoppingCart/>{cartCount>0&&<span className="ah-cart-badge">{cartCount}</span>}</Link><Link className="mobile-header-quote" href="/quote">Get Quote</Link></div>
      <div id="mobile-menu-panel" className={`mobile-menu-panel${open?" open":""}`}>{nav.map(({test,href,label,zh,Icon,children})=>{const active=test.test(path);return <div className={`mobile-menu-item${children?" has-children":""}`} key={href}>{children?<button type="button" className={`mobile-menu-link${active?" active":""}`} onClick={()=>setVehiclesOpen(value=>!value)} aria-expanded={vehiclesOpen}><Icon/><span>{label}<small lang="zh-CN" translate="no">{zh}</small></span><ChevronDown className={`menu-chevron${vehiclesOpen?" open":""}`}/></button>:<Link className={`mobile-menu-link${active?" active":""}`} aria-current={active?"page":undefined} href={href} onClick={()=>setOpen(false)}><Icon/><span>{label}<small lang="zh-CN" translate="no">{zh}</small></span></Link>}{children&&<div className={`mobile-menu-submenu${vehiclesOpen?" open":""}`} aria-label="Vehicle categories">{children.map(child=>{const childActive=child.test.test(path);return <Link className={childActive?"active":""} aria-current={childActive?"page":undefined} href={child.href} key={child.href} onClick={()=>{setOpen(false);setVehiclesOpen(false)}}><child.Icon/><span>{child.label}<small lang="zh-CN" translate="no">{child.zh}</small></span></Link>})}</div>}</div>})}</div>
      <div className="ah-header-brand-row">
        <Link className="ah-brand-lockup" href="/"><img src="/hainaauto-logo.webp" alt="HainaAuto" className="ah-header-brand-logo"/><div className="ah-brand-copy"><div className="ah-brand-headline"><span className="ah-brand-title">HAINA AUTO</span><span className="ah-brand-ribbon">China auto export</span></div><span className="ah-brand-lead">Used &amp; new vehicles from China — transparent condition, export-ready docs, worldwide delivery.</span><span className="ah-brand-tagline">◎ <span>From China, to the world</span></span></div></Link>
        <div className="ah-header-aside"><img src="/hainaauto-logo.webp" alt="HainaAuto" className="ah-header-corner-logo"/><div className="ah-header-actions"><Link className="ah-cart-link" href="/cart" aria-label={`Cart, ${cartCount} vehicle${cartCount===1?"":"s"}`}><ShoppingCart/>Cart{cartCount>0&&<span className="ah-cart-badge">{cartCount}</span>}</Link><Link className="ah-btn-gold" href="/quote">Request Quote</Link><Link className="ah-btn-outline" href="/contact">Contact</Link></div><div className="ah-header-meta"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp at +8615032178759"><WhatsAppIcon/> +8615032178759</a><a href="mailto:sales@hainautocn.com">✉ sales@hainautocn.com</a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>WhatsApp</a><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><TelegramIcon/>Telegram</a><a href={WECHAT_CONTACT_URL}><WeChatIcon/>WeChat</a></div></div>
      </div>
      <div className="ah-header-nav-wrap"><button className="menu" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">{open?"×":"☰"}</button><nav className={open?"open":""}><div className="ah-nav-links">{nav.map(({test,href,label,zh,Icon,children})=>{const active=test.test(path);return <div className={`ah-nav-item${children?" has-submenu":""}`} key={href}>{children?<button type="button" className={active?"active":""} onClick={()=>setVehiclesOpen(value=>!value)} aria-expanded={vehiclesOpen}><Icon/><span>{label}<small lang="zh-CN" translate="no">{zh}</small></span><ChevronDown className={`menu-chevron${vehiclesOpen?" open":""}`}/></button>:<Link className={active?"active":""} aria-current={active?"page":undefined} href={href} onClick={()=>setOpen(false)}><Icon/><span>{label}<small lang="zh-CN" translate="no">{zh}</small></span></Link>}{children&&<div className={`ah-nav-submenu${vehiclesOpen?" open":""}`} aria-label="Vehicle categories">{children.map(child=>{const childActive=child.test.test(path);return <Link className={childActive?"active":""} aria-current={childActive?"page":undefined} href={child.href} key={child.href} onClick={()=>{setOpen(false);setVehiclesOpen(false)}}><child.Icon/><span>{child.label}<small lang="zh-CN" translate="no">{child.zh}</small></span></Link>})}</div>}</div>})}</div><div className="ah-nav-end"><form className="ah-header-search" action="/vehicles"><input type="search" name="q" placeholder="Quick search..." aria-label="Search vehicles"/><button type="submit">Search</button></form></div></nav></div>
    </div>
    <ShipmentTicker/>
    </header>
    <main id="main-content">{children}</main><Footer/>
    <aside className="mobile-social-rail" aria-label="Quick contact"><a className="wechat" href={WECHAT_CONTACT_URL} aria-label={`Contact by WeChat: ${WECHAT_USERNAME}`}><WeChatIcon/><small>WeChat</small></a><a className="telegram" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on Telegram"><TelegramIcon/></a><a className="mobile-wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on WhatsApp"><WhatsAppIcon/></a></aside>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><Link className={path==="/"?"active":""} href="/"><House/><span>Home</span></Link><Link className={path.startsWith("/vehicles")?"active":""} href="/vehicles"><CarFront/><span>Vehicles</span></Link><Link className={path.startsWith("/export-process")?"active":""} href="/export-process"><Ship/><span>Export</span></Link><button type="button" className={open?"active":""} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu-panel" aria-label={open?"Close menu":"Open menu"}>{open?<X/>:<Menu/>}<span>Menu</span></button></nav>
    <a className="whatsapp" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contact on WhatsApp"><WhatsAppIcon/></a>
  </>;
}

function Footer(){return <footer className="footer"><div className="container footer-grid"><div className="footer-about"><div className="brand light"><img src="/hainaauto-logo.webp" alt=""/><span>HAINA<b>AUTO</b></span></div><p>Professional Chinese parallel auto exporter serving global buyers with carefully inspected vehicles and end-to-end export services.</p><section className="footer-company-cn" aria-label="公司简介" lang="zh-CN" translate="no"><p>HainaAuto 专注于中国新车与二手车出口，为全球客户提供车辆采购、专业验车、出口文件及国际物流支持。</p></section><div className="social"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>WhatsApp</a><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><TelegramIcon/>Telegram</a><a href={WECHAT_CONTACT_URL}><WeChatIcon/>WeChat</a></div></div><div><h4>User Guide</h4><Link href="/help">FAQ (Help)</Link><Link href="/export-process">Purchase Process</Link><Link href="/vehicles">Vehicle Market</Link><Link href="/news">Industry News</Link></div><div><h4>Export Services</h4><Link href="/services">Logistics Solutions</Link><Link href="/services">Customs Clearance</Link><Link href="/services">Refurbishment</Link><Link href="/services">Overseas Warehousing</Link></div><div><h4>Contact Us</h4><p>Contact Us (24/7)<br/><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">+86 150 3217 8759</a></p><p>Business Email<br/><a href="mailto:sales@hainautocn.com">sales@hainautocn.com</a></p><p>Fujian Province, China</p></div></div><div className="container footer-bottom"><span>© 2026 hainautocn.com · China Used Cars Export</span><span><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link> · <Link href="/cookie">Cookie Policy</Link> · <Link href="/disclaimer">Disclaimer</Link></span></div></footer>}

export function PageHero({kicker,title,copy}:{kicker:string,title:string,copy:string}){return <section className="page-hero"><div className="container"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{copy}</p></div></section>}

export function SortSelect({sort,hidden}:{sort:string,hidden:Record<string,string|undefined>}){return <form method="get">{Object.entries(hidden).map(([k,v])=>v?<input key={k} type="hidden" name={k} value={v}/>:null)}<select name="sort" aria-label="Sort" defaultValue={sort} onChange={(e)=>e.currentTarget.form?.submit()}><option value="latest">Latest listings</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></form>}

export function VehicleCard({v}:{v:VehicleIndexEntry}){const specLine=[v.year,v.mileageKm!=null?formatKm(v.mileageKm):null,fuelChoiceLabel(v.fuel)].filter(Boolean).join(" · ");const candidates=(v.thumbs.length?v.thumbs:v.thumb?[v.thumb]:[]).map(img=>imagePath(v.site,v.id,img));const sourceLabel=v.site==="cntransit"?"CN Transit":"HainaAuto";return <article className="car reveal"><Link href={`/vehicles/${v.slug}`}><div className="car-image"><ResilientVehicleImage candidates={candidates} alt={`${v.title} exterior`}/><span>{sourceLabel}</span></div></Link><div className="car-body"><small>{v.bodyType?v.bodyType.toUpperCase():"EXPORT AVAILABLE"}</small><Link href={`/vehicles/${v.slug}`}><h3>{v.title}</h3></Link><p>{specLine||v.location||"Export ready"}</p><p className="cif-card-note">CIF included: freight + insurance</p><div><b><Price cny={v.priceCNY}/></b><a href={WHATSAPP_URL}>Inquire →</a></div></div></article>}
