/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { getVehicleIndexEntryBySlug, formatKm } from "../../../../lib/vehicles";
import { getVehicleBySlug } from "../../../../lib/vehicle-details";
import { imagePath } from "../../../../lib/format";
import { convertFromCNY } from "../../../../lib/currency";
import { fuelChoiceLabel } from "../../../../lib/fuel-options";
import { rankVehicleImages } from "../../../../lib/image-ranking";
import styles from "./specification.module.css";

const COMPANY = {
  name: "HAINA AUTO EXPORT",
  tag: "CHINA AUTO EXPORT",
  address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China",
  phone: "5623368661",
  email: "sales@hainaautochina.com",
  website: "hainaautochina.com",
  logo: "/hainaauto-logo.webp",
};

function money(cny: number | null): string {
  if (cny == null) return "Price on request";
  return `USD ${Math.round(convertFromCNY(cny, "USD")).toLocaleString("en-US")} CIF`;
}

function cleanSpecEntries(specs: Record<string, string>): [string, string][] {
  const skipped = new Set(["selling price", "seller-tags", "precio hainaauto", "precio original", "ajuste de precio hainaauto", "hainaauto price adjustment", "nota de precio"]);
  return Object.entries(specs).filter(([key, value]) => Boolean(value) && !skipped.has(key.trim().toLowerCase()));
}

export const revalidate = 3600;

export default async function VehicleSpecificationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  const indexEntry = getVehicleIndexEntryBySlug(slug);
  if (!vehicle || !indexEntry) notFound();

  const stockCode = vehicle.specs["Código de inventario"] || indexEntry.stockCode || `${vehicle.site.toUpperCase()}-${vehicle.id}`;
  const photos = rankVehicleImages(vehicle.images).slice(0, 3).map((file) => imagePath(vehicle.site, vehicle.id, file));
  const specEntries = cleanSpecEntries(vehicle.specs);
  const fields = [
    ["Stock code", stockCode],
    ["Make", indexEntry.brand],
    ["Model", indexEntry.model],
    ["Year", vehicle.year?.toString() ?? "—"],
    ["Condition", indexEntry.condition],
    ["Mileage", formatKm(vehicle.mileageKm)],
    ["Fuel", fuelChoiceLabel(vehicle.fuel)],
    ["Transmission", indexEntry.transmission ?? vehicle.gearbox ?? "—"],
    ["Drivetrain", vehicle.driveType ?? "—"],
    ["Body type", vehicle.bodyType ?? "—"],
    ["Exterior color", vehicle.color ?? "—"],
    ["Location", vehicle.location ?? "China"],
    ["Engine / displacement", vehicle.specs.Displacement ?? vehicle.specs.Engine ?? "—"],
    ["Interior color", vehicle.specs["Interior Color"] ?? "—"],
    ["Availability", indexEntry.availability],
    ["CIF price", money(vehicle.priceCNY)],
  ];

  return (
    <main className={styles.root}>
      <article className={styles.page}>
        <div className={styles.topBar} />
        <header className={styles.header}>
          <div className={styles.brand}>
            <img className={styles.logo} src={COMPANY.logo} alt="" />
            <div>
              <p className={styles.companyName}>{COMPANY.name}</p>
              <span className={styles.companyTag}>{COMPANY.tag}</span>
              <p className={styles.companyMeta}>
                {COMPANY.address}<br />
                Tel {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}
              </p>
            </div>
          </div>
          <div className={styles.docBlock}>
            <p className={styles.docTitle}>SPECIFICATION</p>
            <span className={styles.docNo}>No. {stockCode}</span>
          </div>
        </header>

        <section className={styles.hero}>
          <figure className={styles.heroImage}>
            {photos[0] && <img src={photos[0]} alt={vehicle.title} />}
          </figure>
          <div className={styles.heroSummary}>
            <div>
              <span className={styles.kicker}>Export-ready vehicle sheet</span>
              <h1 className={styles.title}>{vehicle.title}</h1>
            </div>
            <div className={styles.summaryGrid}>
              <div><span>Price</span><b>{money(vehicle.priceCNY)}</b></div>
              <div><span>Destination terms</span><b>CIF by default</b></div>
              <div><span>Documents</span><b>Export support available</b></div>
              <div><span>Inspection</span><b>Professional inspection available</b></div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Vehicle Details</h2>
          <div className={styles.fieldGrid}>
            {fields.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
          </div>
        </section>

        {photos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Vehicle Photos</h2>
            <div className={styles.photoGrid}>
              {photos.map((photo, index) => <figure key={photo}><img src={photo} alt={`${vehicle.title} photo ${index + 1}`} /></figure>)}
            </div>
          </section>
        )}

        {specEntries.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Full Specification Fields</h2>
            <table className={styles.specTable}>
              <tbody>
                {specEntries.map(([key, value]) => <tr key={key}><th>{key}</th><td>{value}</td></tr>)}
              </tbody>
            </table>
          </section>
        )}

        <section className={`${styles.section} ${styles.notes}`}>
          <div className={styles.noteBox}>
            <b>CIF quotation basis</b>
            Vehicle, international ocean freight and marine insurance are included in HAINA AUTO quotations unless the written quotation is explicitly marked FOB.
          </div>
          <div className={styles.noteBox}>
            <b>Destination charges</b>
            Import duties, port handling, registration, plates and other local destination-country charges are not included unless expressly stated.
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerRule} />
          <div className={styles.footerText}>{COMPANY.name} — {COMPANY.address} · Tel {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}</div>
        </footer>
      </article>
    </main>
  );
}
