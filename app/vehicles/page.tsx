import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell, SortSelect } from "../ui";
import { getFilterOptions, searchVehicles } from "../../lib/vehicles";
import { buildVehiclesUrl, type SP } from "../../lib/format";
import { AvailabilityToggle, FloatingPager, MarketHero, QuickFilterBar, VehicleListItem } from "./market-ui";

const VEHICLES_SHARE_IMAGE = "/images/hainaauto-vehicles-hero-full-hd.jpg";

export const metadata: Metadata = {
  title: "Vehículos nuevos y usados de China",
  description:
    "Explora miles de carros, SUV, camionetas y vehículos comerciales disponibles para importar desde China a Venezuela. Fotos reales, precios y soporte de exportación.",
  alternates: { canonical: "/vehicles" },
  openGraph: {
    title: "Vehículos nuevos y usados de China",
    description:
      "Explora miles de carros, SUV, camionetas y vehículos comerciales disponibles para importar desde China a Venezuela.",
    url: "/vehicles",
    type: "website",
    images: [
      {
        url: VEHICLES_SHARE_IMAGE,
        width: 1920,
        height: 1080,
        alt: "Vehículos preparados para exportación internacional con HainaAuto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vehículos nuevos y usados de China",
    description:
      "Explora miles de carros, SUV, camionetas y vehículos comerciales disponibles para importar desde China a Venezuela.",
    images: [VEHICLES_SHARE_IMAGE],
  },
};

type SearchParams = {
  q?: string;
  brand?: string;
  model?: string;
  type?: string;
  condition?: "new" | "used";
  fuel?: string;
  color?: string;
  availability?: "available" | "reserved" | "sold";
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
};

const num = (value?: string) => (value && Number.isFinite(Number(value)) ? Number(value) : undefined);

export default async function Vehicles({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const options = getFilterOptions();
  const sort = sp.sort === "price-asc" || sp.sort === "price-desc" ? sp.sort : "latest";
  const result = searchVehicles({
    q: sp.q,
    brand: sp.brand,
    model: sp.model,
    type: sp.type,
    fuel: sp.fuel,
    color: sp.color,
    condition: sp.condition,
    availability: sp.availability,
    minYear: num(sp.minYear),
    maxYear: num(sp.maxYear),
    minMileage: num(sp.minMileage),
    maxMileage: num(sp.maxMileage),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    sort,
    page: num(sp.page) ?? 1,
    pageSize: 25,
  });

  const spGeneric = sp as SP;
  const prevHref = buildVehiclesUrl(spGeneric, { page: String(Math.max(1, result.page - 1)) });
  const nextHref = buildVehiclesUrl(spGeneric, { page: String(Math.min(result.totalPages, result.page + 1)) });
  const sortHidden = Object.fromEntries(
    Object.entries(sp).filter(([key]) => key !== "sort" && key !== "page")
  ) as SP;

  return (
    <SiteShell>
      <MarketHero total={result.total} />
      <div className="container market-shell">
        <QuickFilterBar sp={spGeneric} options={options} />
        <section className="market-results" aria-live="polite">
          <div className="list-header">
            <div className="page-info">
              Showing <b>{result.vehicles.length ? (result.page - 1) * result.pageSize + 1 : 0}–
              {(result.page - 1) * result.pageSize + result.vehicles.length}</b> of {result.total.toLocaleString()}
            </div>
            <div className="list-tools">
              <AvailabilityToggle sp={spGeneric} />
              <SortSelect sort={sort} hidden={sortHidden} />
            </div>
          </div>
          {result.vehicles.length ? (
            <div className="vlist">
              {result.vehicles.map((v) => (
                <VehicleListItem v={v} key={v.slug} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No matching vehicles</h2>
              <p>Try removing one or more filters.</p>
              <Link className="btn primary" href="/vehicles">
                Clear all filters
              </Link>
            </div>
          )}
          <FloatingPager page={result.page} totalPages={result.totalPages} prevHref={prevHref} nextHref={nextHref} />
          <div className="pager" role="navigation" aria-label="Catalogue pages">
            <Link className={`btn ghost${result.page <= 1 ? " disabled" : ""}`} href={prevHref}>
              ← Previous
            </Link>
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <Link className={`btn ghost${result.page >= result.totalPages ? " disabled" : ""}`} href={nextHref}>
              Next →
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
