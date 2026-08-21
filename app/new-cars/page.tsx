"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteShell } from "../ui";
import { ResilientVehicleImage } from "../vehicle-image";
import { Price } from "../price";
import styles from "./new-cars.module.css";

type Vehicle = {
  image: string;
  title: string;
  stock: string;
  msrpCNY: number;
  priceCNY: number | null;
  note?: string;
  pinned?: boolean;
};

const PAGE_SIZE = 12;

const commonNote = "Displayed HAINA AUTO prices are treated as CIF by default: vehicle, international ocean freight and marine insurance are included unless the written quotation is explicitly marked FOB. Destination-country duties, nationalization, registration, plates and local charges are separate.";

const authorized: Vehicle[] = [
  {image:"https://img.hainaauto.com/vehicle/newcar_da7a7c6c313bedaa.webp",title:"Xiaomi YU7 2025 Long Range Rear Drive Edition",stock:"new car",msrpCNY:253500,priceCNY:155400,note:"The export documents have been completed and you can leave China at any time. new car",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_c223dc6feffa8c24.webp",title:"Zhengzhou Nissan Rich Pickup Automatic Diesel 4WD",stock:"White",msrpCNY:116800,priceCNY:61272},
  {image:"https://img.hainaauto.com/vehicle/col_0c748a461c06f979.webp",title:"Zhengzhou Nissan Fengtan PHEV 135km AWD Ultimate Edition",stock:"Gray/Black/Yellow",msrpCNY:219900,priceCNY:78660},
  {image:"https://img.hainaauto.com/vehicle/col_eeba00e929bbeb08.webp",title:"Zhengzhou Nissan Z9 PHEV 135km AWD Explore Edition",stock:"Yellow/Gray/Black",msrpCNY:179900,priceCNY:95634},
  {image:"https://img.hainaauto.com/vehicle/col_2283ac1477e80687.webp",title:"Changan 4th Generation CS75 Plus 1.5T New Blue Whale Smart Ultimate Edition",stock:"White & Gray",msrpCNY:121900,priceCNY:56304},
  {image:"https://img.hainaauto.com/vehicle/col_6f8650670315ce54.webp",title:"Changan CS75 Pro 1.5T Enjoy Edition",stock:"White & Gray",msrpCNY:113900,priceCNY:45954},
  {image:"https://img.hainaauto.com/vehicle/col_dd550c03561fec50.webp",title:"Changan CS75 Pro 1.5T Advance Edition",stock:"White & Gray",msrpCNY:119900,priceCNY:47610},
  {image:"https://img.hainaauto.com/vehicle/col_aec2e4fb98d22d17.webp",title:"Changan Hunter Knight Flagship Dual-Motor AWD Standard Bed Extended Range",stock:"White/Mecha Gray/Star Moon Gray",msrpCNY:177900,priceCNY:91080},
  {image:"https://img.hainaauto.com/vehicle/col_75c2708556349172.webp",title:"Changan Q07 215 Flagship Plus",stock:"White/Black/Black/Orange",msrpCNY:171800,priceCNY:71622},
  {image:"https://img.hainaauto.com/vehicle/col_c8e8b2de91f9c99b.webp",title:"Changan Deepal S07 230 Ultra",stock:"Gray/Orange/Gray/Purple/Black/Purple",msrpCNY:166900,priceCNY:76590},
  {image:"https://img.hainaauto.com/vehicle/col_a015d59749c3ac9e.webp",title:"Changan Deepal SL03 Extended Range Elite Edition",stock:"White/Gray",msrpCNY:129900,priceCNY:50922},
  {image:"https://img.hainaauto.com/vehicle/col_158c18aea4c6cd61.webp",title:"Changan 4th Generation CS55 Plus New Blue Whale 1.5T Lead Edition",stock:"White/Gray/Black",msrpCNY:98900,priceCNY:46782},
];

const modified: Vehicle[] = [
  {image:"https://img.hainaauto.com/vehicle/col_9ee5a3b29e624357.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Grace Pro (zhiya pro)",stock:"Red",msrpCNY:153800,priceCNY:86093,pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_3cf55a3b0ecd8ada.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Comfort Model",stock:"White/Gray",msrpCNY:125800,priceCNY:70180,pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_b12c04b2e03097cb.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Edition (zhishang)",stock:"Blue",msrpCNY:135800,priceCNY:73036,pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_5f94e7952332352a.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Edition (zhiya) + Comfort Package",stock:"White/Black",msrpCNY:149800,priceCNY:null,pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_e8d11aa334b87897.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Pro (zhishang pro)",stock:"White/Gray",msrpCNY:139800,priceCNY:75077,pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_adad5e2b30e35e12.webp",title:"Highlander 2026 380T 4WD Prestige Edition 7-seater",stock:"Black, white",msrpCNY:295800,priceCNY:153744,note:"2.0T 248 hp L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_f06aff88b61a185b.webp",title:"Geely Binyue L (Geely Coolray) 2025 Model 1.5TD DCT Star Edition",stock:"Black top, grey exterior",msrpCNY:96800,priceCNY:48720,note:"1.5T 181HP L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_a08d84497cf66c58.webp",title:"Geely Binyue (Geely Coolray) 2025 1.5L Manual Super Edition",stock:"Black top, grey exterior",msrpCNY:66800,priceCNY:33180,note:"1.5L 126hp L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_a31575d3fc9e020c.webp",title:"FAW Toyota Corolla Hybrid Elite Edition",stock:"White/Black/Black/Black/Silver/Black",msrpCNY:136800,priceCNY:60444},
  {image:"https://img.hainaauto.com/vehicle/col_529cc5f6ba6a3ed6.webp",title:"FAW Toyota Frontlander Hybrid Elite Edition",stock:"White Exterior/Black Interior",msrpCNY:149800,priceCNY:64170},
  {image:"https://img.hainaauto.com/vehicle/col_1f63be1e35a4e9bb.webp",title:"FAW Toyota RAV4 Gasoline Deluxe Edition",stock:"White/Black",msrpCNY:189800,priceCNY:105570},
  {image:"https://img.hainaauto.com/vehicle/col_f4c5ea29913dd9a3.webp",title:"FAW-Volkswagen Jetta Automatic Pioneer Edition (Shadow Play Edition)",stock:"Black/White",msrpCNY:98900,priceCNY:50508},
];

function filterVehicles(vehicles: Vehicle[], query: string): Vehicle[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return vehicles;
  return vehicles.filter((v) => {
    const haystack = `${v.title} ${v.stock} ${v.note ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function VehicleCard({vehicle,view}:{vehicle:Vehicle;view:"grid"|"list"}) {
  return <article className={`${styles.card} ${view === "list" ? styles.listCard : ""} ${vehicle.pinned ? styles.pinned : ""}`}>
    <div className={styles.media}>
      {vehicle.pinned && <span className={styles.pin}>⌖ Pinned</span>}
      <ResilientVehicleImage candidates={[vehicle.image]} alt={`${vehicle.title} — new car for export from China`} sizes={view === "list" ? "245px" : "(max-width: 650px) 100vw, (max-width: 991px) 50vw, 33vw"}/>
      <time className={styles.date} dateTime="2026-05-26">2026-05-26</time>
    </div>
    <div className={styles.cardBody}>
      <h3>{vehicle.title}</h3>
      {vehicle.note && <p className={styles.vehicleNote}>{vehicle.note}</p>}
      <p className={styles.stock}><span>Stock</span> <b>{vehicle.stock}</b></p>
      <dl>
        <div><dt>MSRP (reference)</dt><dd><Price cny={vehicle.msrpCNY}/></dd></div>
        <div><dt>Selling price</dt><dd className={styles.price}><Price cny={vehicle.priceCNY}/></dd></div>
      </dl>
      <p className={styles.cifBadge}>CIF included</p>
      <p className={styles.disclaimer}>{vehicle.note?.includes("export documents") ? vehicle.note : commonNote}</p>
      <Link className={styles.cardLink} href="/contact#contact" aria-label={`View details: ${vehicle.title}`}>View details</Link>
    </div>
  </article>
}

function Pagination({page,totalPages,onChange}:{page:number;totalPages:number;onChange:(page:number)=>void}) {
  return <nav className={styles.pagination} aria-label="Pagination">
    <button disabled={page===1} onClick={()=>onChange(page-1)}>Previous</button>
    {Array.from({length:totalPages},(_,i)=>i+1).map((n)=>
      <button key={n} className={n===page?styles.current:""} onClick={()=>onChange(n)} aria-current={n===page?"page":undefined}>{n}</button>
    )}
    <button disabled={page===totalPages} onClick={()=>onChange(page+1)}>Next</button>
  </nav>
}

function CatalogSection({id,title,vehicles,view}:{id:string;title:string;vehicles:Vehicle[];view:"grid"|"list"}) {
  const [page,setPage]=useState(1);
  const total=vehicles.length;
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const start=(page-1)*PAGE_SIZE;
  const pageItems=vehicles.slice(start,start+PAGE_SIZE);
  return <section id={id} className={styles.catalogSection}>
    <div className={styles.sectionTitle}><span>♢</span><h2>{title}</h2></div>
    {total===0
      ? <p className={styles.count}>No vehicles match your search in this section.</p>
      : <>
        <div className={view === "grid" ? styles.vehicleGrid : styles.vehicleList}>{pageItems.map(vehicle=><VehicleCard key={vehicle.title} vehicle={vehicle} view={view}/>)}</div>
        {totalPages>1 && <Pagination page={page} totalPages={totalPages} onChange={setPage}/>}
        <p className={styles.count}>{title}: showing {start+1}–{Math.min(start+PAGE_SIZE,total)} of {total}</p>
      </>
    }
  </section>
}

function NewCarsContent(){
  const searchParams=useSearchParams();
  const query=searchParams.get("q") ?? "";
  const [view,setView]=useState<"grid"|"list">("grid");
  const filteredAuthorized=useMemo(()=>filterVehicles(authorized,query),[query]);
  const filteredModified=useMemo(()=>filterVehicles(modified,query),[query]);
  const noResults=query.trim()!=="" && filteredAuthorized.length===0 && filteredModified.length===0;

  return <SiteShell>
    <section className={styles.hero}>
      <div className="container">
        <p className={styles.kicker}>NEW CARS EXPORT</p>
        <h1>New cars for export</h1>
        <p className={styles.lead}>Authorized-channel stock and modified builds : export-ready sourcing from China<br/>Unaffected by China&apos;s new policies, no need to wait 180 days</p>
        <nav className={styles.heroNav} aria-label="On-page navigation"><a className={styles.goldButton} href="#new-car-guide">About vehicle types</a><a href="#section-authorized">Authorized stock</a><a href="#section-modified">Modified stock</a><Link href="/vehicles">Browse all vehicles</Link></nav>
        <form className={styles.heroSearch} action="/new-cars"><span>⌕</span><input name="q" type="search" defaultValue={query} placeholder="Search title, trim, notes… (space = AND)"/><button type="submit">Search</button></form>
      </div>
    </section>
    <div className={`container ${styles.content}`}>
      <section className={styles.guide} id="new-car-guide">
        <article><div className={styles.guideHeading}><span>♢</span><h2>What is an authorized vehicle?</h2></div><p>Authorized vehicles are typically sourced through OEM-approved or compliant import channels (including parallel import where applicable). Specifications and warranty structures align closely with the factory programme, and documentation chains are built for export. Ideal if you want factory-correct configuration with a clear compliance path. Always confirm the exact build and contract terms for each unit.</p></article>
        <article><div className={styles.guideHeading}><span>☷</span><h2>What is a modified vehicle?</h2></div><p>Modified vehicles are production models upgraded with appearance kits, interior trim, suspension, or performance parts for style or capability. They may differ from standard factory specifications, and destination-market rules must be checked separately. Review the equipment list, photos, and inspection reports before purchase.</p></article>
      </section>
      <div className={styles.toolbar}><span>{noResults ? `No matches for "${query}".` : `${view === "grid" ? "Grid" : "List"} view — switch layout for browsing.`}</span><div><button className={view === "grid" ? styles.selected : ""} onClick={()=>setView("grid")}>▦ Grid</button><button className={view === "list" ? styles.selected : ""} onClick={()=>setView("list")}>☷ List</button></div></div>
      <CatalogSection key={`authorized-${query}`} id="section-authorized" title="Authorized vehicles" vehicles={filteredAuthorized} view={view}/>
      <CatalogSection key={`modified-${query}`} id="section-modified" title="Modified vehicles" vehicles={filteredModified} view={view}/>
    </div>
  </SiteShell>
}

export default function NewCars(){
  return <Suspense fallback={null}><NewCarsContent/></Suspense>
}
