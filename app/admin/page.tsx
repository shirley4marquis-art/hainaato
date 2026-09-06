import Link from "next/link";
import type { ComponentType } from "react";
import {
  Car,
  CheckCircle2,
  CreditCard,
  FileText,
  FilePlus2,
  Handshake,
  Inbox,
  Package,
  Ship,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AdminShell } from "./admin-shell";
import { adminListCustomers, adminListQuotes } from "../../lib/crm";
import { getTotalVehicleCount, searchVehicles } from "../../lib/vehicles";
import { quoteStatusMeta } from "./status";
import styles from "./admin.module.css";

// See the identical note in app/admin/quotes/page.tsx — without this, this
// page gets statically cached and silently stops reflecting new quotes.
export const dynamic = "force-dynamic";

const AWAITING_SHIPPING = new Set(["inspection_passed", "export_docs_ready", "booked_for_shipping"]);
const IN_TRANSIT = new Set(["shipped", "departed_port", "arrived_port", "customs_clearance", "out_for_delivery"]);
const CLOSED = new Set(["lost", "delivered"]);

export default async function AdminDashboard() {
  const [quotes, customers] = await Promise.all([adminListQuotes(), adminListCustomers()]);

  const totalVehicles = getTotalVehicleCount();
  const availableVehicles = searchVehicles({ availability: "available", pageSize: 1 }).total;

  const by = (predicate: (status: string) => boolean) => quotes.filter((q) => predicate(q.status)).length;
  const newInquiries = by((s) => s === "quoted");
  const negotiating = by((s) => s === "negotiating");
  const depositsPaid = by((s) => s === "deposit_paid" || s === "usdt_payment_confirmed" || s === "bitcoin_payment_confirmed");
  const awaitingShipping = by((s) => AWAITING_SHIPPING.has(s));
  const inTransit = by((s) => IN_TRANSIT.has(s));
  const activeCustomers = customers.filter((c) => c.quoteCount > 0).length;
  const pipelineValue = quotes
    .filter((q) => !CLOSED.has(q.status))
    .reduce((sum, q) => sum + (q.cifTotal ?? 0), 0);

  const recent = quotes.slice(0, 8);

  const cards: {
    label: string;
    value: number;
    href: string;
    icon: ComponentType<{ size?: number }>;
    hint?: string;
    tone?: "warn" | "active";
  }[] = [
    { label: "Total vehicles", value: totalVehicles, href: "/admin/vehicles", icon: Car },
    { label: "Available vehicles", value: availableVehicles, href: "/admin/vehicles", icon: CheckCircle2, hint: `${totalVehicles - availableVehicles} reserved / sold` },
    { label: "New inquiries", value: newInquiries, href: "/admin/quotes", icon: Inbox, hint: newInquiries ? "Needs a first quote" : undefined, tone: newInquiries ? "warn" : undefined },
    { label: "In negotiation", value: negotiating, href: "/admin/quotes?group=quote", icon: Handshake },
    { label: "Active customers", value: activeCustomers, href: "/admin/clients", icon: Users, hint: `${customers.length} on file` },
    { label: "Deposits paid", value: depositsPaid, href: "/admin/quotes", icon: Wallet, tone: depositsPaid ? "active" : undefined },
    { label: "Awaiting shipping", value: awaitingShipping, href: "/admin/quotes", icon: Package, tone: awaitingShipping ? "warn" : undefined },
    { label: "In transit", value: inTransit, href: "/admin/quotes", icon: Ship, tone: inTransit ? "active" : undefined },
  ];

  const quickActions = [
    { label: "Add vehicle", href: "/admin/imports", icon: Car },
    { label: "Add customer", href: "/admin/clients", icon: UserPlus },
    { label: "Create quote", href: "/admin/quotes/new", icon: FileText },
    { label: "Generate document", href: "/admin/documents", icon: FilePlus2 },
    { label: "Add shipment", href: "/admin/quotes", icon: Truck },
    { label: "Record payment", href: "/admin/quotes", icon: CreditCard },
  ] as const;

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Operations center</span>
          <h1>Dashboard</h1>
          <p>Vehicles, customers, quotes, documents, payments and shipping — at a glance.</p>
        </div>
      </div>

      <section className={styles.quickGrid} aria-label="Quick actions">
        {quickActions.map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <span>
              <Icon size={18} />
            </span>
            {label}
          </Link>
        ))}
      </section>

      <div className={styles.opsGrid}>
        {cards.map(({ label, value, href, icon: Icon, hint, tone }) => (
          <Link key={label} className={styles.opCard} href={href}>
            <span className={styles.opCardTop}>
              <Icon size={15} />
              <span className={styles.opCardLabel}>{label}</span>
            </span>
            <span className={styles.opCardValue}>{value.toLocaleString()}</span>
            {hint && (
              <span className={styles.opCardHint} data-tone={tone}>
                {hint}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>
            <Wallet size={18} />
          </span>
          <div>
            <p className={styles.statLabel}>Open pipeline value</p>
            <p className={styles.statValue}>${Math.round(pipelineValue).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Latest activity</span>
            <h2>Recent orders</h2>
          </div>
          <Link className={styles.btnGhost} href="/admin/quotes">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={28} />
            <p style={{ margin: 0 }}>No orders yet.</p>
          </div>
        ) : (
          <div className={styles.rowList}>
            {recent.map((q) => {
              const meta = quoteStatusMeta(q.status);
              const Icon = meta.icon;
              return (
                <Link className={styles.dataRow} href={`/admin/quotes/${q.ref}`} key={q.ref}>
                  <span className={styles.dataRowThumbIcon}>
                    <Icon size={18} />
                  </span>
                  <div className={styles.dataRowMain}>
                    <b>{q.customerName}</b>
                    <p>
                      {q.documentNumber ?? q.ref} · {q.vehicleSummary} · {q.destinationCountry}
                    </p>
                    <span className={styles.statusPill} data-tone={meta.tone}>
                      {meta.label}
                    </span>
                  </div>
                  <div className={styles.dataRowMeta}>
                    <b>
                      {q.currency} {Math.round(q.cifTotal).toLocaleString()}
                    </b>
                    <small>{new Date(q.createdAt).toLocaleDateString()}</small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
