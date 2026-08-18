"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <span className={styles.navBrand}>HainaAuto Admin</span>
        <div className={styles.navLinks}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/quotes">Quotes</Link>
          <button className={styles.navLogout} onClick={logout} type="button">
            Log out
          </button>
        </div>
      </nav>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
