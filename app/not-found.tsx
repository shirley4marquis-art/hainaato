import Link from "next/link";
import { SiteShell } from "./ui";

export default function NotFound() {
  return <SiteShell><section className="container empty-state route-not-found"><h1>Page not found</h1><p>The page or vehicle you requested is unavailable.</p><Link className="btn primary" href="/vehicles">Browse vehicles</Link></section></SiteShell>;
}
