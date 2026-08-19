"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QUOTE_STATUS_LABELS } from "../lib/format";

const UPDATE_CATEGORY: Record<string, string> = {
  quoted: "QUOTE", negotiating: "SALES", deposit_paid: "PAYMENT", paid_full: "PAYMENT",
  usdt_payment_confirmed: "USDT", bitcoin_payment_confirmed: "BITCOIN",
  inspection_scheduled: "INSPECTION", inspection_passed: "INSPECTION",
  export_docs_ready: "DOCUMENTS", booked_for_shipping: "LOGISTICS", shipped: "IN TRANSIT",
  departed_port: "VESSEL", arrived_port: "PORT ARRIVAL", customs_clearance: "CUSTOMS",
  out_for_delivery: "DELIVERY", delivered: "DELIVERED",
};

type ShipmentUpdate = {
  ref: string;
  destinationCountry: string;
  status: string;
  updatedAt: string;
  preview?: boolean;
};

const WORKFLOW_PREVIEWS: ShipmentUpdate[] = [
  "negotiating", "deposit_paid", "usdt_payment_confirmed", "bitcoin_payment_confirmed",
  "inspection_scheduled", "inspection_passed", "export_docs_ready", "booked_for_shipping",
  "departed_port", "arrived_port", "customs_clearance", "out_for_delivery", "delivered",
].map((status) => ({ ref: "STATUS PREVIEW", destinationCountry: "Order workflow", status, updatedAt: "", preview: true }));

function TickerItem({ u }: { u: ShipmentUpdate }) {
  return (
    <Link className={`ticker-item${u.preview ? " ticker-item-preview" : ""}`} href={u.preview ? "/services#export-flow" : "/quote/status"}>
      <em className={`ticker-category ticker-category-${u.status}`}>{UPDATE_CATEGORY[u.status] || "ORDER"}</em>
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
const POLL_INTERVAL_MS = 30_000;

export function ShipmentTicker() {
  const [updates, setUpdates] = useState<ShipmentUpdate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/shipment-updates")
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          if (!cancelled) setUpdates(Array.isArray(data.updates) ? data.updates : []);
        })
        .catch(() => {
          if (!cancelled) setUpdates((current) => current ?? []);
        });
    };
    load();
    // Polled rather than fetched once — new consented status updates should
    // appear in the ticker without the visitor having to reload the page.
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!updates) return null;
  const tickerItems = [...updates, ...WORKFLOW_PREVIEWS];
  const loop = [...tickerItems, ...tickerItems];
  return (
    <div className="header-ticker" aria-label="Recent consented shipment updates and previews of supported order statuses">
      <div className="container header-ticker-row">
        <span className="header-ticker-badge">
          <i />
          <span>LIVE ORDER UPDATES</span>
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
