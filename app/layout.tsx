import type {Metadata, Viewport} from "next";import "./globals.css";
import {Suspense} from "react";
import {AutoTranslate} from "./auto-translate";
// Same local logo asset used site-wide (header/footer in app/ui.tsx, admin
// quote PDF letterhead) — used here too so link previews (WhatsApp, iMessage,
// social) show the same mark as the site itself. Hosted in public/ rather
// than hotlinked from img.hainaauto.com, which changed its content mid-session
// once already. Absolute URL (not resolved via metadataBase, which still
// points at hainaauto.com — a different, older site, not this deployment)
// since social platforms fetch og:image directly rather than through Next.
const SITE_LOGO_URL="https://www.hainaautochina.com/hainaauto-logo.webp";
const SITE_DESCRIPTION="HainaAuto 专注于中国新车与二手车采购、专业验车及出口服务，为全球客户提供可靠车源、出口文件和国际物流支持。";
export const metadata:Metadata={metadataBase:new URL("https://www.hainaautochina.com"),title:{default:"HainaAuto | China Vehicle Export",template:"%s | HainaAuto"},description:SITE_DESCRIPTION,openGraph:{siteName:"HainaAuto",type:"website",locale:"zh_CN",description:SITE_DESCRIPTION,images:[{url:SITE_LOGO_URL,width:128,height:128,alt:"HainaAuto"}]},twitter:{card:"summary",title:"HainaAuto | China Vehicle Export",description:SITE_DESCRIPTION,images:[SITE_LOGO_URL]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><Suspense fallback={null}><AutoTranslate/></Suspense>{children}</body></html>}
