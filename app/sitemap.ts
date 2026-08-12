import type { MetadataRoute } from "next";

const routes=["","/vehicles","/brands","/compare","/quote","/quote/status","/contact","/dealer-programme","/services","/export-services","/about","/help","/new-cars","/news","/privacy","/terms","/cookie","/disclaimer","/legal/pricing-disclaimer","/legal/shipping-import-disclaimer"];
export default function sitemap():MetadataRoute.Sitemap{return routes.map((route)=>({url:`https://hainaauto.com${route}`,changeFrequency:route==="/vehicles"||route==="/new-cars"?"daily":"monthly",priority:route===""?1:route==="/vehicles"?0.9:0.6}))}
