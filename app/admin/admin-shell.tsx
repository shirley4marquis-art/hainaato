"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { ReactNode } from "react";
import {
  Car,
  DatabaseZap,
  FileSignature,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import styles from "./admin.module.css";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }> };

// Mobile primary tabs (spec §2). Everything else lives under "More".
const PRIMARY_TABS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/more", label: "More", icon: LayoutGrid },
];

// Routes that belong to the "More" section — used so the More tab highlights
// when you're anywhere inside one of them.
const MORE_ROUTES = [
  "/admin/more",
  "/admin/clients",
  "/admin/sales",
  "/admin/contracts",
  "/admin/imports",
  "/admin/mail",
  "/admin/security",
];

const DESKTOP_LINKS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/clients", label: "Customers", icon: Users },
  { href: "/admin/sales", label: "Sales", icon: TrendingUp },
  { href: "/admin/contracts", label: "Contracts", icon: FileSignature },
  { href: "/admin/imports", label: "Imports", icon: DatabaseZap },
  { href: "/admin/mail", label: "Mail", icon: Mail },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const moreActive = MORE_ROUTES.some((route) => isActive(pathname, route));

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <Link className={styles.navBrand} href="/admin" aria-label="HainaAuto admin dashboard">
          <Image src="/hainaauto-logo.webp" alt="" width={31} height={31} className={styles.navBrandMark} />
          <span className={styles.navBrandText}>
            <b>HainaAuto</b>
            <span className={styles.navBrandRibbon}>Admin</span>
          </span>
        </Link>
        <div className={styles.desktopNav}>
          {DESKTOP_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? styles.desktopNavActive : undefined}>
              <Icon size={14} />
              {label}
            </Link>
          ))}
          <Link className={styles.desktopCreate} href="/admin/quotes/new">
            <Plus size={14} /> New quote
          </Link>
          <button className={styles.navLogout} onClick={logout} type="button" aria-label="Log out">
            <LogOut size={15} /> <span>Log out</span>
          </button>
        </div>
      </header>

      <div className={styles.body}>{children}</div>

      <nav className={styles.bottomNav} aria-label="Admin navigation">
        <div className={styles.bottomNavInner}>
          {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin/more" ? moreActive : isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? styles.bottomNavActive : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
