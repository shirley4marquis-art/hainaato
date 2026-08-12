import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SiteShell } from "../ui";

export const metadata:Metadata={title:"System Access",description:"Authorized HainaAuto system access information."};
export default function Admin(){return <SiteShell><PageHero kicker="AUTHORIZED ACCESS" title="HainaAuto System" copy="The management system is restricted to authorized HainaAuto staff and partners."/><section className="section"><div className="container empty-state"><h2>Secure access required</h2><p>Use the private system URL supplied by your administrator. Public account access is not available from this page.</p><Link className="btn primary" href="/contact">Contact administrator</Link></div></section></SiteShell>}
