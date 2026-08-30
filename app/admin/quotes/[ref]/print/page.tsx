import { notFound } from "next/navigation";
import { adminGetQuote } from "../../../../../lib/crm";
import {
  buildLineItems,
  estimateVenezuelaNationalization,
  formatDate,
  formatMoney,
  isCifQuote,
  itemTitle,
  labelsFor,
  quoteCifTotal,
  quoteNationalizationCifValue,
} from "../../../../../lib/quote-document";
import { parseHistoryRows } from "../../../../../lib/vehicle-document-details";
import styles from "./print.module.css";

const COMPANY = {
  name: "HAINA AUTO EXPORT",
  tag: "CHINA AUTO EXPORT",
  address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China",
  phone: "+86 150 3217 8759",
  email: "sales@hainautocn.com",
  website: "hainautocn.com",
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

function formatPdfAmount(amount: number, currency: string): string {
  return `${currency} ${formatMoney(amount, currency).replace(/^\$/, "")}`;
}

export default async function QuotePrintPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) notFound();

  const t = labelsFor(quote.language);
  const lineItems = buildLineItems(quote);
  const isCif = isCifQuote(quote);
  const effectiveCifTotal = quoteCifTotal(quote);
  const grandTotal = effectiveCifTotal + (quote.dutyEstimate ?? 0);
  const depositPct = quote.depositPct ?? 40;
  const depositAmount = effectiveCifTotal * (depositPct / 100);
  const balanceAmount = effectiveCifTotal - depositAmount;
  const nationalizationCifValue = quoteNationalizationCifValue(quote);
  const destinationPortLabel = quote.destinationPort.toUpperCase();
  const engineDisplacement = quote.items
    .map((item) => {
      const match = item.engine?.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|litros|litres)/i);
      return match ? Number(match[1]) : null;
    })
    .find((value): value is number => value != null) ?? 2.0;
  const venezuelaNationalization = quote.destinationCountry.toLowerCase().includes("venezuela")
    ? estimateVenezuelaNationalization({
        cifValue: nationalizationCifValue,
        engineDisplacementLiters: engineDisplacement,
      })
    : null;

  const terms = [
    t.depositTerm(depositPct),
    t.daysValid(7),
    t.availabilityTerm,
    t.shippingTerm,
    t.dutyTerm,
  ];

  const detailLabels = quote.language === "es"
    ? { details: "DETALLES DEL VEHÍCULO", configuration: "CONFIGURACIÓN Y EQUIPAMIENTO", condition: "Condición", mileage: "Kilometraje", fuel: "Combustible", transmission: "Transmisión", drivetrain: "Tracción", exterior: "Color exterior", interior: "Color interior", engine: "Motor", capacity: "Capacidad", quantity: "Cantidad", unitPrice: isCif ? "Precio unitario CIF" : "Precio unitario FOB", lineTotal: isCif ? "Total CIF del vehículo" : "Total del vehículo", unavailable: "Imagen no disponible" }
    : { details: "VEHICLE DETAILS", configuration: "CONFIGURATION & EQUIPMENT", condition: "Condition", mileage: "Mileage", fuel: "Fuel", transmission: "Transmission", drivetrain: "Drivetrain", exterior: "Exterior color", interior: "Interior color", engine: "Engine", capacity: "Capacity", quantity: "Quantity", unitPrice: isCif ? "CIF unit price" : "FOB unit price", lineTotal: isCif ? "Vehicle CIF total" : "Vehicle total", unavailable: "Image unavailable" };

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
              {quote.currency} {formatMoney(effectiveCifTotal, quote.currency)}
            </span>
          </div>
        </div>

        <div className={styles.partyGrid}>
          <section className={styles.partyCard}>
            <p className={styles.partyKicker}>{t.preparedFor}</p>
            <p className={styles.clientName}>{quote.customer.name}</p>
            {quote.customer.address && <p className={styles.clientLine}>{quote.customer.address}</p>}
            <p className={styles.clientLine}>
              {[quote.customer.city, quote.customer.country].filter(Boolean).join(", ")}
            </p>
            <p className={styles.clientLine}>
              {[quote.customer.email, quote.customer.phone].filter(Boolean).join(" | ")}
            </p>
          </section>
          <section className={styles.partyCard}>
            <p className={styles.partyKicker}>{t.preparedBy}</p>
            <p className={styles.clientName}>{COMPANY.name}</p>
            <p className={styles.clientLine}>{COMPANY.address}</p>
            <p className={styles.clientLine}>Tel {COMPANY.phone} | {COMPANY.email}</p>
            <p className={styles.clientLine}>{COMPANY.website}</p>
          </section>
        </div>

        <section className={styles.commercialSummary}>
          <div>
            <span>{t.commercialSummary}</span>
            <b>{t.quoteScope}</b>
          </div>
          <dl>
            <div>
              <dt>{t.incoterms}</dt>
              <dd>{quote.incoterm ?? "CIF"}</dd>
            </div>
            <div>
              <dt>{t.destinationPort}</dt>
              <dd>{quote.destinationPort}</dd>
            </div>
            <div>
              <dt>{t.estimatedDelivery}</dt>
              <dd>{quote.deliveryEstimate ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {isCif && (
          <section className={styles.cifNotice}>
            <div>
              <p className={styles.cifNoticeTitle}>{t.cifPriceHeading} — {destinationPortLabel}</p>
              <p className={styles.cifNoticeAmount}>{formatPdfAmount(effectiveCifTotal, quote.currency)}</p>
            </div>
            <div className={styles.cifIncludedBox}>
              <p>{t.cifIncludesHeading}</p>
              <ul>
                <li>{t.cifVehicleIncluded}</li>
                <li>{t.freight}</li>
                <li>{t.insurance}</li>
              </ul>
            </div>
            <p className={styles.destinationExclusionNote}>{t.destinationChargesExcluded}</p>
          </section>
        )}

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
                <td className={styles.numCell}>{row.rateText ?? formatMoney(row.rate ?? 0, quote.currency)}</td>
                <td className={styles.numCell}>{row.qty ?? "—"}</td>
                <td className={styles.numCell}>{row.totalText ?? formatMoney(row.total ?? 0, quote.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totalsBlock}>
          <div className={styles.grandTotalRow}>
            <span className={styles.grandTotalLabel}>{isCif ? `${t.totalCif} – ${destinationPortLabel}` : t.payable}</span>
            <span className={styles.grandTotalValue}>
              <span className={styles.grandTotalCurrency}>{quote.currency}</span>
              {formatMoney(effectiveCifTotal, quote.currency)}
            </span>
          </div>
          {quote.dutyEstimate != null && (
            <>
              <div className={styles.estimateRow}>
                <span className={styles.estimateLabel}>{t.destinationEstimate}</span>
                <span className={styles.estimateValue}>{formatMoney(quote.dutyEstimate, quote.currency)}</span>
              </div>
              <p className={styles.estimateNote}>{t.destinationEstimateNote}</p>
            </>
          )}
          {venezuelaNationalization && (
            <>
              <div className={styles.estimateRow}>
                <span className={styles.estimateLabel}>{t.customsPreview}</span>
                <span className={styles.estimateValue}>{formatMoney(venezuelaNationalization.total, quote.currency)}</span>
              </div>
              <p className={styles.estimateNote}>
                {t.customsPreviewNote} CIF = {formatMoney(venezuelaNationalization.cifValue, quote.currency)} · Duty = {formatMoney(venezuelaNationalization.importDuty, quote.currency)} · Service fee = {formatMoney(venezuelaNationalization.customsServiceFee, quote.currency)} · VAT = {formatMoney(venezuelaNationalization.vat, quote.currency)}{venezuelaNationalization.luxuryFee > 0 ? ` · Luxury surcharge = ${formatMoney(venezuelaNationalization.luxuryFee, quote.currency)}` : ""}.
              </p>
            </>
          )}
          <div className={styles.costToOwnRow}>
            <span className={styles.costToOwnLabel}>{t.costToOwn}</span>
            <span className={styles.costToOwnValue}>{formatMoney(grandTotal + (venezuelaNationalization?.total ?? 0), quote.currency)}</span>
          </div>
        </div>

        <section className={styles.paymentSchedule}>
          <p className={styles.blockHeading}>{t.paymentSchedule}</p>
          <div className={styles.paymentGrid}>
            <div>
              <span>{t.depositDue(depositPct)}</span>
              <b>{formatMoney(depositAmount, quote.currency)}</b>
              <small>{t.depositTiming}</small>
            </div>
            <div>
              <span>{t.balanceDue(depositPct)}</span>
              <b>{formatMoney(balanceAmount, quote.currency)}</b>
              <small>{t.balanceTiming}</small>
            </div>
          </div>
        </section>

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

      {/* One self-contained sheet per selected vehicle. Keeping the photos,
          specs and price together prevents details from one listing being
          mistaken for another in a multi-vehicle quotation. */}
      {quote.items.map((item, itemIndex) => {
        const photos = (item.photos ?? []).slice(0, 3);
        const details = [
          [detailLabels.condition, item.condition],
          [detailLabels.mileage, item.mileageKm != null ? `${item.mileageKm.toLocaleString("en-US")} km` : null],
          [detailLabels.fuel, item.fuelType],
          [detailLabels.transmission, item.transmission],
          [detailLabels.drivetrain, item.drivetrain],
          [detailLabels.exterior, item.exteriorColor],
          [detailLabels.interior, item.interiorColor],
          [detailLabels.engine, item.engine],
          [detailLabels.capacity, item.capacity != null ? String(item.capacity) : null],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]));
        const configurationRows = parseHistoryRows(item.historyNotes);
        return <div className={styles.page} key={`${item.make}-${item.model}-${itemIndex}`}>
          <div className={styles.topBar} />
          <div className={styles.photoMiniHeader}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.photoMiniLogo} src={COMPANY.logo} alt="" />
            <div>
              <p className={styles.photoVehicleTitle}>{itemTitle(item)}</p>
              <p className={styles.photoVehicleSub}>{detailLabels.details} · {itemIndex + 1}/{quote.items.length}</p>
            </div>
          </div>

          <div className={styles.vehicleSheetBody}>
            <div className={styles.vehiclePhotos}>
              {photos.length > 0 ? photos.map((photo, photoIndex) => (
                <figure className={styles.vehiclePhoto} key={`${photo.url}-${photoIndex}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.photoImg} src={photo.url} alt={photo.caption ?? ""} />
              {photo.caption && <p className={styles.photoCaption}>{photo.caption}</p>}
                </figure>
              )) : <div className={styles.photoUnavailable}>{detailLabels.unavailable}</div>}
            </div>

            <div className={styles.vehicleDetailsGrid}>
              {details.map(([label, value]) => <div className={styles.vehicleDetail} key={label}><span>{label}</span><b>{value}</b></div>)}
            </div>
            {item.specSummary && <p className={styles.vehicleSpecSummary}>{item.specSummary}</p>}
            {configurationRows.length > 0 && <div className={styles.vehicleConfigBlock}>
              <p>{detailLabels.configuration}</p>
              <div className={styles.vehicleConfigGrid}>
                {configurationRows.map((row) => <div key={`${row.label}-${row.value}`}><span>{row.label}</span><b>{row.value}</b></div>)}
              </div>
            </div>}
            <div className={styles.vehiclePriceGrid}>
              <div><span>{detailLabels.quantity}</span><b>{item.qty}</b></div>
              <div><span>{detailLabels.unitPrice}</span><b>{formatMoney(item.fobFinal, quote.currency)}</b></div>
              <div><span>{detailLabels.lineTotal}</span><b>{formatMoney(item.fobFinal * item.qty, quote.currency)}</b></div>
            </div>
          </div>
          <Letterhead />
        </div>
      })}
    </div>
  );
}
