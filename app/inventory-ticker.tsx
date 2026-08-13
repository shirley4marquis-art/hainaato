"use client";
import Link from "next/link";
import { formatCNY, imagePath, type VehicleSite } from "../lib/format";
import { ResilientVehicleImage } from "./vehicle-image";

export type TickerVehicle = {
  slug: string;
  site: VehicleSite;
  id: string;
  title: string;
  priceCNY: number | null;
  stockCode: string;
  thumb: string | null;
};

function TickerItem({ v }: { v: TickerVehicle }) {
  return (
    <Link className="ticker-item" href={`/vehicles/${v.slug}`}>
      <span className="ticker-thumb">
        <ResilientVehicleImage candidates={v.thumb ? [imagePath(v.site, v.id, v.thumb)] : []} alt="" sizes="28px" minimumWidth={0} minimumHeight={0} />
      </span>
      <b>{v.title}</b>
      <span className="ticker-detail">{v.stockCode}</span>
      <code>{formatCNY(v.priceCNY)}</code>
    </Link>
  );
}

// A real, current slice of inventory (see scripts/build-vehicles.mjs) — not a
// feed of customer activity. No invented names, no invented transactions.
export function InventoryTicker({ vehicles }: { vehicles: TickerVehicle[] }) {
  if (!vehicles.length) return null;
  const loop = [...vehicles, ...vehicles];
  return (
    <div className="header-ticker" aria-label="Sample of currently available inventory">
      <div className="container header-ticker-row">
        <span className="header-ticker-badge">
          <i />
          <span>AVAILABLE NOW</span>
        </span>
        <div className="header-ticker-viewport">
          <div className="header-ticker-track">
            {loop.map((v, i) => (
              <TickerItem key={`${v.slug}-${i}`} v={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
