"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  Activity,
  Building2,
  ClipboardList,
  CreditCard,
  DatabaseZap,
  FileSignature,
  LogOut,
  Mail,
  Settings,
  Ship,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

type Item = {
  label: string;
  desc: string;
  href?: string;
  icon: ComponentType<{ size?: number }>;
};

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operations",
    items: [
      { label: "Customers", desc: "Profiles, orders and history", href: "/admin/clients", icon: Users },
      { label: "Orders", desc: "Every quote-to-delivery record", href: "/admin/quotes", icon: ClipboardList },
      { label: "Payments", desc: "Deposits and balance confirmations", href: "/admin/operations?kind=payment", icon: CreditCard },
      { label: "Shipping", desc: "Bookings, vessels and tracking", href: "/admin/operations?kind=shipment", icon: Ship },
      { label: "Customs", desc: "Nationalization and clearance", href: "/admin/operations?kind=customs", icon: Truck },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Sales", desc: "Pipeline and conversion", href: "/admin/sales", icon: TrendingUp },
      { label: "Contracts", desc: "Signed commercial agreements", href: "/admin/contracts", icon: FileSignature },
      { label: "Imports", desc: "Review inventory candidates", href: "/admin/imports", icon: DatabaseZap },
      { label: "Mail", desc: "Customer email history", href: "/admin/mail", icon: Mail },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Website management", desc: "Catalogue and public content", href: "/admin/website", icon: Building2 },
      { label: "Admin users", desc: "Staff accounts and roles", href: "/admin/users", icon: ShieldCheck },
      { label: "Activity logs", desc: "Security and audit trail", href: "/admin/activity", icon: Activity },
      { label: "Settings", desc: "Company and document defaults", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>All sections</span>
          <h1>More</h1>
          <p>Everything outside the main tabs.</p>
        </div>
      </div>

      {GROUPS.map((group) => (
        <section className={styles.moreGroup} key={group.title}>
          <h2 className={styles.moreGroupTitle}>{group.title}</h2>
          <div className={styles.moreList}>
            {group.items.map(({ label, desc, href, icon: Icon }) => {
              const content = (
                <>
                  <span className={styles.moreItemIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.moreItemText}>
                    <b>{label}</b>
                    <small>{href ? desc : "Coming soon"}</small>
                  </span>
                </>
              );
              return href ? (
                <Link className={styles.moreItem} href={href} key={label}>
                  {content}
                </Link>
              ) : (
                <div className={styles.moreItem} aria-disabled="true" key={label}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <button className={styles.moreLogout} type="button" onClick={logout}>
        <LogOut size={15} /> Log out
      </button>
    </AdminShell>
  );
}
