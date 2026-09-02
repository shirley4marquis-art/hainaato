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
const SITE_ORIGIN="https://www.nindgeauto.com";
const SITE_LOGO_URL=`${SITE_ORIGIN}/hainaauto-logo.webp`;
const SEO_DESCRIPTION="Compra vehículos nuevos y usados de China para Venezuela y Sudamérica con HainaAuto: inspección profesional, documentación de exportación, precios transparentes y logística internacional.";
export const metadata:Metadata={metadataBase:new URL(SITE_ORIGIN),title:{default:"Autos de China para Venezuela y Sudamérica | HainaAuto",template:"%s | HainaAuto"},description:SEO_DESCRIPTION,keywords:["autos de China en Venezuela","autos de China en Colombia","importar autos de China a Perú","vehículos chinos en Chile","importar vehículos de China","vehículos nuevos China","carros usados China","exportación de autos a Sudamérica","SUV chinos","camionetas chinas"],authors:[{name:"HainaAuto"}],creator:"HainaAuto",publisher:"HainaAuto",category:"Automotive",alternates:{canonical:"/"},robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},openGraph:{siteName:"HainaAuto",type:"website",locale:"es_VE",alternateLocale:["es_CO","es_PE","es_CL","es_EC","es_AR","pt_BR"],url:SITE_ORIGIN,title:"Autos de China para Venezuela y Sudamérica | HainaAuto",description:SEO_DESCRIPTION,images:[{url:SITE_LOGO_URL,width:128,height:128,alt:"HainaAuto"}]},twitter:{card:"summary",title:"Autos de China para Venezuela y Sudamérica | HainaAuto",description:SEO_DESCRIPTION,images:[SITE_LOGO_URL]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
const structuredData={"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":`${SITE_ORIGIN}/#organization`,"name":"HainaAuto","url":SITE_ORIGIN,"logo":SITE_LOGO_URL,"description":SEO_DESCRIPTION,"email":"sales@nindgeauto.com","telephone":"+86 150 3217 8759","address":{"@type":"PostalAddress","addressRegion":"Fujian","addressCountry":"CN"},"areaServed":["Venezuela","Colombia","Peru","Chile","Ecuador","Bolivia","Argentina","Brazil","Uruguay","Paraguay"].map((name)=>({"@type":"Country","name":name})),"contactPoint":{"@type":"ContactPoint","telephone":"+86 150 3217 8759","contactType":"sales","areaServed":"South America","availableLanguage":["Spanish","Portuguese","English","Chinese"]}},{"@type":"WebSite","@id":`${SITE_ORIGIN}/#website`,"url":SITE_ORIGIN,"name":"HainaAuto Sudamérica","inLanguage":["es","pt-BR","en"],"publisher":{"@id":`${SITE_ORIGIN}/#organization`},"potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":`${SITE_ORIGIN}/vehicles?q={search_term_string}`},"query-input":"required name=search_term_string"}}]};
// lang="en" is the authored source language. app/auto-translate.tsx updates
// document.documentElement.lang only when a visitor explicitly selects a
// translation language. Spanish-market SEO is carried by the metadata export above.
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/><Suspense fallback={null}><AutoTranslate/></Suspense>{children}</body></html>}
