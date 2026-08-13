"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QUOTE_STATUS_LABELS } from "../lib/format";

type ShipmentUpdate = {
  ref: string;
  destinationCountry: string;
  status: string;
  updatedAt: string;
};

function TickerItem({ u }: { u: ShipmentUpdate }) {
  return (
    <Link className="ticker-item" href="/quote/status">
      <b>{u.ref}</b>
      <span className="ticker-detail">{u.destinationCountry}</span>
      <code>{QUOTE_STATUS_LABELS[u.status] || u.status}</code>
    </Link>
  );
}

// Real per-order status only, and only for quotes whose customer explicitly
// opted in when they submitted the lead form (see app/submit-lead.ts /
// lib/crm.ts getShipmentUpdates). No name, phone, email or amount is ever
// fetched, let alone shown. Renders nothing until at least one customer has
// actually consented — no placeholder/sample content while empty.
export function ShipmentTicker() {
  const [updates, setUpdates] = useState<ShipmentUpdate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipment-updates")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setUpdates(Array.isArray(data.updates) ? data.updates : []);
      })
      .catch(() => {
        if (!cancelled) setUpdates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!updates || updates.length === 0) return null;
  const loop = [...updates, ...updates];
  return (
    <div className="header-ticker" aria-label="Recent shipment status updates, shown with customer consent">
      <div className="container header-ticker-row">
        <span className="header-ticker-badge">
          <i />
          <span>SHIPMENT UPDATES</span>
        </span>
        <div className="header-ticker-viewport">
          <div className="header-ticker-track">
            {loop.map((u, i) => (
              <TickerItem key={`${u.ref}-${i}`} u={u} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
