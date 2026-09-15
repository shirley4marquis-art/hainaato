"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";

export function VehicleSearch({ mobile = false }: { mobile?: boolean }) {
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const reset = () => setSearching(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return <form className={mobile ? "mobile-header-search" : "ah-header-search"} action="/vehicles" method="get" role="search" aria-busy={searching} onSubmit={event => {
    const form = event.currentTarget;
    // Cached pages can still be open on the bare domain after its DNS records
    // change. Send those searches to the working canonical host.
    if (window.location.hostname === "nindgeauto.com") form.action = "https://www.nindgeauto.com/vehicles";
    setSearching(true);
  }}>
    <input name="q" type="search" enterKeyHint="search" placeholder={mobile ? "Search vehicle e.g. JAC" : "Quick search..."} aria-label="Search vehicles" />
    <button type="submit" aria-label={searching ? "Searching vehicles" : "Search vehicles"} disabled={searching}>
      {searching ? <LoaderCircle size={16} aria-hidden="true" className="vehicle-search-spinner" /> : <Search size={16} aria-hidden="true" />}
      {(!mobile || searching) && <span>{searching ? "Searching..." : "Search"}</span>}
    </button>
    <span className="vehicle-search-status" role="status">{searching ? "Searching vehicles. Loading results." : ""}</span>
  </form>;
}
