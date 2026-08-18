import { notFound } from "next/navigation";
import { adminGetQuote } from "../../../../../lib/crm";
import { buildLineItems, formatDate, formatMoney, itemTitle, labelsFor } from "../../../../../lib/quote-document";
import styles from "./print.module.css";

const COMPANY = {
  name: "HAINA AUTO EXPORT",
  tag: "CHINA AUTO EXPORT",
  address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China",
  phone: "5623368661",
  email: "sales@hainaautochina.com",
  website: "hainaautochina.com",
  // Local asset, not hotlinked — img.hainaauto.com changed its content mid-
  // session once already, which would silently change past PDFs' letterhead.
  // Relative path resolves correctly regardless of deploy domain, since
  // Playwright always navigates here same-origin (see the pdf route).
  logo: "/hainaauto-logo.webp",
};

function Letterhead() {
  return (
    <div className={styles.footerBar}>
      <div className={styles.footerBarTop} />
      <div className={styles.footerBarText}>
        {COMPANY.name} — {COMPANY.address} · Tel {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}
      </div>
    </div>
  );
}

// Two photos per page, matching the sample's layout — the last page can be a
// single photo if the count is odd.
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default async function QuotePrintPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) notFound();

  const t = labelsFor(quote.language);
  const lineItems = buildLineItems(quote);
  const grandTotal = quote.grandTotalReference ?? quote.cifTotal;
  const depositPct = quote.depositPct ?? 40;

  const terms = [
    t.depositTerm(depositPct),
    t.daysValid(7),
    t.availabilityTerm,
    t.shippingTerm,
    t.dutyTerm,
  ];

  const photoPages = quote.items.flatMap((item) =>
    chunk(
      (item.photos ?? []).map((p) => ({ ...p, vehicleTitle: itemTitle(item) })),
      2
    )
  );

  return (
    <div className={styles.root}>
      {/* Cover page */}
      <div className={styles.page}>
        <div className={styles.topBar} />
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.logo} src={COMPANY.logo} alt="" />
            <div>
              <p className={styles.companyName}>{COMPANY.name}</p>
              <span className={styles.companyTag}>{COMPANY.tag}</span>
              <p className={styles.companyAddress}>{COMPANY.address}</p>
              <p className={styles.companyContact}>
                Tel: {COMPANY.phone} | {COMPANY.email} | {COMPANY.website}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <p className={styles.docTitle}>{t.docTitle}</p>
            <span className={styles.docNumber}>
              {t.docNumber} {quote.documentNumber ?? quote.ref}
            </span>
          </div>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t.date}</span>
            <span className={styles.summaryValue}>{formatDate(quote.quoteDate, quote.language)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t.validUntil}</span>
            <span className={styles.summaryValue}>{formatDate(quote.validUntil, quote.language)}</span>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
            <span className={styles.summaryLabel}>{t.total}</span>
            <span className={styles.summaryValue}>
              {quote.currency} {formatMoney(quote.cifTotal, quote.currency)}
            </span>
          </div>
        </div>

        <div className={styles.clientBar}>{t.client}</div>
        <div className={styles.clientBlock}>
          <p className={styles.clientName}>{quote.customer.name}</p>
          {quote.customer.address && <p className={styles.clientLine}>{quote.customer.address}</p>}
          <p className={styles.clientLine}>
            {[quote.customer.city, quote.customer.country].filter(Boolean).join(", ")}
          </p>
          <p className={styles.clientLine}>
            {[quote.customer.email, quote.customer.phone].filter(Boolean).join(" | ")}
          </p>
        </div>

        <p className={styles.termsLine}>
          {t.incoterms}: {quote.incoterm ?? "—"} · {t.destinationPort}: {quote.destinationPort} ·{" "}
          {t.estimatedDelivery}: {quote.deliveryEstimate ?? "—"}
        </p>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.article}</th>
              <th>{t.rate}</th>
              <th>{t.qty}</th>
              <th>{t.itemTotal}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, i) => (
              <tr key={i}>
                <td>
                  <div className={styles.itemLabel}>{row.label}</div>
                  {row.sub && <p className={styles.itemSub}>{row.sub}</p>}
                </td>
                <td className={styles.numCell}>{formatMoney(row.rate, quote.currency)}</td>
                <td className={styles.numCell}>{row.qty}</td>
                <td className={styles.numCell}>{formatMoney(row.total, quote.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totalsBlock}>
          <div className={styles.grandTotalRow}>
            <span className={styles.grandTotalLabel}>{t.payable}</span>
            <span className={styles.grandTotalValue}>
              <span className={styles.grandTotalCurrency}>{quote.currency}</span>
              {formatMoney(quote.cifTotal, quote.currency)}
            </span>
          </div>
          {quote.dutyEstimate != null && (
            <>
              <div className={styles.estimateRow}>
                <span className={styles.estimateLabel}>{t.destinationEstimate}</span>
                <span className={styles.estimateValue}>{formatMoney(quote.dutyEstimate, quote.currency)}</span>
              </div>
              <p className={styles.estimateNote}>{t.destinationEstimateNote}</p>
              <div className={styles.costToOwnRow}>
                <span className={styles.costToOwnLabel}>{t.costToOwn}</span>
                <span className={styles.costToOwnValue}>{formatMoney(grandTotal, quote.currency)}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.termsBlock}>
          <p className={styles.blockHeading}>{t.termsHeading}</p>
          <ol className={styles.termsList}>
            {terms.map((term, i) => (
              <li key={i}>
                {i + 1}. {term}
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.signatures}>
          <div className={styles.signature}>
            {t.signCompany}
            <span className={styles.signatureSub}>{t.signCompanySub}</span>
          </div>
          <div className={styles.signature}>
            {t.signBuyer}
            <span className={styles.signatureSub}>{t.signBuyerSub}</span>
          </div>
        </div>

        <Letterhead />
      </div>

      {/* Photo pages */}
      {photoPages.map((pagePhotos, pageIndex) => (
        <div className={styles.page} key={pageIndex}>
          <div className={styles.topBar} />
          <div className={styles.photoMiniHeader}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.photoMiniLogo} src={COMPANY.logo} alt="" />
            <div>
              <p className={styles.photoVehicleTitle}>{pagePhotos[0]?.vehicleTitle}</p>
              <p className={styles.photoVehicleSub}>{COMPANY.name} · {COMPANY.tag}</p>
            </div>
          </div>
          {pagePhotos.map((photo, i) => (
            <div className={styles.photoBlock} key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.photoImg} src={photo.url} alt={photo.caption ?? ""} />
              {photo.caption && <p className={styles.photoCaption}>{photo.caption}</p>}
            </div>
          ))}
          <Letterhead />
        </div>
      ))}
    </div>
  );
}
