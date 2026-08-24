"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHero, SiteShell } from "../ui";
import { ResilientVehicleImage } from "../vehicle-image";
import { formatKm } from "../../lib/format";
import { DEFAULT_CURRENCY, formatPrice } from "../../lib/currency";
import { COMPARE_MAX, removeFromCompare, useCompareSlugs } from "../compare-store";
import styles from "./compare.module.css";

type CompareVehicle = {
  slug: string;
  title: string;
  year: number | null;
  priceCNY: number | null;
  mileageKm: number | null;
  fuel: string | null;
  bodyType: string | null;
  gearbox: string | null;
  driveType: string | null;
  color: string | null;
  location: string | null;
  image: string | null;
};

function buildRows(): [string, (v: CompareVehicle) => string][] {
  return [
  ["Price", (v) => formatPrice(v.priceCNY, DEFAULT_CURRENCY)],
  ["Year", (v) => (v.year != null ? String(v.year) : "—")],
  ["Mileage", (v) => formatKm(v.mileageKm)],
  ["Fuel", (v) => v.fuel || "—"],
  ["Body type", (v) => v.bodyType || "—"],
  ["Gearbox", (v) => v.gearbox || "—"],
  ["Drive type", (v) => v.driveType || "—"],
  ["Color", (v) => v.color || "—"],
  ["Location", (v) => v.location || "—"],
  ];
}

export default function Compare() {
  const rows = buildRows();
  const slugs = useCompareSlugs();
  const key = slugs.join(",");
  const [fetchedVehicles, setFetchedVehicles] = useState<CompareVehicle[]>([]);
  // Tracks which slug set fetchedVehicles corresponds to, so "loading" is
  // derived during render instead of set synchronously inside the effect.
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);

  useEffect(() => {
    if (slugs.length === 0) return;
    let cancelled = false;
    fetch(`/api/compare?slugs=${slugs.map(encodeURIComponent).join(",")}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        setFetchedVehicles(data.vehicles ?? []);
        setFetchedKey(key);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedVehicles([]);
        setFetchedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [slugs, key]);

  const loading = slugs.length > 0 && fetchedKey !== key;
  const vehicles = slugs.length === 0 ? [] : fetchedVehicles;

  function handleRemove(slug: string) {
    removeFromCompare(slug);
  }

  const showEmpty = !loading && slugs.length === 0;

  return (
    <SiteShell>
      <PageHero
        kicker="VEHICLE SHORTLIST"
        title="Compare Vehicles"
        copy={`Choose up to ${COMPARE_MAX} vehicles from the catalogue to build a side-by-side shortlist.`}
      />
      <section className="section">
        <div className="container">
          {loading && <p>Loading…</p>}
          {showEmpty && (
            <div className="empty-state">
              <h2>No vehicles selected</h2>
              <p>Open a vehicle detail page and add it to your shortlist.</p>
              <Link className="btn primary" href="/vehicles">
                Browse vehicles
              </Link>
            </div>
          )}
          {!loading && vehicles.length > 0 && (
            <div className={styles.wrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    {vehicles.map((v) => (
                      <th key={v.slug}>
                        <div className={styles.vehicleHead}>
                          <Link href={`/vehicles/${v.slug}`}>{v.title}</Link>
                          <button type="button" className={styles.remove} onClick={() => handleRemove(v.slug)}>
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.label}>Photo</td>
                    {vehicles.map((v) => (
                      <td key={v.slug}>
                        <div className={styles.thumb}>
                          <ResilientVehicleImage candidates={[v.image]} alt={v.title} sizes="130px" minimumWidth={0} minimumHeight={0} />
                        </div>
                      </td>
                    ))}
                  </tr>
                  {rows.map(([label, get]) => (
                    <tr key={label}>
                      <td className={styles.label}>{label}</td>
                      {vehicles.map((v) => (
                        <td key={v.slug}>{get(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && vehicles.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <Link className="btn ghost" href="/vehicles">
                Browse more vehicles
              </Link>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
