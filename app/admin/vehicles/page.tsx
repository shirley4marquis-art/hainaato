import Link from "next/link";
import { Car, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { searchVehicles, getTotalVehicleCount } from "../../../lib/vehicles";
import { formatCNY, formatKm, imagePath } from "../../../lib/format";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const AVAIL_FILTERS = [
  { key: "", label: "All" },
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
] as const;

type Params = { q?: string; availability?: string; page?: string };

export default async function AdminVehiclesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const availability = ["available", "reserved", "sold"].includes(sp.availability ?? "")
    ? (sp.availability as "available" | "reserved" | "sold")
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const total = getTotalVehicleCount();
  const available = searchVehicles({ availability: "available", pageSize: 1 }).total;
  const reserved = searchVehicles({ availability: "reserved", pageSize: 1 }).total;
  const sold = searchVehicles({ availability: "sold", pageSize: 1 }).total;

  const result = searchVehicles({ q: q || undefined, availability, page, pageSize: PAGE_SIZE });

  function hrefWith(next: Partial<Params>): string {
    const merged = new URLSearchParams();
    const value = { q, availability: sp.availability ?? "", page: String(page), ...next };
    if (value.q) merged.set("q", value.q);
    if (value.availability) merged.set("availability", value.availability);
    if (value.page && value.page !== "1") merged.set("page", value.page);
    const qs = merged.toString();
    return qs ? `/admin/vehicles?${qs}` : "/admin/vehicles";
  }

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Inventory</span>
          <h1>Vehicles</h1>
          <p>{total.toLocaleString()} vehicles in the catalogue.</p>
        </div>
        <Link className={styles.btn} href="/admin/imports">
          Add via imports
        </Link>
      </div>

      <div className={styles.opsGrid}>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <Car size={15} />
            <span className={styles.opCardLabel}>Total</span>
          </span>
          <span className={styles.opCardValue}>{total.toLocaleString()}</span>
        </div>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <span className={styles.opCardLabel}>Available</span>
          </span>
          <span className={styles.opCardValue}>{available.toLocaleString()}</span>
        </div>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <span className={styles.opCardLabel}>Reserved</span>
          </span>
          <span className={styles.opCardValue}>{reserved.toLocaleString()}</span>
        </div>
        <div className={styles.opCard}>
          <span className={styles.opCardTop}>
            <span className={styles.opCardLabel}>Sold</span>
          </span>
          <span className={styles.opCardValue}>{sold.toLocaleString()}</span>
        </div>
      </div>

      <form className={styles.searchBar} action="/admin/vehicles" method="get">
        <Search size={16} />
        <input name="q" defaultValue={q} placeholder="Search title or stock code" aria-label="Search vehicles" />
        {sp.availability ? <input type="hidden" name="availability" value={sp.availability} /> : null}
        <button type="submit">Search</button>
      </form>

      <div className={styles.filterRow} aria-label="Availability">
        {AVAIL_FILTERS.map((f) => {
          const active = (sp.availability ?? "") === f.key;
          return (
            <Link key={f.label} href={hrefWith({ availability: f.key, page: "1" })} className={active ? styles.filterActive : undefined}>
              {f.label}
            </Link>
          );
        })}
      </div>

      {result.vehicles.length === 0 ? (
        <div className={styles.emptyState}>
          <Car size={28} />
          <p style={{ margin: 0 }}>No vehicles match this search.</p>
        </div>
      ) : (
        <div className={styles.rowList}>
          {result.vehicles.map((v) => {
            const specLine = [v.year, v.mileageKm != null ? formatKm(v.mileageKm) : null, v.fuel, v.stockCode]
              .filter(Boolean)
              .join(" · ");
            const thumb = v.thumb ? imagePath(v.site, v.id, v.thumb) : null;
            return (
              <a
                className={styles.dataRow}
                href={`/vehicles/${v.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                key={v.slug}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.dataRowThumb} src={thumb} alt="" />
                ) : (
                  <span className={styles.dataRowThumbIcon}>
                    <Car size={20} />
                  </span>
                )}
                <div className={styles.dataRowMain}>
                  <b>{v.title}</b>
                  <p>{specLine || v.location || "Export ready"}</p>
                  <span className={styles.statusPill} data-tone={v.availability === "available" ? "green" : v.availability === "reserved" ? "amber" : "red"}>
                    {v.availability}
                  </span>
                </div>
                <div className={styles.dataRowMeta}>
                  <b>{formatCNY(v.priceCNY)}</b>
                  <small>
                    <ExternalLink size={10} /> Open
                  </small>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <div className={styles.pager}>
        {page > 1 ? (
          <Link href={hrefWith({ page: String(page - 1) })}>
            <ChevronLeft size={14} /> Previous
          </Link>
        ) : (
          <span>
            <ChevronLeft size={14} /> Previous
          </span>
        )}
        <small>
          Page {result.page} of {result.totalPages} · {result.total.toLocaleString()} results
        </small>
        {page < result.totalPages ? (
          <Link href={hrefWith({ page: String(page + 1) })}>
            Next <ChevronRight size={14} />
          </Link>
        ) : (
          <span>
            Next <ChevronRight size={14} />
          </span>
        )}
      </div>
    </AdminShell>
  );
}
