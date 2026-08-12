import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={metadataBase:new URL("https://hainaauto.com"),title:{default:"HainaAuto | China Vehicle Export",template:"%s | HainaAuto"},description:"New and used vehicle sourcing, inspection and export services from China to buyers worldwide.",openGraph:{siteName:"HainaAuto",type:"website",locale:"en_US"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
