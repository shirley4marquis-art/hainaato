"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, FileText, LogOut } from "lucide-react";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
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
      <nav className={styles.nav}>
        <Link className={styles.navBrand} href="/admin">
          <img src="/hainaauto-logo.webp" alt="" className={styles.navBrandMark} />
          <span className={styles.navBrandText}>
            <b>HainaAuto</b>
            <span className={styles.navBrandRibbon}>Admin</span>
          </span>
        </Link>
        <div className={styles.navLinks}>
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? styles.navLinkActive : undefined}>
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
          <button className={styles.navLogout} onClick={logout} type="button">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </nav>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
