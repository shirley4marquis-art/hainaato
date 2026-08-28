import Link from "next/link";
import { ArrowRight, Inbox, Plus } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListQuotes } from "../../../lib/crm";
import { isLikelyRealEmail } from "../../../lib/valid-email";
import { STATUS_ORDER, ORDER_STAGE_GROUPS, quoteStatusMeta, quoteStatusProgress } from "../status";
import { QuoteDeleteButton } from "../quote-delete-button";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const GROUPS = {
  all: { label: "All", statuses: STATUS_ORDER },
  ...ORDER_STAGE_GROUPS,
} as const;

type GroupKey = keyof typeof GROUPS;

export default async function AdminQuotesList({ searchParams }: { searchParams: Promise<{ group?: string; flag?: string }> }) {
  const quotes = await adminListQuotes();
  const params = await searchParams;
  const requested = params.group;
  const activeGroup: GroupKey = requested && requested in GROUPS ? requested as GroupKey : "all";
  const allowed = activeGroup === "all" ? null : new Set<string>(GROUPS[activeGroup].statuses);
  const emailFlagOnly = params.flag === "email";
  const groupFiltered = allowed ? quotes.filter((quote) => allowed.has(quote.status)) : quotes;
  const filtered = emailFlagOnly ? groupFiltered.filter((quote) => !isLikelyRealEmail(quote.customerEmail)) : groupFiltered;
  const suspectCount = groupFiltered.filter((quote) => !isLikelyRealEmail(quote.customerEmail)).length;

  function groupHref(key: GroupKey): string {
    const qs = new URLSearchParams();
    if (key !== "all") qs.set("group", key);
    if (emailFlagOnly) qs.set("flag", "email");
    const query = qs.toString();
    return query ? `/admin/quotes?${query}` : "/admin/quotes";
  }

  function emailToggleHref(): string {
    const qs = new URLSearchParams();
    if (activeGroup !== "all") qs.set("group", activeGroup);
    if (!emailFlagOnly) qs.set("flag", "email");
    const query = qs.toString();
    return query ? `/admin/quotes?${query}` : "/admin/quotes";
  }

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <div><span className={styles.eyebrow}>Order operations</span><h1>Track every order</h1><p>Move from quote to delivery with one live status record.</p></div>
        <Link className={styles.btn} href="/admin/quotes/new"><Plus size={15} /> New quote</Link>
      </div>

      <div className={styles.filterRow} aria-label="Order progress categories">
        {(Object.entries(GROUPS) as [GroupKey, typeof GROUPS[GroupKey]][]).map(([key, group]) => {
          const groupStatuses = new Set<string>(group.statuses);
          const count = quotes.filter((quote) => groupStatuses.has(quote.status)).length;
          return <Link key={key} href={groupHref(key)} className={key === activeGroup ? styles.filterActive : undefined}>{group.label}<b>{count}</b></Link>;
        })}
        <Link href={emailToggleHref()} className={emailFlagOnly ? styles.filterActive : undefined}>⚠ No/fake email<b>{suspectCount}</b></Link>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}><Inbox size={28} /><p>No records in this stage.</p></div>
      ) : (
        <div className={styles.recordList}>
          {filtered.map((quote) => {
            const status = quote.status;
            const meta = quoteStatusMeta(status);
            const Icon = meta.icon;
            const progress = quoteStatusProgress(status);
            const realEmail = isLikelyRealEmail(quote.customerEmail);
            return (
              <div className={styles.orderCardWrap} key={quote.ref}>
                <Link className={styles.orderCard} href={`/admin/quotes/${quote.ref}`}>
                  <div className={styles.orderMain}>
                    <span className={styles.orderRef}>{quote.documentNumber ?? quote.ref}</span>
                    <h2>{quote.customerName}</h2>
                    <p>{quote.vehicleSummary} · {quote.destinationCountry}</p>
                    <span className={`${styles.emailBadge}${realEmail ? "" : ` ${styles.emailBadgeWarn}`}`}>
                      {quote.customerEmail ?? "No email on file"}
                    </span>
                  </div>
                  <div className={styles.orderProgress}>
                    <span className={styles.statusPill} data-tone={meta.tone}><Icon size={11} /> {meta.label}</span>
                    <div><i style={{ width: `${progress}%` }} /></div>
                    <small>{status === "lost" ? "Closed" : `${progress}% progress`}</small>
                  </div>
                  <div className={styles.orderValue}><b>{quote.currency} {quote.cifTotal.toLocaleString()}</b><small>{new Date(quote.createdAt).toLocaleDateString()}</small></div>
                  <ArrowRight className={styles.orderArrow} size={17} />
                </Link>
                <QuoteDeleteButton quoteRef={quote.ref} label={quote.documentNumber ?? quote.ref} />
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
