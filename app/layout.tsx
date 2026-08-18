import type {Metadata, Viewport} from "next";import "./globals.css";
// Same logo URL used site-wide (header/footer in app/ui.tsx, admin quote PDF
// letterhead) — used here too so link previews (WhatsApp, iMessage, social)
// show the same mark as the site itself, not nothing or a random scraped image.
const SITE_LOGO_URL="https://img.hainaauto.com/vehicle/site_187121eacd6e44cc.webp";
const SITE_DESCRIPTION="New and used vehicle sourcing, inspection and export services from China to buyers worldwide.";
export const metadata:Metadata={metadataBase:new URL("https://hainaauto.com"),title:{default:"HainaAuto | China Vehicle Export",template:"%s | HainaAuto"},description:SITE_DESCRIPTION,openGraph:{siteName:"HainaAuto",type:"website",locale:"en_US",images:[{url:SITE_LOGO_URL,width:128,height:128,alt:"HainaAuto"}]},twitter:{card:"summary",title:"HainaAuto | China Vehicle Export",description:SITE_DESCRIPTION,images:[SITE_LOGO_URL]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>}
