"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BusFront, Car, CarFront, Copy, FileText, MapPin, ShoppingCart, Truck } from "lucide-react";
import {TELEGRAM_URL,WECHAT_CONTACT_URL,TelegramIcon,WeChatIcon} from "../contact-links";
import {
  buildListUrl,
  buildVehiclesUrl,
  formatKm,
  imagePath,
  normalizeBodyType,
  type SP,
  type VehicleIndexEntry,
} from "../../lib/format";
import { swatchFor } from "../../lib/colors";
import { fuelChoiceLabel } from "../../lib/fuel-options";
import { ResilientVehicleImage } from "../vehicle-image";
import { Price } from "../price";
import { addToCart, removeFromCart, useCartSlugs } from "../cart-store";

export type FilterOptions = {
  fuels: string[];
  bodyTypes: string[];
  brands: string[];
  models: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
};

const YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(2027 - index));

const MILEAGE_OPTIONS = [
  ["", "Any mileage"],
  ["10000", "Up to 10,000 km"],
  ["20000", "Up to 20,000 km"],
  ["50000", "Up to 50,000 km"],
  ["100000", "Up to 100,000 km"],
  ["150000", "Up to 150,000 km"],
] as const;

const PRICE_OPTIONS = [
  ["", "Any price"],
  ["50000", "Up to ¥50,000"],
  ["75000", "Up to ¥75,000"],
  ["100000", "Up to ¥100,000"],
  ["150000", "Up to ¥150,000"],
  ["200000", "Up to ¥200,000"],
  ["300000", "Up to ¥300,000"],
  ["500000", "Up to ¥500,000"],
] as const;

export function VehicleListItem({ v }: { v: VehicleIndexEntry }) {
  const href = `/vehicles/${v.slug}`;
  const [main, ...rest] = v.thumbs.length ? v.thumbs : v.thumb ? [v.thumb] : [];
  const displayDate=v.listedAt?.slice(0,10)??"Available now";
  const cartSlugs = useCartSlugs();
  const inCart = cartSlugs.includes(v.slug);

  return (
    <article className="vlist-item">
      <Link href={href} className="vlist-media">
        <div className="vlist-head-image">
          <ResilientVehicleImage
            candidates={[main, ...rest].map((image) => image ? imagePath(v.site, v.id, image) : null)}
            alt={`${v.title} exterior`}
            sizes="(max-width: 760px) 100vw, 280px"
          />
          <span className="vlist-source">{v.location ?? "China"}</span>
          <span className="vlist-stock"># &nbsp; {v.stockCode}</span>
        </div>
        {rest.length > 0 && (
          <div className="vlist-thumbs">
            {rest.slice(0, 3).map((t) => (
              <span className="vlist-thumb" key={t}><ResilientVehicleImage candidates={[imagePath(v.site, v.id, t)]} alt="" sizes="90px"/></span>
            ))}
          </div>
        )}
      </Link>
      <div className="vlist-middle">
        <Link href={href} className="vlist-title-row"><h3 className="vlist-title">{v.title}</h3></Link>
        <div className="vlist-code">{v.stockCode} <Copy aria-hidden="true"/></div>
        <div className="vlist-baseinfo">
          <div className="vlist-baseinfo-item">
            <span className="label">REG. YEAR</span>
            <span className="value accent">{v.year ?? "—"}</span>
          </div>
          <div className="vlist-baseinfo-item">
            <span className="label">MLG(KM)</span>
            <span className="value">{formatKm(v.mileageKm)}</span>
          </div>
          <div className="vlist-baseinfo-item">
            <span className="label">FUEL</span>
            <span className="value">{fuelChoiceLabel(v.fuel)}</span>
          </div>
          <div className="vlist-baseinfo-item"><span className="label">BODY TYPE</span><span className="value">{v.bodyType?normalizeBodyType(v.bodyType):"—"}</span></div>
          <div className="vlist-baseinfo-item"><span className="label">TRANSM.</span><span className="value truncate">{v.transmission??"—"}</span></div>
        </div>
        <div className="vlist-tags">
          <span className="tag">{v.condition === "new" ? "New Car" : "Actual Mileage"}</span>
          <span className="tag">{fuelChoiceLabel(v.fuel)}</span>
          <span className="tag">Original vehicle photos</span><span className="tag">Export Ready</span><span className="tag">Available</span>
        </div>
        <dl className="vlist-details"><div><dt>Model Year</dt><dd>{v.year??"—"}</dd></div><div><dt>Color</dt><dd>{v.color??"—"}</dd></div><div><dt>Fuel options</dt><dd>{fuelChoiceLabel(v.fuel)}</dd></div><div><dt>Transmission</dt><dd>{v.transmission??"—"}</dd></div><div><dt>Body Type</dt><dd>{v.bodyType?normalizeBodyType(v.bodyType):"—"}</dd></div><div><dt>Location</dt><dd>{v.location??"China"}</dd></div></dl>
      </div>
      <div className="vlist-right">
        <div className="vlist-location"><MapPin aria-hidden="true"/>{v.location ?? "China"}</div>
        <div className="vlist-side-spacer"/>
        <div className="vlist-price"><Price cny={v.priceCNY}/></div>
        <div className="vlist-cif-note"><span>CIF</span> Freight + marine insurance included</div>
        <time className="vlist-date">{displayDate}</time>
        <div className="vlist-contact">
          <Link className="is-quote" href={href} aria-label="Preview this vehicle"><FileText/></Link>
          <button
            type="button"
            className="is-cart"
            aria-pressed={inCart}
            aria-label={inCart ? "Remove from cart" : "Add to cart"}
            onClick={() => (inCart ? removeFromCart(v.slug) : addToCart(v.slug))}
          >
            <ShoppingCart/>
          </button>
          <a className="is-wc" href={WECHAT_CONTACT_URL} aria-label="WeChat inquiry"><WeChatIcon/></a>
          <a className="is-tg" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram inquiry"><TelegramIcon/></a>
        </div>
        <Link className="vlist-inquire" href={href}><FileText aria-hidden="true"/>Inquire Now</Link>
      </div>
    </article>
  );
}

export function BrandPanel({
  brands,
  activeBrand,
  sp,
}: {
  brands: { brand: string; count: number }[];
  activeBrand?: string;
  sp: SP;
}) {
  if (brands.length === 0) return null;
  return (
    <div className="brand-panel">
      <div className="brand-panel-head">
        <h3>Browse by brand</h3>
        {activeBrand && (
          <Link href={buildVehiclesUrl(sp, { brand: undefined, page: undefined })}>Clear</Link>
        )}
      </div>
      <div className="brand-chips">
        {brands.map(({ brand, count }) => (
          <Link
            key={brand}
            href={buildVehiclesUrl(sp, {
              brand: brand === activeBrand ? undefined : brand,
              page: undefined,
            })}
            className={`brand-chip${brand === activeBrand ? " active" : ""}`}
          >
            <span className="brand-chip-badge">{brand.charAt(0).toUpperCase()}</span>
            <span className="brand-chip-name">{brand}</span>
            <span className="brand-chip-count">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FilterFields({
  sp,
  options,
  idPrefix,
  lockCondition,
}: {
  sp: SP;
  options: FilterOptions;
  idPrefix: string;
  lockCondition?: "new" | "used";
}) {
  return (
    <>
      <label>
        Search
        <input name="q" placeholder="Brand, model, trim or stock code" defaultValue={sp.q ?? ""} />
      </label>
      <label>
        Brand
        <select name="brand" defaultValue={sp.brand ?? ""}>
          <option value="">All brands</option>
          {options.brands.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      <label>
        Model
        <select name="model" defaultValue={sp.model ?? ""}>
          <option value="">All models</option>
          {options.models.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      <label>
        Category
        <select name="type" defaultValue={sp.type ?? ""}>
          <option value="">All categories</option>
          {options.bodyTypes.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      {lockCondition ? (
        <input type="hidden" name="condition" value={lockCondition} />
      ) : (
        <label>
          Condition
          <select name="condition" defaultValue={sp.condition ?? ""}>
            <option value="">New &amp; used</option>
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </label>
      )}
      <label>
        Fuel
        <select name="fuel" defaultValue={sp.fuel ?? ""}>
          <option value="">All fuel types</option>
          {options.fuels.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      {options.colors.length > 0 && (
        <div className="color-field">
          <span className="color-field-label">Color</span>
          <div className="color-boxes">
            <input
              type="radio"
              name="color"
              value=""
              id={`${idPrefix}-color-any`}
              className="color-box-input"
              defaultChecked={!sp.color}
            />
            <label htmlFor={`${idPrefix}-color-any`} className="color-box color-box-any" title="Any color">
              Any
            </label>
            {options.colors.map((c) => (
              <span key={c}>
                <input
                  type="radio"
                  name="color"
                  value={c}
                  id={`${idPrefix}-color-${c}`}
                  className="color-box-input"
                  defaultChecked={sp.color === c}
                />
                <label
                  htmlFor={`${idPrefix}-color-${c}`}
                  className="color-box"
                  style={{ background: swatchFor(c) }}
                  title={c}
                />
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="filter-pair">
        <label>
          Year from
          <select name="minYear" defaultValue={sp.minYear ?? ""}>
            <option value="">Any year</option>
            {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label>
          Year to
          <select name="maxYear" defaultValue={sp.maxYear ?? ""}>
            <option value="">Any year</option>
            {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <div className="filter-pair">
        <label>
          Max mileage
          <select name="maxMileage" defaultValue={sp.maxMileage ?? ""}>
            {MILEAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Max price
          <select name="maxPrice" defaultValue={sp.maxPrice ?? ""}>
            {PRICE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
    </>
  );
}

export function FilterDrawer({
  sp,
  options,
  lockCondition,
}: {
  sp: SP;
  options: FilterOptions;
  lockCondition?: "new" | "used";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeCount = ["q", "brand", "model", "type", "fuel", "color", "minYear", "maxYear", "maxMileage", "maxPrice"]
    .concat(lockCondition ? [] : ["condition"])
    .filter((k) => sp[k]).length;

  return (
    <div className="mobile-filter-bar">
      <div className="filter-triggers">
        <button
          type="button"
          className={`adv-btn${activeCount > 0 ? " has-filter" : ""}`}
          onClick={() => setOpen(true)}
          aria-label="Open more filters"
        >
          ⚙ {activeCount > 0 ? `More filters (${activeCount})` : "More filters"}
        </button>
      </div>
      {open && (
        <>
          <div className="dropdown-overlay" onClick={() => setOpen(false)} />
          <div className="mobile-filter-sheet">
            <div className="filter-mobile-header">
              Filter vehicles
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters">
                ×
              </button>
            </div>
            <form method="get" className="mobile-filter-form">
              {sp.collection && <input type="hidden" name="collection" value={sp.collection} />}
              <FilterFields sp={sp} options={options} idPrefix="mobile" lockCondition={lockCondition} />
              <div className="mobile-filter-footer">
                <Link href={pathname}>Clear all</Link>
                <button className="btn primary" type="submit">
                  Show results
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function MarketHero({
  total,
  title = "Vehicle Market",
  subtitle = "Quick filters · Search · Export-ready stock",
  countLabel = "vehicles",
}: {
  total: number;
  title?: string;
  subtitle?: string;
  countLabel?: string;
}) {
  return (
    <section className="market-hero">
      <div className="container">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className="market-hero-count"><Car size={14}/> {total.toLocaleString()} {countLabel}</span>
      </div>
    </section>
  );
}

const collectionIcons = {
  "heavy-duty-trucks": Truck,
  trucks: Truck,
  pickups: Truck,
  "vans-buses": BusFront,
  suvs: CarFront,
  "passenger-cars": Car,
} as const;

export function CatalogueCollections({ collections, activeCollection, sp }: {
  collections: ReadonlyArray<{ id: string; shortTitle: string; copy: string; count: number }>;
  activeCollection?: string;
  sp: SP;
}) {
  return (
    <nav className="catalogue-collections" aria-label="Catalogue collections">
      <div className="catalogue-collections-head">
        <div><span>Browse collections</span><h2>Commercial vehicles first</h2></div>
        {activeCollection && <Link href={buildVehiclesUrl(sp, { collection: undefined, page: undefined })}>View all stock</Link>}
      </div>
      <div className="catalogue-collection-grid">
        {collections.map((collection, index) => {
          const Icon = collectionIcons[collection.id as keyof typeof collectionIcons] ?? Car;
          const active = collection.id === activeCollection;
          return <Link className={`catalogue-collection${active ? " active" : ""}`} href={buildVehiclesUrl(sp, { collection: active ? undefined : collection.id, type: undefined, page: undefined })} key={collection.id}>
            <span className="catalogue-collection-icon"><Icon aria-hidden="true" /></span>
            <span className="catalogue-collection-copy"><b>{collection.shortTitle}</b><small>{collection.copy}</small></span>
            <span className="catalogue-collection-count">{collection.count.toLocaleString()}<small> in stock</small></span>
            {index === 0 && <span className="catalogue-priority">Priority</span>}
          </Link>;
        })}
      </div>
    </nav>
  );
}

const MILEAGE_PILLS: [string, string, string | undefined, string | undefined][] = [
  ["All", "", undefined, undefined],
  ["0~20,000km", "0-20", "0", "20000"],
  ["20,000km~50,000km", "20-50", "20000", "50000"],
  ["50,000km~100,000km", "50-100", "50000", "100000"],
  ["100,000km+", "100+", "100000", undefined],
];

const CAR_AGE_PILLS: [string, string, string | undefined, string | undefined][] = [
  ["All", "", undefined, undefined],
  ["0~1 year", "0-1", "2025", undefined],
  ["1~3 year", "1-3", "2023", "2025"],
  ["3~5 year", "3-5", "2021", "2023"],
  ["5~8 year", "5-8", "2018", "2021"],
  ["8+ year", "8+", undefined, "2018"],
];

export function QuickFilterBar({
  sp,
  options,
  lockCondition,
}: {
  sp: SP;
  options: FilterOptions;
  lockCondition?: "new" | "used";
}) {
  const pathname = usePathname();
  const activeMileage = MILEAGE_PILLS.find(([, , min, max]) => sp.minMileage === min && sp.maxMileage === max)?.[1] ?? "";
  const activeAge = CAR_AGE_PILLS.find(([, , min, max]) => sp.minYear === min && sp.maxYear === max)?.[1] ?? "";
  return (
    <div className="quick-filter-bar">
      <form method="get" id="quick-filter-form">
        {sp.collection && <input type="hidden" name="collection" value={sp.collection} />}
        <div className="quick-filter-row">
          <input name="q" placeholder="Search by title, brand, keywords…" defaultValue={sp.q ?? ""} />
          <select name="brand" defaultValue={sp.brand ?? ""}>
            <option value="">Brand: All</option>
            {options.brands.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select name="model" defaultValue={sp.model ?? ""}>
            <option value="">Model: All</option>
            {options.models.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={sp.type ?? ""}>
            <option value="">Category: All</option>
            {options.bodyTypes.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select name="fuel" defaultValue={sp.fuel ?? ""}>
            <option value="">Fuel: All</option>
            {options.fuels.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select name="maxPrice" defaultValue={sp.maxPrice ?? ""}>
            {PRICE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {value ? label.replace("Up to ", "Price: ") : "Price: All"}
              </option>
            ))}
          </select>
        </div>
        {lockCondition && <input type="hidden" name="condition" value={lockCondition} />}
        <input type="hidden" name="minMileage" value={sp.minMileage ?? ""} />
        <input type="hidden" name="maxMileage" value={sp.maxMileage ?? ""} />
        <input type="hidden" name="minYear" value={sp.minYear ?? ""} />
        <input type="hidden" name="maxYear" value={sp.maxYear ?? ""} />
      </form>
      <div className="quick-filter-actions">
        <FilterDrawer sp={sp} options={options} lockCondition={lockCondition} />
        <button className="btn primary" type="submit" form="quick-filter-form">
          Apply
        </button>
      </div>
      <div className="quick-pill-group">
        <b>Mileage</b>
        {MILEAGE_PILLS.map(([label, key, min, max]) => (
          <Link
            key={key}
            className={`quick-pill${key === activeMileage ? " active" : ""}`}
            href={buildListUrl(pathname, sp, { minMileage: min, maxMileage: max, page: undefined })}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="quick-pill-group">
        <b>Car age</b>
        {CAR_AGE_PILLS.map(([label, key, min, max]) => (
          <Link
            key={key}
            className={`quick-pill${key === activeAge ? " active" : ""}`}
            href={buildListUrl(pathname, sp, { minYear: min, maxYear: max, page: undefined })}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AvailabilityToggle({ sp }: { sp: SP }) {
  const hidden = Object.fromEntries(Object.entries(sp).filter(([key]) => key !== "availability" && key !== "page"));
  return (
    <form method="get" className="exclude-sold">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <select
        name="availability"
        defaultValue={sp.availability ?? "available"}
        aria-label="Availability"
        onChange={(e) => e.currentTarget.form?.submit()}
      >
        <option value="available">Hide sold</option>
        <option value="">Show all statuses</option>
      </select>
    </form>
  );
}

export function FloatingPager({
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
}) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (totalPages <= 1) return;
    const el = sentinelRef.current;
    if (!el) return;
    let bottomVisible = false;
    const sync = () => setVisible(!bottomVisible && window.scrollY > 500);
    const obs = new IntersectionObserver(
      ([entry]) => {
        bottomVisible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", sync);
    };
  }, [totalPages]);

  if (totalPages <= 1) return null;

  return (
    <>
      <div ref={sentinelRef} />
      <div className={`floating-pager${visible ? " is-visible" : ""}`}>
        <span className="floating-pager__summary">
          Page {page} / {totalPages}
        </span>
        <Link className={`btn ghost${page <= 1 ? " disabled" : ""}`} href={prevHref}>
          ← Prev
        </Link>
        <Link className={`btn ghost${page >= totalPages ? " disabled" : ""}`} href={nextHref}>
          Next →
        </Link>
      </div>
    </>
  );
}
