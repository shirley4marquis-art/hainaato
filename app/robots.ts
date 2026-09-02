import type { MetadataRoute } from "next";

export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:["/","/api/vehicle-image/"],disallow:["/admin","/api/"]},sitemap:"https://www.nindgeauto.com/sitemap.xml",host:"https://www.nindgeauto.com"}}
