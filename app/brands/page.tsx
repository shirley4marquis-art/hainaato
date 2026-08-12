import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell, SortSelect } from "../ui";
import { getFilterOptions, searchVehicles } from "../../lib/vehicles";
import { buildListUrl, type SP } from "../../lib/format";
import { AvailabilityToggle, FloatingPager, MarketHero, QuickFilterBar, VehicleListItem } from "../vehicles/market-ui";

export const metadata: Metadata = {
  title: "Used Cars for Export",
  description: "Browse every used vehicle in our China export catalogue — real photos, real prices, filterable by brand, mileage, fuel and more.",
};

type SearchParams = {
  q?: string;
  brand?: string;
  model?: string;
  type?: string;
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
const BASE_PATH = "/brands";

export default async function UsedCars({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const options = getFilterOptions({ condition: "used" });
  const sort = sp.sort === "price-asc" || sp.sort === "price-desc" ? sp.sort : "latest";
  const result = searchVehicles({
    q: sp.q,
    brand: sp.brand,
    model: sp.model,
    type: sp.type,
    fuel: sp.fuel,
    color: sp.color,
    condition: "used",
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
  const prevHref = buildListUrl(BASE_PATH, spGeneric, { page: String(Math.max(1, result.page - 1)) });
  const nextHref = buildListUrl(BASE_PATH, spGeneric, { page: String(Math.min(result.totalPages, result.page + 1)) });
  const sortHidden = Object.fromEntries(
    Object.entries(sp).filter(([key]) => key !== "sort" && key !== "page")
  ) as SP;

  return (
    <SiteShell>
      <MarketHero
        total={result.total}
        title="Used Cars"
        subtitle="Every used vehicle in our catalogue · Real photos · Filter by brand, mileage, fuel"
        countLabel="used cars"
      />
      <div className="container market-shell">
        <QuickFilterBar sp={spGeneric} options={options} lockCondition="used" />
        <section className="market-results" aria-live="polite">
          <div className="list-header">
            <div className="page-info">
              Showing <b>{result.vehicles.length ? (result.page - 1) * result.pageSize + 1 : 0}–
              {(result.page - 1) * result.pageSize + result.vehicles.length}</b> of {result.total.toLocaleString()} used cars
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
              <h2>No matching used cars</h2>
              <p>Try removing one or more filters.</p>
              <Link className="btn primary" href="/brands">
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
