import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Car,
  Compass,
  Download,
  FileText,
  Gauge,
  MapPin,
  Palette,
  Route,
  Settings,
  Tag,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { DetailTabs, Gallery, ShareButton, SiteShell, VehicleCard } from "../../ui";
import { AddToCompareButton } from "../../compare-button";
import { AddToCartButton } from "../../cart-button";
import { VehicleRequestForm } from "../../request-form";
import { Price } from "../../price";
import { ResilientVehicleImage } from "../../vehicle-image";
import {WHATSAPP_URL} from "../../contact-links";
import {
  formatKm,
  getFeaturedVehicles,
  getTotalVehicleCount,
} from "../../../lib/vehicles";
import { convertFromCNY } from "../../../lib/currency";
import { imagePath } from "../../../lib/format";
import { fuelChoiceLabel } from "../../../lib/fuel-options";
import { rankVehicleImages } from "../../../lib/image-ranking";
import { getVehicleBySlug } from "../../../lib/vehicle-details";

// Was fully dynamic (re-rendered server-side on every single view, of
// 15,000+ listings) despite depending on nothing per-visitor — currency
// (Price), cart/compare state, and the request form are all client-side
// (localStorage), not read from cookies/headers here. ISR caches each
// listing's render after its first visit and serves that for an hour,
// which matches how often the underlying data actually changes (data:build
// is run manually, not continuously) rather than the default of never
// caching at all.
export const revalidate = 3600;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SKIP_SPEC_KEYS = new Set([
  "selling price",
  "seller-tags",
  "precio hainaauto",
  "precio original",
  "ajuste de precio hainaauto",
  "hainaauto price adjustment",
  "nota de precio",
]);

function shouldShowSpec([key, value]: [string, string]) {
  return Boolean(value) && !SKIP_SPEC_KEYS.has(key.trim().toLowerCase());
}

const SPEC_ICONS: [RegExp, typeof Zap][] = [
  [/energy/i, Zap],
  [/engine|motor/i, Wrench],
  [/horsepower|power/i, Gauge],
  [/mileage/i, Route],
  [/registration|date/i, Calendar],
  [/location/i, MapPin],
  [/body|structure/i, Car],
  [/msrp|price/i, Wallet],
  [/gearbox|transmission/i, Settings],
  [/drive/i, Compass],
  [/color/i, Palette],
];
function iconFor(key: string) {
  return SPEC_ICONS.find(([re]) => re.test(key))?.[1] ?? Tag;
}

function formatUsdCifPreview(cny: number | null | undefined): string {
  if (cny == null) return "CIF price on request";
  const usd = Math.round(convertFromCNY(cny, "USD"));
  return `USD ${usd.toLocaleString("en-US")} CIF`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return { robots: { index:false, follow:false } };
  const usdCifPrice = formatUsdCifPreview(vehicle.priceCNY);
  const shareDescription = `${vehicle.title} - ${usdCifPrice}. CIF includes vehicle, international ocean freight and marine insurance to the agreed destination port. Local destination charges not included.`;
  const description = `${vehicle.title}${vehicle.year ? `, año ${vehicle.year}` : ""}${vehicle.mileageKm != null ? `, ${formatKm(vehicle.mileageKm)}` : ""}. ${usdCifPrice}. Vehículo disponible para importar desde China a Venezuela con inspección, documentación y logística de HainaAuto.`;
  const primaryImage = rankVehicleImages(vehicle.images)[0];
  const previewImage = primaryImage
    ? new URL(imagePath(vehicle.site, vehicle.id, primaryImage), "https://hainautocn.com").toString()
    : "https://hainautocn.com/hainaauto-logo.webp";
  const canonicalUrl = `https://hainautocn.com/vehicles/${encodeURIComponent(vehicle.slug)}`;
  return {
    title: vehicle.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      siteName: "HainaAuto",
      locale: "zh_CN",
      url: canonicalUrl,
      title: vehicle.title,
      description: shareDescription,
      images: [{ url: previewImage, alt: vehicle.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: vehicle.title,
      description: shareDescription,
      images: [previewImage],
    },
    other: vehicle.priceCNY == null ? undefined : {
      "product:price:amount": String(Math.round(convertFromCNY(vehicle.priceCNY, "USD"))),
      "product:price:currency": "USD",
    },
  };
}

export default async function VehicleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const specEntries = Object.entries(vehicle.specs).filter(shouldShowSpec);
  const metaLine = [
    vehicle.year,
    vehicle.mileageKm != null ? formatKm(vehicle.mileageKm) : null,
    fuelChoiceLabel(vehicle.fuel),
    vehicle.location,
  ]
    .filter(Boolean)
    .join(" · ");

  const stockCode = vehicle.specs["Código de inventario"] || `${vehicle.site === "hainaauto" ? "HA" : vehicle.site === "cntransit" ? "CN" : vehicle.site === "hongyu" ? "HA-CN" : "HA-US"}-${vehicle.id}`;
  const chips = [vehicle.driveType, fuelChoiceLabel(vehicle.fuel), vehicle.gearbox, `Stock ${stockCode}`].filter(
    Boolean
  ) as string[];
  const totalVehicles = getTotalVehicleCount();
  const related = getFeaturedVehicles(4).filter((v) => v.slug !== vehicle.slug).slice(0, 3);

  return (
    <SiteShell>
      <div className="container vehicle-layout">
        <div>
          <div className="gallery-badges">
            <span>Export Ready</span>
            <span className="alt">Inspection Available</span>
          </div>
          <Gallery site={vehicle.site} id={vehicle.id} images={vehicle.images} title={vehicle.title} />

          {vehicle.otherColorPhotos.length > 0 && (
            <div className="other-colors">
              <h3>Also Available In Other Colors</h3>
              <p className="other-colors-note">
                These are photos of the same model from other listings, not this specific unit — click through to see that listing&apos;s own details and price.
              </p>
              <div className="other-colors-grid">
                {vehicle.otherColorPhotos.map((oc) => (
                  <Link key={oc.slug} href={`/vehicles/${oc.slug}`} className="other-color-card">
                    <span className="other-color-image">
                      <ResilientVehicleImage
                        candidates={[imagePath(oc.site, oc.id, oc.file)]}
                        alt={`${vehicle.title} in ${oc.color}`}
                        sizes="110px"
                        minimumWidth={0}
                        minimumHeight={0}
                      />
                    </span>
                    <span className="other-color-label">{capitalize(oc.color)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <span className="vehicle-title">
            {vehicle.site === "cntransit" ? "PARTNER LISTING" : "HAINAAUTO LISTING"}
          </span>
          <h1>{vehicle.title}</h1>
          <div className="vehicle-meta">{metaLine}</div>
          {chips.length > 0 && (
            <div className="detail-chips">
              {chips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          )}

          <div className="price-block">
            <small>Vehicle price</small>
            {vehicle.msrpCNY != null && vehicle.priceCNY != null && vehicle.msrpCNY > vehicle.priceCNY && (
              <div className="msrp">MSRP <Price cny={vehicle.msrpCNY}/></div>
            )}
            <div className="sale">
              <Price cny={vehicle.priceCNY}/>
            </div>
            <p className="cif-price-note"><b>CIF included</b> Vehicle, international ocean freight and marine insurance are included in HAINA AUTO quotations unless marked FOB.</p>
            <p className="cif-price-note"><b>Fuel choice</b> Diesel and Gasoline are shown by the actual vehicle configuration; Hybrid and Electric remain separate categories.</p>
          </div>

          <ul className="buy-checklist">
            <li>
              <b>✓</b>Vehicle inspection
            </li>
            <li>
              <b>✓</b>Export documentation support
            </li>
            <li>
              <b>✓</b>Shipping assistance
            </li>
          </ul>

          <div className="detail-actions">
            <Link className="btn primary" href={`/quote?vehicle=${encodeURIComponent(vehicle.slug)}#quote-form`}>
              Get Quote
            </Link>
            <a className="btn ghost" href={`/api/vehicle-specification-pdf?slug=${encodeURIComponent(vehicle.slug)}`}>
              <Download size={16} /> Download Specs
            </a>
            <a
              className="btn btn-whatsapp"
              href={WHATSAPP_URL}
            >
              WhatsApp Inquiry
            </a>
          </div>
          <div className="detail-secondary">
            <AddToCartButton slug={vehicle.slug} />
            <AddToCompareButton slug={vehicle.slug} />
            <ShareButton title={vehicle.title} />
          </div>

          {vehicle.overview && (
            <div className="overview-block">
              <h2>Vehicle Overview</h2>
              <p>{vehicle.overview}</p>
            </div>
          )}

          {specEntries.length > 0 && (
            <div className="overview-block">
              <h2>Specifications</h2>
              <div className="spec-tiles">
                {specEntries.map(([key, value]) => {
                  const Icon = iconFor(key);
                  return (
                    <div key={key}>
                      <small>
                        <Icon size={11} /> {key}
                      </small>
                      <b>{value}</b>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overview-block">
            <h2>Export Information</h2>
            <div className="export-info-tiles">
              <div>
                <small>Export Status</small>
                <b>Ready to Export</b>
              </div>
              <div>
                <small>Shipping</small>
                <b>RoRo / Container</b>
              </div>
              <div>
                <small>Documents</small>
                <b>Export Docs Ready</b>
              </div>
              <div>
                <small>Inspection</small>
                <b>Professional Inspection</b>
              </div>
              <div>
                <small>Destination</small>
                <b>Worldwide</b>
              </div>
            </div>
          </div>

          <DetailTabs
            panels={[
              [
                "Overview",
                <p key="o">
                  {vehicle.overview ||
                    "Contact our team for a full condition report and detailed specification sheet on this vehicle."}
                </p>,
              ],
              [
                "Specification",
                <p key="s">
                  <FileText size={14} />{" "}
                  <a href={`/api/vehicle-specification-pdf?slug=${encodeURIComponent(vehicle.slug)}`}>
                    Download the filled specification PDF for this vehicle.
                  </a>
                </p>,
              ],
              [
                "Process",
                <ul key="p">
                  <li>Inquiry &amp; quotation — confirm specification and pricing</li>
                  <li>Inspection &amp; payment — condition report, then T/T or L/C settlement</li>
                  <li>Shipping &amp; customs — RoRo, container or rail booking with export docs</li>
                  <li>
                    Delivery — arrival support at destination. <Link href="/services">Full export process →</Link>
                  </li>
                </ul>,
              ],
              [
                "FAQ",
                <ul key="f">
                  <li>Can I inspect this vehicle before purchase? Yes — on-site or third-party inspection can be arranged.</li>
                  <li>How long does shipping take? Typically 2–6 weeks after departure, depending on destination.</li>
                  <li>What payment methods do you accept? T/T, L/C and other agreed secure settlement methods.</li>
                </ul>,
              ],
            ]}
          />
        </div>

        <div id="request">
          <VehicleRequestForm vehicleSlug={vehicle.slug} vehicleTitle={vehicle.title} />
          <div className="side-card specialist-card">
            <span className="avatar" aria-label="HainaAuto export team">
              <img src="/hainaauto-logo.webp" alt="HainaAuto logo" />
            </span>
            <h3>Talk to Our Export Team</h3>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a href="mailto:sales@hainautocn.com">sales@hainautocn.com</a>
            <p>We typically respond within 24 hours.</p>
          </div>
          <div className="side-card">
            <h3>Why Buy From HainaAuto</h3>
            <ul className="why-buy-list">
              <li>
                <b>✓</b>
                {totalVehicles.toLocaleString()}+ export-ready vehicles
              </li>
              <li>
                <b>✓</b>Professional inspection
              </li>
              <li>
                <b>✓</b>Complete export documents
              </li>
              <li>
                <b>✓</b>Worldwide shipping
              </li>
              <li>
                <b>✓</b>After-sales support
              </li>
            </ul>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section tint">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">MORE OPTIONS</span>
              <h2>You may also like</h2>
            </div>
            <div className="car-grid">
              {related.map((v) => (
                <VehicleCard v={v} key={v.slug} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <Link className="btn ghost" href="/vehicles">
                Browse all vehicles
              </Link>
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
