"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteShell } from "../ui";
import { ResilientVehicleImage } from "../vehicle-image";
import styles from "./new-cars.module.css";

type Vehicle = {
  image: string;
  title: string;
  stock: string;
  msrp: string;
  price: string;
  note?: string;
  pinned?: boolean;
};

const PAGE_SIZE = 12;

const commonNote = "This price only includes the vehicle purchase cost. Service fees, domestic logistics, port charges, handling fees and international freight shall be calculated separately for the final export order.";

const authorized: Vehicle[] = [
  {image:"https://img.hainaauto.com/vehicle/newcar_da7a7c6c313bedaa.webp",title:"Xiaomi YU7 2025 Long Range Rear Drive Edition",stock:"new car",msrp:"¥253,500 CNY",price:"¥155,400 CNY",note:"The export documents have been completed and you can leave China at any time. new car",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_c223dc6feffa8c24.webp",title:"Zhengzhou Nissan Rich Pickup Automatic Diesel 4WD",stock:"White",msrp:"¥116,800 CNY",price:"¥61,272 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_0c748a461c06f979.webp",title:"Zhengzhou Nissan Fengtan PHEV 135km AWD Ultimate Edition",stock:"Gray/Black/Yellow",msrp:"¥219,900 CNY",price:"¥78,660 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_eeba00e929bbeb08.webp",title:"Zhengzhou Nissan Z9 PHEV 135km AWD Explore Edition",stock:"Yellow/Gray/Black",msrp:"¥179,900 CNY",price:"¥95,634 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_2283ac1477e80687.webp",title:"Changan 4th Generation CS75 Plus 1.5T New Blue Whale Smart Ultimate Edition",stock:"White & Gray",msrp:"¥121,900 CNY",price:"¥56,304 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_6f8650670315ce54.webp",title:"Changan CS75 Pro 1.5T Enjoy Edition",stock:"White & Gray",msrp:"¥113,900 CNY",price:"¥45,954 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_dd550c03561fec50.webp",title:"Changan CS75 Pro 1.5T Advance Edition",stock:"White & Gray",msrp:"¥119,900 CNY",price:"¥47,610 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_aec2e4fb98d22d17.webp",title:"Changan Hunter Knight Flagship Dual-Motor AWD Standard Bed Extended Range",stock:"White/Mecha Gray/Star Moon Gray",msrp:"¥177,900 CNY",price:"¥91,080 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_75c2708556349172.webp",title:"Changan Q07 215 Flagship Plus",stock:"White/Black/Black/Orange",msrp:"¥171,800 CNY",price:"¥71,622 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_c8e8b2de91f9c99b.webp",title:"Changan Deepal S07 230 Ultra",stock:"Gray/Orange/Gray/Purple/Black/Purple",msrp:"¥166,900 CNY",price:"¥76,590 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_a015d59749c3ac9e.webp",title:"Changan Deepal SL03 Extended Range Elite Edition",stock:"White/Gray",msrp:"¥129,900 CNY",price:"¥50,922 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_158c18aea4c6cd61.webp",title:"Changan 4th Generation CS55 Plus New Blue Whale 1.5T Lead Edition",stock:"White/Gray/Black",msrp:"¥98,900 CNY",price:"¥46,782 CNY"},
];

const modified: Vehicle[] = [
  {image:"https://img.hainaauto.com/vehicle/col_9ee5a3b29e624357.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Grace Pro (zhiya pro)",stock:"Red",msrp:"¥153,800 CNY",price:"¥86,093 CNY",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_3cf55a3b0ecd8ada.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Comfort Model",stock:"White/Gray",msrp:"¥125,800 CNY",price:"¥70,180 CNY",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_b12c04b2e03097cb.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Edition (zhishang)",stock:"Blue",msrp:"¥135,800 CNY",price:"¥73,036 CNY",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_5f94e7952332352a.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Edition (zhiya) + Comfort Package",stock:"White/Black",msrp:"¥149,800 CNY",price:"N/A",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_e8d11aa334b87897.webp",title:"Mazda CX-5 2025 2.0L Automatic 2WD Smart Pro (zhishang pro)",stock:"White/Gray",msrp:"¥139,800 CNY",price:"¥75,077 CNY",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_adad5e2b30e35e12.webp",title:"Highlander 2026 380T 4WD Prestige Edition 7-seater",stock:"Black, white",msrp:"¥295,800 CNY",price:"¥153,744 CNY",note:"2.0T 248 hp L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_f06aff88b61a185b.webp",title:"Geely Binyue L (Geely Coolray) 2025 Model 1.5TD DCT Star Edition",stock:"Black top, grey exterior",msrp:"¥96,800 CNY",price:"¥48,720 CNY",note:"1.5T 181HP L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/newcar_a08d84497cf66c58.webp",title:"Geely Binyue (Geely Coolray) 2025 1.5L Manual Super Edition",stock:"Black top, grey exterior",msrp:"¥66,800 CNY",price:"¥33,180 CNY",note:"1.5L 126hp L4 · No need to wait 180 days.",pinned:true},
  {image:"https://img.hainaauto.com/vehicle/col_a31575d3fc9e020c.webp",title:"FAW Toyota Corolla Hybrid Elite Edition",stock:"White/Black/Black/Black/Silver/Black",msrp:"¥136,800 CNY",price:"¥60,444 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_529cc5f6ba6a3ed6.webp",title:"FAW Toyota Frontlander Hybrid Elite Edition",stock:"White Exterior/Black Interior",msrp:"¥149,800 CNY",price:"¥64,170 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_1f63be1e35a4e9bb.webp",title:"FAW Toyota RAV4 Gasoline Deluxe Edition",stock:"White/Black",msrp:"¥189,800 CNY",price:"¥105,570 CNY"},
  {image:"https://img.hainaauto.com/vehicle/col_f4c5ea29913dd9a3.webp",title:"FAW-Volkswagen Jetta Automatic Pioneer Edition (Shadow Play Edition)",stock:"Black/White",msrp:"¥98,900 CNY",price:"¥50,508 CNY"},
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
        <div><dt>MSRP (reference)</dt><dd>{vehicle.msrp}</dd></div>
        <div><dt>Selling price</dt><dd className={styles.price}>{vehicle.price}</dd></div>
      </dl>
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
