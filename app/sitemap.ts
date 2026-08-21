import type { MetadataRoute } from "next";
import { getSitemapVehicleEntries } from "../lib/vehicles";

const routes=["","/vehicles","/brands","/compare","/quote","/quote/status","/contact","/dealer-programme","/services","/export-process","/export-services","/about","/help","/new-cars","/news","/privacy","/terms","/cookie","/disclaimer","/legal/pricing-disclaimer","/legal/shipping-import-disclaimer"];
const SITE_URL="https://www.hainaautochina.com";
export default function sitemap():MetadataRoute.Sitemap{
  const pages:MetadataRoute.Sitemap=routes.map((route)=>({url:`${SITE_URL}${route}`,changeFrequency:route==="/vehicles"||route==="/new-cars"?"daily":"monthly",priority:route===""?1:route==="/vehicles"?0.9:0.6}));
  const vehicles:MetadataRoute.Sitemap=getSitemapVehicleEntries().filter(({availability})=>availability!=="sold").map(({slug,listedAt})=>({url:`${SITE_URL}/vehicles/${encodeURIComponent(slug)}`,lastModified:listedAt||undefined,changeFrequency:"weekly",priority:0.7}));
  return [...pages,...vehicles];
}
