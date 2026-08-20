import Image from "next/image";
import Link from "next/link";
import {Heart,ShieldCheck,Target} from "lucide-react";
import {GetInTouchSection} from "../contact-section";
import {PageHero,SiteShell} from "../ui";

const visits=["visit_5c856c9cdfaec3e8.jpg","visit_e4c2d879f81cda1d.jpg","visit_03e6f0c1a20573b5.jpg","visit_f702494f5cd6dcad.jpg","visit_28a26165a6c45538.jpg","visit_e65ff07f4cdc1547.jpg","visit_06d43138b60215dd.jpg","visit_2855e6e2ccb4a3aa.jpg","visit_81dea455c97a8fe0.jpg","visit_d329cf135f009b39.jpg","visit_2b5f883a4dbacd36.jpg","visit_0f45e2d89ceb5d4b.jpg","visit_b1c7fe04391856c7.jpg","visit_5384b8317f1c5f06.jpg","visit_03c823f280e39f2c.jpg","visit_ee68577cc29fa6a8.jpg","visit_ffe7df39fdf4034d.jpg","visit_a2c343a85e75391e.jpg","visit_24287f7917143740.jpg"];
const steps=[
  ["Source & quote","Match inventory to your budget, model, and destination constraints; confirm specs and Incoterms."],
  ["Inspect & verify","Optional third-party or in-house checks; photos, OBD, and export documentation prepared."],
  ["Export & ship","Permits, customs clearance in China, booking ocean or rail — tracked milestones through departure."],
  ["Handover & support","Arrival coordination, spare-parts guidance, and help with your next procurement batch."]
];

export default function About(){return <SiteShell>
  <PageHero kicker="ABOUT HAINAAUTO" title="Connecting China mobility to the world" copy="A professional export partner built on clear communication, disciplined inspection and reliable delivery."/>
  <section className="about-reference"><div className="container">
    <div className="about-intro-grid">
      <div><Header eyebrow="WHO WE ARE" title="About us"/><article className="about-story-card"><p>HainaAuto Export — founded in 2015 in Fujian, we are among the early licensed used-car exporters in China, focused on quality EV and ICE exports.</p><p>We have built a sales and delivery network across Central Asia, Russia, the Middle East, Africa, and South America, covering sourcing, inspection, shipping, customs, and after-sales support.</p><blockquote>Our goal is simple: make cross-border vehicle buying predictable — clear specs, honest pricing, and a team that stays reachable until your unit lands.</blockquote></article></div>
      <div><Header eyebrow="MISSION & VALUES" title="What drives us"/><div className="about-mission-grid"><article><span><Target/></span><h3>Mission</h3><p>Connect international buyers with reliable Chinese inventory — with inspection, paperwork, and logistics you can track.</p></article><article><span><Heart/></span><h3>Values</h3><p>Transparency in condition reports, disciplined execution on export timelines, and long-term support for parts &amp; service questions.</p></article></div><article className="about-compliance"><h3><ShieldCheck/>Compliance &amp; trust</h3><p>We work within China&apos;s export regulations for used and new vehicles, coordinate with licensed partners for inspection and customs, and keep records aligned with destination import requirements where applicable.</p></article></div>
    </div>
    <section className="customer-visits" id="visitors"><Header eyebrow="REAL VISITS" title="Customer visits" center/><p>Photos from buyers and partners visiting our showroom, yard, and team</p><small>Images are watermarked for visitor privacy.</small><div className="visit-marquee" aria-label="Customer visit photos"><div className="visit-track">{[...visits,...visits].map((file,index)=><figure key={`${file}-${index}`} aria-hidden={index>=visits.length}><Image src={`/images/visits/${file}`} alt={index<visits.length?"Customer visiting the HainaAuto team":""} width={640} height={480} draggable={false}/></figure>)}</div></div></section>
    <section className="about-process-reference" id="process"><Header eyebrow="END-TO-END FLOW" title="How we work" center/><p>Four stages — each with a single point of contact so you always know what happens next.</p><div>{steps.map(([title,copy],index)=><article key={title}><b>{index+1}</b><h3>{title}</h3><p>{copy}</p></article>)}</div><Link href="/services">See detailed export services →</Link></section>
  </div></section>
  <GetInTouchSection/>
</SiteShell>}

function Header({eyebrow,title,center=false}:{eyebrow:string,title:string,center?:boolean}){return <header className={`about-ref-heading${center?" center":""}`}><span>{eyebrow}</span><h2>{title}</h2><i/></header>}
