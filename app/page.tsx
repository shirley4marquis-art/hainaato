import Link from "next/link";
/* Flags, partner photos and editorial images are intentionally loaded from their source; vehicle previews use next/image. */
/* eslint-disable @next/next/no-img-element */
import {Camera,Car,Clock,CreditCard,FileText,Globe2,Landmark,MessageSquare,PackageCheck,Search,ShieldCheck,Ship,Truck,Wallet} from "lucide-react";
import {Fragment} from "react";
import {NewsSpotlight,SiteShell,VehicleCard} from "./ui";
import {HomeRequestForm} from "./request-form";
import {getBrandAggregates,getFilterOptions,getLatestNewVehicles,getTotalVehicleCount,searchVehicles} from "../lib/vehicles";
import {formatCNY,imagePath} from "../lib/format";
import {ResilientVehicleImage} from "./vehicle-image";

const trustCountries=[["ae","UAE"],["sa","Saudi Arabia"],["ru","Russia"],["kz","Kazakhstan"],["ng","Nigeria"],["ke","Kenya"],["cl","Chile"],["pe","Peru"],["mx","Mexico"],["uz","Uzbekistan"]] as const;
const years=Array.from({length:16},(_,i)=>2026-i);
const prices=[20000,50000,80000,120000,180000,250000,350000,500000];
const arrivalTabs=[["Latest new","/vehicles?condition=new&sort=latest"],["New EV","/vehicles?condition=new&fuel=Electric"],["New hybrid","/vehicles?condition=new&fuel=Hybrid"],["All new cars","/new-cars"]] as const;
const homeVehicleCategories=[
  {title:"SUVs & off-road",type:"Off-road vehicle/SUV",copy:"Versatile family, city and all-terrain vehicles."},
  {title:"Passenger cars",type:"Passenger car",copy:"Comfortable sedans and everyday passenger vehicles."},
  {title:"Commercial vehicles & MPVs",type:"Commercial vehicles/MPVs",copy:"Practical people movers and business-ready vehicles."},
  {title:"Pickup trucks",type:"Pickup truck",copy:"Capable pickups for work, transport and recreation."},
] as const;
const newsSpotlightArticles=[
  {title:"China's monthly vehicle exports exceed 1 million for the first time, with NEVs claiming over half",source:"CarNewsChina",date:"Jul 10, 2026",url:"https://carnewschina.com/2026/07/10/chinas-monthly-vehicle-exports-exceed-1-million-for-the-first-time-with-nevs-claiming-over-half/",image:"https://carnewschina.com/wp-content/uploads/2026/07/e59bbee78987-56-800x450.png"},
  {title:"Chinese automakers overtake Japanese rivals in Europe despite EV tariffs",source:"Nikkei Asia",date:"Jul 2, 2026",url:"https://asia.nikkei.com/business/automobiles/chinese-automakers-overtake-japanese-rivals-in-europe-despite-ev-tariffs",image:"https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F2%2F0%2F4%2F6%2F12676402-1-eng-GB%2F2cc24b0af00b-20260701N-BYD-Thailand.jpg"},
  {title:"China auto exports expected to near 10 million in 2026 amid overseas push",source:"Caixin Global",date:"Jul 2, 2026",url:"https://www.caixinglobal.com/2026-07-02/china-auto-exports-expected-to-near-10-million-in-2026-amid-overseas-push-102459840.html",image:"https://img.caixin.com/2026-07-01/178291076694626_1280_720.jpg"},
  {title:"As Chinese EVs expand global footprint, banks raise export forecasts",source:"South China Morning Post",date:"Jun 26, 2026",url:"https://www.scmp.com/business/china-business/article/3358448/chinese-evs-expand-global-footprint-banks-raise-export-forecasts",image:"https://cdn.i-scmp.com/sites/default/files/styles/1020x680/public/d8/images/canvas/2026/06/26/2805fb04-d09a-4961-98d2-467d68222999_ed392841.jpg"},
  {title:"Innovation and exports will winnow China's car industry in 2026",source:"SCMP Opinion",date:"Jan 6, 2026",url:"https://www.scmp.com/opinion/china-opinion/article/3338636/innovation-and-exports-will-winnow-chinas-car-industry-2026",image:"https://cdn.i-scmp.com/sites/default/files/styles/1020x680/public/d8/images/canvas/2026/01/03/3c5c5c00-180d-488f-958c-662587e63bcc_c4d26281.jpg"},
  {title:"Exclusive: Foreign cars flow to Russia through China, skirting Ukraine war sanctions",source:"Reuters",date:"Feb 12, 2026",url:"https://finance.yahoo.com/news/exclusive-foreign-cars-flow-russia-053235390.html",image:"https://media.zenfs.com/en/reuters.com/f41fa9d6287b30f8b72e9575c1653b54"},
  {title:"China's auto exports are on track to top $100 billion",source:"Gasgoo",date:"Jul 21, 2026",url:"https://autonews.gasgoo.com/articles/news/chinas-auto-exports-are-on-track-to-top-100-billion-2079579257348005889",image:"https://imagecn.gasgoo.com/moblogo/News/UEditor/image/20260721/6392023306391650342108261.png"},
  {title:"China's passenger vehicle export overview (Jan.-May 2026): Brazil leads overall",source:"Gasgoo",date:"Jul 21, 2026",url:"https://autonews.gasgoo.com/articles/market-industry/chinas-passenger-vehicle-export-overview-jan-may-2026-brazil-leads-overallgasgoo-automotive-research-institute-2079442085223571457",image:"https://gascloud.gasgoo.com/production/2026/07/7b45bb10-a775-4df8-9969-2c8c9932f876-1784639914.png"},
  {title:"Middle East conflict fails to halt Chinese autos",source:"Gasgoo",date:"Mar 7, 2026",url:"https://autonews.gasgoo.com/articles/news/middle-east-conflict-fails-to-halt-chinese-autos-2030076072719134721",image:"https://imagecn.gasgoo.com/moblogo/News/UEditor/image/20260305/6390832390191594964904539.png"},
  {title:"China overtakes Japan as global vehicle export leader",source:"Automotive Manufacturing Solutions",date:"Mar 5, 2026",url:"https://www.automotivemanufacturingsolutions.com/strategy/china-overtakes-japan-as-global-vehicle-export-leader/2621926",image:"https://image.automotivemanufacturingsolutions.com/2621941.webp?imageId=2621941&width=960&height=548&format=jpg"},
  {title:"Automakers' share in China NEV exports in June: BYD leads with 34.2%, Tesla 4th with 7.2%",source:"CnEVPost",date:"Jul 10, 2026",url:"https://cnevpost.com/2026/07/10/automakers-share-china-nev-exports-jun-2026/",image:"https://cnevpost.com/wp-content/uploads/2026/07/2026071007175097.jpg"},
  {title:"China achieves record NEV share — exports drive growth",source:"Electrive.com",date:"Jun 10, 2026",url:"https://www.electrive.com/2026/06/10/china-achieves-record-nev-share-exports-drive-growth/",image:"https://www.electrive.com/media/2026/04/byd-auto-china-2026-1-1400x934.jpg"},
  {title:"China's EV makers are taking over the European factories Ford and Nissan can't fill",source:"Rest of World",date:"Jul 1, 2026",url:"https://restofworld.org/2026/chinese-ev-europe-factory-takeover-tariffs/",image:"https://fastly.restofworld.org/uploads/2026/06/iStock-154924807.jpg?width=800"},
  {title:"Why the EU is ready to drop high tariffs on China-made EVs",source:"Rest of World",date:"Jan 15, 2026",url:"https://restofworld.org/2026/why-the-eu-is-ready-to-drop-high-tariffs-on-china-made-evs/",image:"https://fastly.restofworld.org/uploads/2026/01/GettyImages-2255401505.jpg?width=800"},
  {title:"BYD targets 1.3 million overseas vehicle sales in 2026 after delivering 1.04 million in 2025",source:"CarNewsChina",date:"Jan 25, 2026",url:"https://carnewschina.com/2026/01/25/byd-targets-1-3-million-overseas-vehicle-sales-in-2026-after-delivering-1-04-million-in-2025/",image:"https://carnewschina.com/wp-content/uploads/2026/01/64fcb5889c5bfa48039c5dbf5e5cba7a-800x450.jpg"},
  {title:"BYD launches its first Japan electric minicar, challenging local stronghold",source:"Nikkei Asia",date:"Jul 28, 2026",url:"https://asia.nikkei.com/business/automobiles/byd-launches-its-first-japan-electric-minicar-challenging-local-stronghold",image:"https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F4%2F1%2F8%2F2%2F12912814-1-eng-GB%2Ffabd6411d449-b.jpg"},
  {title:"BYD begins passenger car trial production in Hungary",source:"Electrive.com",date:"Feb 2, 2026",url:"https://www.electrive.com/2026/02/02/byd-begins-trial-production-of-passenger-cars-in-hungary/",image:"https://www.electrive.com/media/2026/02/byd-logo.jpeg"},
  {title:"BYD, Chery & GWM battle for Nissan–Mercedes Mexico's 230,000-unit plant",source:"CarNewsChina",date:"Feb 13, 2026",url:"https://carnewschina.com/2026/02/13/byd-chery-gwm-battle-for-nissan-mercedes-mexicos-230000-unit-plant/",image:"https://carnewschina.com/wp-content/uploads/2026/02/0b5b357cdfad69e4b5ac8b4b0db876de-800x450.jpg"},
  {title:"Geely gains European production foothold through joint venture with Ford in Spain",source:"CnEVPost",date:"Jul 23, 2026",url:"https://cnevpost.com/2026/07/23/geely-european-production-foothold-jv-ford-spain/",image:"https://cnevpost.com/wp-content/uploads/2026/07/2026072312063198.jpg"},
  {title:"Zeekr 9X global rollout starts June, Europe entry set for Q4 2026; 8X follows late 2026",source:"CarNewsChina",date:"Apr 30, 2026",url:"https://carnewschina.com/2026/04/30/zeekr-9x-global-rollout-starts-june-europe-entry-set-for-q4-2026-8x-follows-late-2026/",image:"https://carnewschina.com/wp-content/uploads/2026/04/img_20260424_151158-800x462.jpg"},
  {title:"Xpeng announces entry into 5 European countries, pressing ahead with global expansion",source:"CnEVPost",date:"Sep 26, 2025",url:"https://cnevpost.com/2025/09/26/xpeng-entry-into-5-european-countries/",image:"https://cnevpost.com/wp-content/uploads/2025/09/2025092602202766.jpg"},
  {title:"Chinese EV makers turn Korea into global test bed",source:"The Investor",date:"Jul 20, 2026",url:"https://www.theinvestor.co.kr/article/10814060",image:"https://wimg.heraldcorp.com/news/cms/2026/07/20/news-p.v1.20260720.1b98398acad740408172e4d8592d8581_P1.png"},
  {title:"Nissan to start shipping EVs from China in 2026",source:"Nikkei Asia",date:"Jul 4, 2025",url:"https://asia.nikkei.com/business/automobiles/nissan-to-start-shipping-evs-from-china-in-2026",image:"https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F7%2F3%2F3%2F6%2F49776337-1-eng-GB%2Fphoto_SXM2025070300006301.jpg"},
  {title:"Chinese parts makers aim to break open Japan's close-knit auto industry",source:"Nikkei Asia",date:"Jul 22, 2026",url:"https://asia.nikkei.com/business/automobiles/chinese-parts-makers-aim-to-break-open-japan-s-close-knit-auto-industry",image:"https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F3%2F8%2F5%2F4%2F12824583-2-eng-GB%2Fa56049cd5c04-photo_SXM2026061600012037.jpg"},
  {title:"Chinese automakers reach crossroads after conquering export markets",source:"Nikkei Asia",date:"May 3, 2025",url:"https://asia.nikkei.com/spotlight/big-in-asia/chinese-automakers-reach-crossroads-after-conquering-export-markets",image:"https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F9%2F3%2F4%2F8%2F49438439-3-eng-GB%2FCropped-1746091065AP25118241800328.jpg"},
  {title:"Leapmotor enters Brazil and Chile, bolstered by Stellantis partnership",source:"CarNewsChina",date:"Nov 26, 2025",url:"https://carnewschina.com/2025/11/26/leapmotor-enters-brazil-and-chile-bolstered-by-stellantis-partnership/",image:"https://carnewschina.com/wp-content/uploads/2025/11/e59bbee78987-236-e1764158596101.png"},
  {title:"Li Auto accelerates its overseas expansion, enters Saudi Arabia, UAE, eyes Europe",source:"CarNewsChina",date:"Apr 26, 2026",url:"https://carnewschina.com/2026/04/26/li-auto-accelerates-its-overseas-expansion-enters-saudi-arabia-uae-eyes-europe/",image:"https://carnewschina.com/wp-content/uploads/2026/04/liautolineup-800x482.jpg"},
  {title:"Mazda 6e RHD production cars spotted as EV liftback prepped for Thai and Australian deliveries in July",source:"CarNewsChina",date:"Jun 24, 2026",url:"https://carnewschina.com/2026/06/24/mazda-6e-rhd-production-cars-spotted-as-ev-liftback-prepped-for-thai-and-australian-deliveries-in-july/",image:"https://carnewschina.com/wp-content/uploads/2026/06/6e_f-800x450.jpg"},
  {title:"GWM Ora 5 launches in Europe this summer",source:"Electrive.com",date:"Apr 28, 2026",url:"https://www.electrive.com/2026/04/28/gwm-ora-5-launches-in-europe-this-summer/",image:"https://www.electrive.com/media/2026/04/great-wall-gwm-ora-5-2026-1-1400x933.jpg"},
  {title:"Denza Z9 GT with flash charging and 1,036 km range launches in Europe starting from €115,000",source:"CarNewsChina",date:"Apr 9, 2026",url:"https://carnewschina.com/2026/04/09/denza-z9-gt-with-flash-charging-and-1036-km-range-launches-in-europe-starting-from-115000-euro/",image:"https://carnewschina.com/wp-content/uploads/2026/04/e59bbee78987-116-e1775708694947.png"},
  {title:"China overtakes Japan as top car importer to Australia for first time",source:"CarNewsChina",date:"Apr 3, 2026",url:"https://carnewschina.com/2026/04/03/china-overtakes-japan-as-top-car-importer-to-australia-for-first-time/",image:"https://carnewschina.com/wp-content/uploads/2026/04/e59bbee78987-35-e1775199460476-800x450.png"},
  {title:"Top Chinese vehicle import countries ranking in 2025: Mexico, Russia, UAE",source:"CarNewsChina",date:"Jan 25, 2026",url:"https://carnewschina.com/2026/01/25/top-chinese-vehicle-import-countries-ranking-in-2025-mexico-russia-uae/",image:"https://carnewschina.com/wp-content/uploads/2026/01/screenshot_20260125_062722_chrome-800x448.jpg"},
  {title:"How China is shipping cars when specialized carriers aren't enough",source:"CarNewsChina",date:"Jul 6, 2026",url:"https://carnewschina.com/2026/07/06/how-china-is-shipping-cars-when-specialized-carriers-arent-enough/",image:"https://carnewschina.com/wp-content/uploads/2026/07/e59bbee78987-20-e1783328806720-800x450.png"},
] as const;

const whyChoose=[[Search,"Professional Vehicle Inspection","Every vehicle is inspected before shipment."],[Wallet,"Competitive Factory Pricing","Direct sourcing keeps quotes close to factory price."],[Ship,"Worldwide Shipping","FOB, CIF and DDP shipping solutions."],[FileText,"Complete Export Documents","All documents prepared for smooth clearance."],[ShieldCheck,"Secure Payment","T/T, L/C and other secure payment methods."],[Globe2,"Multilingual Support","English, Arabic, Russian & Spanish support."]] as const;
const processSteps=[["1",MessageSquare,"Inquiry","Share requirements"],["2",FileText,"Quotation","Get clear pricing"],["3",Search,"Inspection","QC & photos"],["4",CreditCard,"Payment","Secure settlement"],["5",Truck,"Shipping","RoRo / container"],["6",Landmark,"Customs Clearance","Export docs"],["7",PackageCheck,"Delivery","Arrival support"]] as const;
const regions=[["Middle East",["UAE","Saudi Arabia","Oman"]],["Africa",["Nigeria","Kenya","Ghana"]],["CIS & Central Asia",["Russia","Kazakhstan","Uzbekistan"]],["Latin America",["Chile","Peru","Mexico"]],["Southeast Asia",["Philippines","Vietnam","Indonesia"]],["Eastern Europe",["Poland","Georgia","Belarus"]]] as const;
const companyPhotos=["https://cntransit.cn/uploads/visit_5c856c9cdfaec3e8.jpg","https://cntransit.cn/uploads/visit_e4c2d879f81cda1d.jpg","https://cntransit.cn/uploads/visit_03e6f0c1a20573b5.jpg","https://cntransit.cn/uploads/visit_f702494f5cd6dcad.jpg","https://cntransit.cn/uploads/visit_28a26165a6c45538.jpg","https://cntransit.cn/uploads/visit_e65ff07f4cdc1547.jpg"] as const;
const guides=[["https://img.hainaauto.com/vehicle/art_4c1be6c6236b9184.webp","Xpeng GX: The Smart Electric SUV Redefining China Export to Russia","A closer look at the technology, range and export appeal of China's new-generation electric SUV.","/news"],["https://img.hainaauto.com/vehicle/art_e3a5e0b9a31760d7.webp","China's Auto Export Surge to Russia: A Practical Guide for Importers","Market trends, shipping choices, documentation and practical steps for international vehicle buyers.","/news"]] as const;
const testimonials=[["https://cntransit.cn/images/avatars/client-1.png","Ahmed","Dubai, UAE","I purchased 12 BYD vehicles from HainaAuto. The communication was excellent and the vehicles arrived on time. Highly recommended!"],["https://cntransit.cn/images/avatars/client-2.png","Ivan Petrov","Moscow, Russia","Professional team and very fast response. The inspection report was detailed and the shipping was smooth."],["https://cntransit.cn/images/avatars/client-3.png","Carlos Gomez","Santiago, Chile","Great experience working with HainaAuto. They handled everything perfectly from inspection to delivery."]] as const;
const faqs=[["What is HainaAuto?","A China-based vehicle export platform connecting international buyers with inspected new and used vehicles."],["How do I reserve a vehicle?","Note the stock ID or link, then request confirmation of availability, specification and export terms."],["Can I inspect a vehicle before purchase?","Yes. On-site or third-party inspection can be arranged before booking and shipment."],["How long does shipping take?","Typically 2–6 weeks after departure, depending on destination and RoRo or container routing."],["What payment methods do you accept?","T/T, L/C and other agreed secure settlement methods."],["Can you help with customs clearance?","Yes — our team prepares full export documentation and coordinates with your customs broker."]];

const homeBrandLogo:Record<string,string>={"Jietu":"jetour","Jetour":"jetour","Li":"li-auto","Li Auto":"li-auto","Mercedes-Benz":"mercedes-benz","Lynk":"lynk-co","Lynk & Co":"lynk-co","Great":"great-wall","Great Wall":"great-wall","Xpeng":"xpeng","XPeng":"xpeng","JiKrypton":"zeekr"};
const brandLogoSlug=(brand:string)=>homeBrandLogo[brand]??brand.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export default function Home(){
  const latest=getLatestNewVehicles(10);
  const brands=getBrandAggregates(12);
  const options=getFilterOptions();
  const totalVehicles=getTotalVehicleCount();
  const categoryRows=homeVehicleCategories.map(category=>({...category,vehicles:searchVehicles({type:category.type,availability:"available",pageSize:4}).vehicles}));

  return <SiteShell>
    <section className="ref-hero">
      <div className="container">
        <div className="hero-flex">
          <div className="ref-hero-copy">
            <span className="ref-kicker">Your trusted partner for vehicle export from China</span>
            <h1>Import quality vehicles from China</h1>
            <p>Direct access to {totalVehicles.toLocaleString()}+ export-ready vehicles. Professional inspection, competitive pricing and worldwide delivery.</p>
            <div className="ref-actions"><Link className="ref-primary" href="/quote">Get free quote</Link><Link className="ref-outline" href="/vehicles">Browse inventory</Link></div>
          </div>
          <NewsSpotlight articles={newsSpotlightArticles}/>
        </div>
      </div>
    </section>

    <section className="mobile-home" aria-label="Mobile vehicle marketplace">
      <form className="mobile-home-search" action="/vehicles"><input name="q" type="search" placeholder="Search by brand, model or keyword" aria-label="Search vehicles"/><button type="submit">Search</button></form>
      <div className="mobile-trust-card">
        <article><span><ShieldCheck/></span><div><b>Business Verified</b><p>Documented exporters &amp; partners</p></div></article>
        <article><span><Camera/></span><div><b>On-site Inspection</b><p>Condition reports before booking</p></div></article>
        <article><span><Globe2/></span><div><b>Export Ready</b><p>Logistics &amp; customs support</p></div></article>
      </div>
      <div className="mobile-gold-card"><h2>China Auto Export Gold Partner</h2><p>New &amp; used tracking · Safe pay workflow · Join the export flow</p><Link href="/vehicles">View listings</Link></div>
      <div className="mobile-arrivals"><header><h2>Latest arrivals</h2><p>Thousands of vehicle listings updated every day</p><Link href="/vehicles">Browse all vehicles →</Link></header><div>{latest.slice(0,5).map(v=><Link className="mobile-arrival-row" href={`/vehicles/${v.slug}`} key={v.slug}><span className="mobile-arrival-image"><ResilientVehicleImage candidates={(v.thumbs.length?v.thumbs:v.thumb?[v.thumb]:[]).map(img=>imagePath(v.site,v.id,img))} alt={`${v.title} exterior`} sizes="140px" minimumWidth={90} minimumHeight={60}/></span><span><b>{v.title}</b><small>{[v.year,v.mileageKm,v.fuel].filter(Boolean).join(" · ")}</small></span><strong>{formatCNY(v.priceCNY)}</strong></Link>)}</div></div>
    </section>

    <section className="trust-bar trust-bar-before"><div className="container"><h2>Trusted by global buyers</h2><ul className="trust-flags">{trustCountries.map(([code,name])=><li key={code}><img src={`/flags/${code}.svg`} alt=""/>{name}</li>)}<li><Link href="/services">More →</Link></li></ul></div></section>

    <div className="stats-bridge"><div className="container"><div className="stats-card"><ul>
      <li><span className="stats-icon"><Car size={16}/></span><div><p className="stats-num">{totalVehicles.toLocaleString()}+</p><p className="stats-label">Vehicles Available<br/>Updated Daily</p></div></li>
      <li><span className="stats-icon"><Globe2 size={16}/></span><div><p className="stats-num">80+</p><p className="stats-label">Countries Served</p></div></li>
      <li><span className="stats-icon"><Ship size={16}/></span><div><p className="stats-num">15</p><p className="stats-label">Export Ports</p></div></li>
      <li><span className="stats-icon"><Clock size={16}/></span><div><p className="stats-num">24H</p><p className="stats-label">Fast Response</p></div></li>
    </ul></div></div></div>

    <section className="trust-bar"><div className="container">
      <h2>Trusted by global buyers</h2>
      <ul className="trust-flags">
        {trustCountries.map(([code,name])=><li key={code}><img src={`/flags/${code}.svg`} alt=""/>{name}</li>)}
        <li><Link href="/services">More →</Link></li>
      </ul>
    </div></section>

    <section className="search-zone"><div className="container">
      <div className="section-head"><span className="eyebrow">FIND YOUR NEXT VEHICLE</span><h2>Search the catalogue</h2><p>Filter thousands of export-ready vehicles by brand, model, year and price.</p></div>
      <form className="search-form" action="/vehicles">
        <div className="search-grid">
          <select name="brand" defaultValue="" aria-label="Brand"><option value="">All brands</option>{options.brands.map(b=><option key={b} value={b}>{b}</option>)}</select>
          <input name="model" type="text" placeholder="Model" aria-label="Model"/>
          <select name="minYear" defaultValue="" aria-label="Year from"><option value="">Year from</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <select name="maxYear" defaultValue="" aria-label="Year to"><option value="">Year to</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <select name="minPrice" defaultValue="" aria-label="Min price"><option value="">Min price</option>{prices.map(p=><option key={p} value={p}>¥{p.toLocaleString()}</option>)}</select>
          <select name="maxPrice" defaultValue="" aria-label="Max price"><option value="">Max price</option>{prices.map(p=><option key={p} value={p}>¥{p.toLocaleString()}</option>)}</select>
          <button type="submit">Search</button>
        </div>
      </form>
      <div className="quick-pills"><b>Popular searches</b>{brands.slice(0,6).map(b=><Link key={b.brand} href={`/vehicles?brand=${encodeURIComponent(b.brand)}`}>{b.brand}</Link>)}</div>
    </div></section>

    <section className="section home-popular-brands" style={{paddingTop:0}}><div className="container">
      <div className="section-head row"><div><span className="eyebrow">SOURCED DIRECT</span><h2>Popular brands</h2></div><Link className="text-link" href="/brands">View more →</Link></div>
      <div className="brand-cloud">{brands.map(b=><Link key={b.brand} href={`/vehicles?brand=${encodeURIComponent(b.brand)}`}><span className="home-brand-logo"><img src={`/brand-logos/${brandLogoSlug(b.brand)}.png`} alt={`${b.brand} logo`} width="140" height="76" loading="eager" decoding="sync"/></span><b>{b.brand}</b><small>{b.count.toLocaleString()} listed</small></Link>)}</div>
    </div></section>

    <section className="section vehicle-categories"><div className="container">
      <div className="section-head"><span className="eyebrow">SHOP BY VEHICLE TYPE</span><h2>Explore four popular categories</h2><p>Browse export-ready inventory organized by the vehicle style that fits your needs.</p></div>
      <div className="vehicle-category-rows">{categoryRows.map(category=><section className="vehicle-category-row" key={category.type}>
        <header><div><h3>{category.title}</h3><p>{category.copy}</p></div><Link href={`/vehicles?type=${encodeURIComponent(category.type)}`}>View all {category.title.toLowerCase()} →</Link></header>
        <div className="vehicle-category-grid">{category.vehicles.map(vehicle=><VehicleCard key={vehicle.slug} v={vehicle}/>)}</div>
      </section>)}</div>
    </div></section>

    <section className="section arrivals reference-arrivals"><div className="container">
      <div className="section-head row"><div><span className="eyebrow">FRESH INVENTORY</span><h2>Latest new-car arrivals</h2><p>Brand-new, available vehicles from our periodically synchronized catalogue.</p></div><Link className="text-link" href="/new-cars">View all new cars →</Link></div>
      <div className="arrivals-tabs">{arrivalTabs.map(([label,href],i)=><Link className={i===0?"active":""} href={href} key={label}>{label}</Link>)}</div>
      <div className="arrival-grid">{latest.map(v=><VehicleCard key={v.slug} v={v}/>)}</div>
    </div></section>

    <section className="export-hub"><div className="container">
      <div className="hub-grid">
        <div className="hub-card">
          <h3>Why Choose HainaAuto</h3>
          <div><ul className="hub-why-list">{whyChoose.map(([Icon,title,desc])=><li key={title}><span className="hub-why-icon"><Icon size={14}/></span><div><b>{title}</b><p>{desc}</p></div></li>)}</ul></div>
        </div>
        <div className="hub-card">
          <h3>Our Export Process</h3>
          <div><div className="hub-process">
            <div className="hub-process-row">
              {processSteps.slice(0,4).map(([num,Icon,title,desc],i)=><Fragment key={num}>{i>0&&<span className="hub-arrow">→</span>}<div className="hub-step"><span className="hub-step-icon"><Icon size={18}/><b>{num}</b></span><span>{title}</span><small>{desc}</small></div></Fragment>)}
            </div>
            <div className="hub-process-row">
              {processSteps.slice(4,7).map(([num,Icon,title,desc],i)=><Fragment key={num}>{i>0&&<span className="hub-arrow">←</span>}<div className="hub-step"><span className="hub-step-icon"><Icon size={18}/><b>{num}</b></span><span>{title}</span><small>{desc}</small></div></Fragment>)}
            </div>
          </div></div>
          <Link className="hub-process-cta" href="/services">Learn More About Process →</Link>
        </div>
        <div className="hub-card">
          <h3>Export Destinations</h3>
          <div><div className="hub-dest">
            <div className="hub-dest-map"/>
            <ul className="hub-dest-list">{regions.map(([region,countries])=><li key={region}><b><span className="hub-dest-dot"/>{region}</b><span>{countries.join(" · ")}</span></li>)}</ul>
          </div></div>
        </div>
      </div>
    </div></section>

    <section className="gold-partner"><div className="container"><div><span>HAINAAUTO EXPORT NETWORK</span><h2>China auto export gold partner</h2><p>New &amp; used tracking · Safe pay workflow · Join the export flow</p></div><Link href="/vehicles">View listings →</Link></div></section>

    <section className="client-strength"><div className="container">
      <div className="client-strength-grid">
        <div>
          <h3>What Our Clients Say</h3>
          <div className="mini-testimonials">{testimonials.map(([avatar,name,place,quote])=><article className="mini-testimonial" key={name}><div className="mini-testimonial-head"><img src={avatar} alt=""/><div><b>{name}</b><span>{place}</span></div></div><div className="mini-testimonial-stars">★★★★★</div><p>&ldquo;{quote}&rdquo;</p></article>)}</div>
        </div>
        <div>
          <h3>Company Strength</h3>
          <div className="strength-gallery">{companyPhotos.map(src=><img key={src} src={src} alt="HainaAuto facility"/>)}</div>
        </div>
      </div>
    </div></section>

    <section className="submit-requirements"><div className="container">
      <div className="section-head row"><div><span className="eyebrow">GET IN TOUCH</span><h2>Submit requirements</h2></div></div>
      <div className="submit-grid">
        <div className="dealer-banner">
          <span className="eyebrow">FOR DEALERS</span>
          <h2>Bulk Vehicle Purchase</h2>
          <ul>
            <li><b>✓</b>Wholesale pricing</li>
            <li><b>✓</b>Stock sourcing</li>
            <li><b>✓</b>Export documents</li>
            <li><b>✓</b>Shipping support</li>
          </ul>
          <Link href="/dealer-programme">Request dealer account →</Link>
        </div>
        <HomeRequestForm/>
      </div>
    </div></section>

    <section className="section home-news-guides"><div className="container">
      <div className="section-head row"><div><span className="eyebrow">BUYER RESOURCES</span><h2>Latest export guides</h2></div><Link className="text-link" href="/news">View all guides →</Link></div>
      <div className="news-grid">{guides.map((g,i)=><article className={i===0?"news featured":"news"} key={g[1]}><img src={g[0]} alt=""/><div><span className="eyebrow">EXPORT GUIDE</span><h2>{g[1]}</h2><p>{g[2]}</p><Link href={g[3]}>Read more →</Link></div></article>)}</div>
    </div></section>

    <section className="home-faq section"><div className="container">
      <div className="section-head"><span className="eyebrow">BUYER GUIDE</span><h2>Frequently asked questions</h2><p>Everything you need to know about sourcing and importing vehicles from China.</p></div>
      <div className="faq-trust"><span><b>✓</b>{totalVehicles.toLocaleString()}+ Vehicles Available</span><span><b>✓</b>Professional Inspection</span><span><b>✓</b>Worldwide Shipping</span></div>
      <div className="faq-preview">{faqs.map(x=><details key={x[0]}><summary>{x[0]}</summary><p>{x[1]}</p></details>)}</div>
    </div></section>

    <section className="final-cta"><div className="container">
      <h2>Ready to import vehicles from China?</h2>
      <p>Get factory-direct prices, professional inspection and complete export solutions.</p>
      <Link href="/quote">Get free quote →</Link>
    </div></section>
  </SiteShell>;
}
