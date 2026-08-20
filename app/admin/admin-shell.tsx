"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BriefcaseBusiness, FileSignature, LayoutDashboard, LogOut, Mail, Plus, TrendingUp, Users } from "lucide-react";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin/quotes", label: "Orders", icon: BriefcaseBusiness },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/sales", label: "Sales", icon: TrendingUp },
  { href: "/admin/contracts", label: "Contracts", icon: FileSignature },
] as const;

const DESKTOP_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ...LINKS,
  { href: "/admin/mail", label: "Mail", icon: Mail },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <Link className={styles.navBrand} href="/admin">
          <Image src="/hainaauto-logo.webp" alt="" width={31} height={31} className={styles.navBrandMark} />
          <span className={styles.navBrandText}>
            <b>HainaAuto</b>
            <span className={styles.navBrandRibbon}>Admin</span>
          </span>
        </Link>
        <div className={styles.desktopNav}>
          {DESKTOP_LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? styles.desktopNavActive : undefined}><Icon size={14}/>{label}</Link>;
          })}
          <Link className={styles.desktopCreate} href="/admin/quotes/new"><Plus size={14}/> New quote</Link>
          <button className={styles.navLogout} onClick={logout} type="button" aria-label="Log out">
            <LogOut size={15} /> <span>Log out</span>
          </button>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
      <div className={styles.bottomNav} role="navigation" aria-label="Admin navigation">
        <div className={styles.bottomNavInner}>
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? styles.bottomNavActive : undefined}>
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            );
          })}
          <Link className={styles.createAction} href="/admin/quotes/new" aria-label="Create a new quote or order">
            <Plus size={28} />
          </Link>
        </div>
      </div>
    </div>
  );
}
