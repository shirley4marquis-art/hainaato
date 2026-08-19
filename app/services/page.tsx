import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {SiteShell} from "../ui";

export const metadata:Metadata={title:"Export Services | One-stop Auto Export — HainaAuto",description:"HainaAuto 提供中国汽车一站式出口服务，包括出口手续、交付前检查与整备、海运及铁路运输、清关协调和目的地交付。"};

const services=[
  {icon:"DOC",title:"Licenses & Compliance",lead:"Export permits and clearance papers for the full workflow.",copy:"We handle vehicle cancellation and export permit applications through compliant end-to-end export workflows."},
  {icon:"PDI",title:"Domestic Logistics",lead:"Nationwide sourcing, PDI checks, reconditioning, and port staging.",copy:"We operate transfer hubs with 350-point PDI inspection plus cleaning, repairs, reflashing, and charging accessory preparation."},
  {icon:"GLB",title:"Global Transport",lead:"RORO, containers, rail, and Central Asia road freight.",copy:"Together with major carriers and partners we arrange rail, road, and ocean routes for Central Asia, Russia, the Middle East, Africa, and South America."},
  {icon:"BOX",title:"Customs & Delivery",lead:"Destination customs, duty guidance, and last-mile delivery.",copy:"Local customs partners help with clearance and delivery under terms such as CIP and DDP where applicable."}
];
const trust=[
  ["$","Secure Funds","Supervised account flow"],["✓","350-Point PDI","Inspection & pre-ship recheck"],["⌖","Tracking","Milestone status updates"],["文","Support","CN / EN / RU / AR"]
];
const flow=[
  ["Requirement Review","Confirm vehicle configuration and pricing"],["Contract Signing","Sign the PI invoice"],["Payment","T/T or L/C or USDT settlement"],["Vehicle Preparation","PDI inspection and file processing"],["International Shipping","Sea freight or rail delivery"],["Final Delivery","Destination customs clearance and handover"]
];
const benefits=[
  ["⌕","Cross-check quality","Transparent vehicle information."],["⌖","Nationwide coverage","Inspections anywhere in China."],["▣","Mobile-friendly reports","Easy to review on any device."],["✓","Professional agencies","200+ checkpoints covering exterior, interior, mechanical and electronics."]
];
const reports=[
  ["/images/services/inspection-report-onsite.webp","Sample on-site vehicle inspection certificate stack","On-site inspection report","Physical inspection paperwork and guarantees from licensed agencies where applicable."],
  ["/images/services/inspection-report-online.webp","Sample online vehicle history report screens","Online instant report","Digital history and accident-oriented reports for faster cross-checks against the listing."],
  ["/images/services/inspection-report-paint.webp","Paint thickness gauge measurement on a vehicle panel","Paint meter video","Coating thickness readings to detect repainting or body repair patterns."]
];

export default function Services(){return <SiteShell>
  <section className="services-hero"><div className="container"><span>END-TO-END EXPORT SUPPORT</span><h1>One-stop Auto Export Solution</h1><p>From sourcing to delivery, we handle every step.</p><div><Link href="#core-services">Explore services</Link><Link href="/quote">Get a free quote</Link></div></div></section>
  <section id="core-services" className="services-main"><div className="container">
    <header className="services-heading"><span>WHAT WE HANDLE</span><h2>Core Services</h2><p>Export permits, nationwide logistics, global transport, and destination delivery — aligned with professional China used-car export workflows.</p></header>
    <div className="core-service-grid">{services.map((service)=><article key={service.title}><b className="service-icon">{service.icon}</b><h3>{service.title}</h3><strong>{service.lead}</strong><p>{service.copy}</p></article>)}</div>
    <div className="service-trust-grid">{trust.map(([icon,title,copy])=><article key={title}><b>{icon}</b><div><strong>{title}</strong><span>{copy}</span></div></article>)}</div>
  </div></section>
  <section id="export-flow" className="service-flow-section"><div className="container"><header className="services-heading"><span>STANDARDIZED PROCEDURE</span><h2>Export Service Flow</h2><p>Professional coordination from the initial specification to destination handover.</p></header><div className="service-flow-grid">{flow.map(([title,copy],i)=><article key={title}><b>{i+1}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div></section>
  <section id="inspection" className="inspection-section"><div className="container">
    <div className="inspection-banner"><div><span>BUY WITH EVIDENCE</span><h2>Reliable vehicle inspection from China</h2><p>We help arrange independent checks before you buy a used vehicle so you can avoid accident units. Online and on-site inspections, nationwide coverage, and detailed digital reports.</p><Link href="/vehicles">Browse Vehicles</Link></div><div className="inspection-benefits">{benefits.map(([icon,title,copy])=><article key={title}><b>{icon}</b><p><strong>{title}</strong> — {copy}</p></article>)}</div></div>
    <div className="inspection-bundle"><header><b>✓</b><div><span>INSPECTION WORKFLOW</span><h3>Pre-import used car checklist</h3></div></header><div className="checklist-media"><Image src="/images/services/inspection-checklist.webp" alt="Diagram: exterior inspection zones on a vehicle top view" width={1200} height={675}/></div><p className="checklist-note">Panel-by-panel review helps spot prior paintwork, replaced parts, and structural risk before the car leaves China.</p><div className="inspection-reports"><h3>Cross-check reports to avoid fraud when importing used cars from China</h3><p>Combine on-site findings, online history, and paint-meter evidence for a fuller picture of the unit you are buying.</p><div>{reports.map(([src,alt,title,copy])=><article key={title}><Image src={src} alt={alt} width={800} height={600}/><div><h4>{title}</h4><p>{copy}</p></div></article>)}</div></div></div>
  </div></section>
  <section className="services-cta"><div className="container"><div><span>START YOUR IMPORT</span><h2>Ready to import vehicles from China?</h2><p>Get market pricing, professional inspection and a complete export solution.</p></div><Link href="/quote">Get Free Quote →</Link></div></section>
  </SiteShell>}
