import { notFound } from "next/navigation";
import { adminGetQuote } from "../../../../../lib/crm";
import {
  estimateVenezuelaNationalization,
  formatDate,
  formatMoney,
  isCifQuote,
  itemTitle,
  quoteNationalizationCifValue,
} from "../../../../../lib/quote-document";
import { computeQuoteTotals, decomposeCif } from "../../../../../lib/quote-totals";
import { amountInWords } from "../../../../../lib/amount-in-words";
import styles from "./print.module.css";

const COMPANY = {
  name: "HAINA AUTO EXPORT",
  address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China",
  phone: "+86 150 3217 8759",
  email: "sales@nindgeauto.com",
  website: "nindgeauto.com",
  // Local asset, not hotlinked — relative path resolves correctly regardless
  // of deploy domain, since Playwright always navigates here same-origin.
  logo: "/hainaauto-logo.webp",
};

// UN/LOCODE for the ports HAINA AUTO actually ships to, shown next to the
// freight line the way the reference quotation does ("Puerto Cabello (VEPBL)").
function portCode(port: string): string | null {
  const p = port.toLowerCase();
  if (p.includes("cabello")) return "VEPBL";
  if (p.includes("guaira")) return "VELAG";
  if (p.includes("maracaibo")) return "VEMAR";
  if (p.includes("callao")) return "PECLL";
  if (p.includes("cartagena")) return "COCTG";
  if (p.includes("buenaventura")) return "COBUN";
  if (p.includes("guayaquil")) return "ECGYE";
  if (p.includes("valparaiso") || p.includes("valparaíso")) return "CLVAP";
  if (p.includes("san antonio")) return "CLSAI";
  return null;
}

function n(amount: number, currency: string): string {
  return formatMoney(amount, currency).replace(/^[^\d-]+/, "");
}

export default async function QuotePrintPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) notFound();

  const lang = quote.language;
  const es = lang === "es";
  const isCif = isCifQuote(quote);
  const cur = quote.currency;
  const incotermLabel = isCif ? "CIF" : "FOB";

  const totals = computeQuoteTotals(quote);
  const unitCount = quote.items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const cifBreakdown = decomposeCif(totals.cifTotal, {
    units: unitCount,
    incoterm: quote.incoterm,
    freightCost: quote.freightCost,
    insuranceCost: quote.insuranceCost,
    inlandTransportCost: quote.inlandTransportCost,
    exportDocumentationCost: quote.exportDocumentationCost,
  });

  const isVenezuela = quote.destinationCountry.toLowerCase().includes("venezuela");
  const engineDisplacement = quote.items
    .map((item) => {
      const match = item.engine?.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|litros|litres|t)\b/i);
      return match ? Number(match[1]) : null;
    })
    .find((value): value is number => value != null) ?? 2.0;
  const customs = isVenezuela
    ? estimateVenezuelaNationalization({
        cifValue: quoteNationalizationCifValue(quote),
        engineDisplacementLiters: engineDisplacement,
      })
    : null;
  const grandEstimate = totals.cifTotal + (customs?.total ?? 0);

  const port = quote.destinationPort;
  const portUpper = port.toUpperCase();
  const code = portCode(port);
  const dutyPctLabel = customs ? Math.round(customs.importDutyRate * 100) : 20;

  const T_units = (q: number, spanish: boolean): string =>
    spanish ? (q === 1 ? "Una (1) unidad" : `${q} unidades`) : q === 1 ? "One (1) unit" : `${q} units`;

  const T = es
    ? {
        docTitle: "COTIZACIÓN COMERCIAL",
        no: "N.º",
        companyTag: "EXPORTACIÓN DE AUTOMÓVILES DE CHINA",
        client: "Cliente",
        cName: "Nombre / empresa",
        cEmail: "Correo electrónico",
        cPhone: "Teléfono",
        cQty: "Cantidad",
        cPort: "Puerto de destino",
        cIncoterm: "Incoterm",
        cValid: "Validez de la oferta",
        validUntil: (d: string) => `Hasta el ${d}`,
        units: (q: number) => `${q} ${q === 1 ? "(una) unidad" : `(${q}) unidades`}`,
        incotermValue: `${incotermLabel} ${port} (Incoterms® 2020)`,
        object: "Objeto de la oferta",
        objectText: `${T_units(unitCount, true)} con entrega ${incotermLabel} en ${port}, ${quote.destinationCountry}.`,
        stock: "Stock",
        factory: "Fábrica",
        location: "Ubicación",
        available: "Disponible",
        totalsHeading: "TOTALES DE ESTA OFERTA",
        concept: "Concepto",
        fobSubtotalRow: "Subtotal FOB (vehículo + origen China)",
        freightRow: `Flete a ${port} + seguro mínimo CIF`,
        payToHaina: `TOTAL A PAGAR A HAINA AUTO · ${incotermLabel} ${portUpper}`,
        tributesRow: `Tributos SENIAT estimados (arancel ${dutyPctLabel}% + tasa 1% + IVA 16%)`,
        portRow: "Puerto, almacenaje y agente de aduana en destino",
        variable: "variable / no incluido",
        grandRow: `TOTAL GENERAL ESTIMADO · ${incotermLabel} + tributos (sin puerto ni agente)`,
        payStatement: `A pagar a ${COMPANY.name}: ${cur} ${n(totals.cifTotal, cur)} ${incotermLabel}. En letras: ${amountInWords(totals.cifTotal, cur, lang)}.`,
        cifCheck: `Comprobación ${incotermLabel}: ${n(cifBreakdown.fobSubtotal, cur)} FOB + ${n(cifBreakdown.oceanFreight, cur)} flete + ${n(cifBreakdown.marineInsurance, cur)} seguro = ${n(totals.cifTotal, cur)}.`,
        grandDisclaimer: `El total general de ${cur} ${n(grandEstimate, cur)} es una estimación de referencia (${incotermLabel} + tributos al ${dutyPctLabel}%). No es DDP. Puerto, almacenaje y agente los paga el cliente en ${quote.destinationCountry}.`,
        // page 2
        cifBreakdownTitle: "Desglose interno del CIF — valores de mercado aproximados",
        cifBreakdownIntro: `Estas partidas reconstruyen el CIF de ${cur} ${n(totals.cifTotal, cur)}. Son asignaciones internas de referencia. El cliente paga el total CIF a HAINA; no se facturan estas líneas por separado salvo pacto escrito.`,
        sectionA: "A. Componentes FOB (hasta el costado del buque en origen)",
        item: "Partida",
        a1: "1. Valor del vehículo / mercancía (ex works interno)",
        a2: "2. Despacho aduanero de exportación en China",
        a3: "3. Manipulación portuaria / terminal de origen (THC)",
        a4: "4. Documentación y fees de exportación / shipping",
        a5: "5. Emisión del conocimiento de embarque (B/L)",
        subtotalFob: "SUBTOTAL FOB",
        aNote: "Base: despacho ~RMB 350–900; B/L ~CNY 300–450 (≈ USD 42–65); THC origen por unidad en rango bajo-medio.",
        sectionB: "B. De FOB a CIF",
        b6: `6. Flete marítimo a ${port}${code ? ` (${code})` : ""}`,
        b7: "7. Seguro de carga — mínimo CIF ICC (C), 110% del valor",
        subtotalFreight: "SUBTOTAL FLETE + SEGURO",
        bNote: `Flete: cuota de una pickup en Ro-Ro o contenedor compartido, China → ${port}, 35–45 días. Seguro: ${n(totals.cifTotal, cur)} × 110% × ≈0,42% ≈ ${cur} ${n(cifBreakdown.marineInsurance, cur)}. Cobertura mínima CIF, no ICC (A).`,
        sectionC: "C. Identidad aritmética",
        cFob: "FOB (partidas 1 a 5)",
        cFreight: "+ Flete (partida 6)",
        cInsurance: "+ Seguro (partida 7)",
        cTotal: `= TOTAL CIF ${portUpper} (a pagar a HAINA)`,
        // page 3
        annexTitle: `Anexo — Aduana de ${quote.destinationCountry} (NO incluido en el CIF)`,
        annexIntro: `El CIF cubre vehículo, flete y seguro hasta ${port}. Aranceles, IVA, nacionalización y puerto en destino los paga el importador o su agente antes del levante.`,
        tributesCalc: `Cálculo de tributos sobre esta unidad (escenario ${dutyPctLabel}%)`,
        cifValueRow: "Valor CIF",
        dutyRow: `Arancel ${dutyPctLabel}%`,
        feeRow: "Tasa aduanera 1%",
        vatRow: (base: string) => `IVA 16% sobre ${base}`,
        luxuryRow: "Recargo de lujo 15%",
        subtotalTributes: "SUBTOTAL TRIBUTOS ESTIMADOS",
        portFeesRow: "Puerto + almacenaje + agente",
        grandAnnexRow: "TOTAL GENERAL ESTIMADO (CIF + tributos, sin puerto)",
        annexNote: `Pickup de carga: arancel de referencia ${dutyPctLabel}% (hasta 40% si se reclasifica). Exenta del recargo de lujo del 15%. Confirmar con el agente en ${port}.`,
        requirements: `Requisitos del cliente: antigüedad máxima 5 años; permisos SENATEL/MINEC y COVENIN cuando apliquen; homologación INTT / SENCAMER.`,
        conditions: `Condiciones: ${cur}, T/T. ${quote.paymentTerms?.trim() ? quote.paymentTerms.trim() : `Anticipo del ${totals.depositPct}% (${cur} ${n(totals.depositAmount, cur)}) y saldo del ${100 - totals.depositPct}% (${cur} ${n(totals.balanceAmount, cur)}) a confirmar.`} La unidad se reserva tras aceptación y pago inicial.`,
        acceptance: `Aceptación: ${COMPANY.email}${quote.customer.email ? ` con copia a ${quote.customer.email}` : ""}, citando ${quote.documentNumber ?? quote.ref}.`,
        bySeller: "Por el exportador",
        byBuyer: "Por el cliente",
      }
    : {
        docTitle: "COMMERCIAL QUOTATION",
        no: "No.",
        companyTag: "CHINA VEHICLE EXPORT",
        client: "Customer",
        cName: "Name / company",
        cEmail: "Email",
        cPhone: "Phone",
        cQty: "Quantity",
        cPort: "Destination port",
        cIncoterm: "Incoterm",
        cValid: "Offer validity",
        validUntil: (d: string) => `Until ${d}`,
        units: (q: number) => `${q} unit${q === 1 ? "" : "s"}`,
        incotermValue: `${incotermLabel} ${port} (Incoterms® 2020)`,
        object: "Scope of this offer",
        objectText: `${T_units(unitCount, false)} delivered ${incotermLabel} to ${port}, ${quote.destinationCountry}.`,
        stock: "Stock",
        factory: "Factory",
        location: "Location",
        available: "Available",
        totalsHeading: "TOTALS FOR THIS OFFER",
        concept: "Item",
        fobSubtotalRow: "FOB subtotal (vehicle + China origin)",
        freightRow: `Freight to ${port} + minimum CIF insurance`,
        payToHaina: `TOTAL PAYABLE TO HAINA AUTO · ${incotermLabel} ${portUpper}`,
        tributesRow: `Estimated ${isVenezuela ? "SENIAT " : ""}import taxes (duty ${dutyPctLabel}% + fee 1% + VAT 16%)`,
        portRow: "Destination port, storage and customs broker",
        variable: "variable / not included",
        grandRow: `ESTIMATED GRAND TOTAL · ${incotermLabel} + taxes (excl. port & broker)`,
        payStatement: `Payable to ${COMPANY.name}: ${cur} ${n(totals.cifTotal, cur)} ${incotermLabel}. In words: ${amountInWords(totals.cifTotal, cur, lang)}.`,
        cifCheck: `${incotermLabel} check: ${n(cifBreakdown.fobSubtotal, cur)} FOB + ${n(cifBreakdown.oceanFreight, cur)} freight + ${n(cifBreakdown.marineInsurance, cur)} insurance = ${n(totals.cifTotal, cur)}.`,
        grandDisclaimer: `The grand total of ${cur} ${n(grandEstimate, cur)} is a reference estimate (${incotermLabel} + taxes at ${dutyPctLabel}%). It is not DDP. Destination port, storage and broker are paid by the buyer in ${quote.destinationCountry}.`,
        cifBreakdownTitle: "Internal CIF breakdown — approximate market values",
        cifBreakdownIntro: `These items reconstruct the ${cur} ${n(totals.cifTotal, cur)} CIF price. They are internal reference allocations. The customer pays the CIF total to HAINA; these lines are not invoiced separately unless agreed in writing.`,
        sectionA: "A. FOB components (to ship's rail at origin)",
        item: "Item",
        a1: "1. Vehicle / goods value (internal ex-works)",
        a2: "2. Export customs clearance in China",
        a3: "3. Origin port / terminal handling (THC)",
        a4: "4. Export documentation & shipping fees",
        a5: "5. Bill of Lading (B/L) issuance",
        subtotalFob: "FOB SUBTOTAL",
        aNote: "Basis: clearance ~RMB 350–900; B/L ~CNY 300–450 (≈ USD 42–65); origin THC per unit in the low-to-mid range.",
        sectionB: "B. From FOB to CIF",
        b6: `6. Ocean freight to ${port}${code ? ` (${code})` : ""}`,
        b7: "7. Cargo insurance — minimum CIF ICC (C), 110% of value",
        subtotalFreight: "FREIGHT + INSURANCE SUBTOTAL",
        bNote: `Freight: one pickup's share on RoRo or shared container, China → ${port}, 35–45 days. Insurance: ${n(totals.cifTotal, cur)} × 110% × ≈0.42% ≈ ${cur} ${n(cifBreakdown.marineInsurance, cur)}. Minimum CIF cover, not ICC (A).`,
        sectionC: "C. Arithmetic identity",
        cFob: "FOB (items 1 to 5)",
        cFreight: "+ Freight (item 6)",
        cInsurance: "+ Insurance (item 7)",
        cTotal: `= TOTAL CIF ${portUpper} (payable to HAINA)`,
        annexTitle: `Annex — ${quote.destinationCountry} customs (NOT included in CIF)`,
        annexIntro: `CIF covers vehicle, freight and insurance to ${port}. Duties, VAT, nationalization and destination port charges are paid by the importer or their broker before release.`,
        tributesCalc: `Tax calculation for this unit (${dutyPctLabel}% scenario)`,
        cifValueRow: "CIF value",
        dutyRow: `Duty ${dutyPctLabel}%`,
        feeRow: "Customs fee 1%",
        vatRow: (base: string) => `VAT 16% on ${base}`,
        luxuryRow: "Luxury surcharge 15%",
        subtotalTributes: "ESTIMATED TAXES SUBTOTAL",
        portFeesRow: "Port + storage + broker",
        grandAnnexRow: "ESTIMATED GRAND TOTAL (CIF + taxes, excl. port)",
        annexNote: `Cargo pickup: reference duty ${dutyPctLabel}% (up to 40% if reclassified). Exempt from the 15% luxury surcharge. Confirm with the broker at ${port}.`,
        requirements: `Buyer requirements: maximum age 5 years; SENATEL/MINEC and COVENIN permits where applicable; INTT / SENCAMER homologation.`,
        conditions: `Terms: ${cur}, T/T. ${quote.paymentTerms?.trim() ? quote.paymentTerms.trim() : `Deposit of ${totals.depositPct}% (${cur} ${n(totals.depositAmount, cur)}) and balance of ${100 - totals.depositPct}% (${cur} ${n(totals.balanceAmount, cur)}) to be confirmed.`} The unit is reserved after acceptance and initial payment.`,
        acceptance: `Acceptance: ${COMPANY.email}${quote.customer.email ? ` copying ${quote.customer.email}` : ""}, quoting ${quote.documentNumber ?? quote.ref}.`,
        bySeller: "For the exporter",
        byBuyer: "For the customer",
      };

  const vatBase = customs ? customs.cifValue + customs.importDuty + customs.customsServiceFee : 0;

  const clientRows: [string, string][] = [
    [T.cName, quote.customer.name],
    [T.cEmail, quote.customer.email || "—"],
    ...(quote.customer.phone ? [[T.cPhone, quote.customer.phone] as [string, string]] : []),
    [T.cQty, T.units(unitCount)],
    [T.cPort, [port, quote.destinationCountry].filter(Boolean).join(", ")],
    [T.cIncoterm, T.incotermValue],
    [T.cValid, quote.validUntil ? T.validUntil(formatDate(quote.validUntil, lang)) : "—"],
  ];

  const totalsRows: { label: string; value: string; tone?: "orange" | "dark" }[] = [
    { label: T.fobSubtotalRow, value: n(cifBreakdown.fobSubtotal, cur) },
    ...(isCif ? [{ label: T.freightRow, value: n(cifBreakdown.freightAndInsurance, cur) }] : []),
    { label: T.payToHaina, value: n(totals.cifTotal, cur), tone: "orange" as const },
    ...(customs
      ? [
          { label: T.tributesRow, value: n(customs.total, cur) },
          { label: T.portRow, value: T.variable },
          { label: T.grandRow, value: n(grandEstimate, cur), tone: "dark" as const },
        ]
      : []),
  ];

  return (
    <div className={styles.root}>
      {/* ============ PAGE 1 — COMMERCIAL QUOTATION ============ */}
      <div className={styles.page}>
        <div className={styles.topBar} />
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.logo} src={COMPANY.logo} alt="" />
            <div>
              <p className={styles.companyName}>{COMPANY.name}</p>
              <span className={styles.companyTag}>{T.companyTag}</span>
              <p className={styles.companyAddress}>{COMPANY.address}</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <p className={styles.docTitle}>{T.docTitle}</p>
            <span className={styles.docNumber}>{T.no} {quote.documentNumber ?? quote.ref}</span>
            <span className={styles.docDate}>{formatDate(quote.quoteDate, lang)}</span>
          </div>
        </div>

        <p className={styles.sectionKicker}>{T.client}</p>
        <table className={styles.kvTable}>
          <tbody>
            {clientRows.map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.sectionKicker}>{T.object}</p>
        <p className={styles.objectText}>{T.objectText}</p>

        {quote.items.map((item, i) => {
          const photo = (item.photos ?? [])[0]?.url;
          const specLine = [
            item.condition === "new" ? (es ? "nuevo" : "new") : es ? "usado" : "used",
            item.mileageKm != null ? `${item.mileageKm.toLocaleString(es ? "es-ES" : "en-US")} km` : null,
            item.exteriorColor,
            item.engine,
            item.powerHp ? `${item.powerHp} hp` : null,
            item.transmission,
            item.drivetrain,
          ]
            .filter(Boolean)
            .join(" · ");
          const link = item.historyNotes?.match(/https?:\/\/\S+/)?.[0];
          const factory = item.vin ? `${es ? "VIN / fábrica" : "VIN / factory"} ${item.vin}` : null;
          return (
            <div className={styles.vehicleRow} key={i}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.vehiclePhoto} src={photo} alt="" />
              ) : (
                <div className={styles.vehiclePhotoEmpty} />
              )}
              <div>
                <p className={styles.vehicleTitle}>{itemTitle(item)}</p>
                {factory ? <p className={styles.vehicleMeta}>{factory}</p> : null}
                <p className={styles.vehicleSpec}>{specLine}</p>
                <p className={styles.vehicleMeta}>
                  {[T.units(item.qty), T.available, link].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          );
        })}

        <p className={styles.sectionKicker}>{T.totalsHeading}</p>
        <table className={styles.totalsTable}>
          <thead>
            <tr>
              <th>{T.concept}</th>
              <th>{cur}</th>
            </tr>
          </thead>
          <tbody>
            {totalsRows.map((row) => (
              <tr key={row.label} className={row.tone ? styles[row.tone === "orange" ? "rowOrange" : "rowDark"] : undefined}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.payStatement}>{T.payStatement}</p>
        <p className={styles.checkLine}>{T.cifCheck}</p>
        {customs ? <p className={styles.disclaimer}>{T.grandDisclaimer}</p> : null}

        <Footer />
      </div>

      {/* ============ PAGE 2 — INTERNAL CIF BREAKDOWN ============ */}
      {isCif && (
        <div className={styles.page}>
          <div className={styles.topBar} />
          <MiniHeader title={T.cifBreakdownTitle} />
          <p className={styles.objectText}>{T.cifBreakdownIntro}</p>

          <p className={styles.subHead}>{T.sectionA}</p>
          <table className={styles.totalsTable}>
            <thead>
              <tr><th>{T.item}</th><th>{cur}</th></tr>
            </thead>
            <tbody>
              <tr><td>{T.a1}</td><td>{n(cifBreakdown.goodsValue, cur)}</td></tr>
              <tr><td>{T.a2}</td><td>{n(cifBreakdown.exportClearance, cur)}</td></tr>
              <tr><td>{T.a3}</td><td>{n(cifBreakdown.originHandling, cur)}</td></tr>
              <tr><td>{T.a4}</td><td>{n(cifBreakdown.documentation, cur)}</td></tr>
              <tr><td>{T.a5}</td><td>{n(cifBreakdown.billOfLading, cur)}</td></tr>
              <tr className={styles.rowDark}><td>{T.subtotalFob}</td><td>{n(cifBreakdown.fobSubtotal, cur)}</td></tr>
            </tbody>
          </table>
          <p className={styles.footNote}>{T.aNote}</p>

          <p className={styles.subHead}>{T.sectionB}</p>
          <table className={styles.totalsTable}>
            <thead>
              <tr><th>{T.item}</th><th>{cur}</th></tr>
            </thead>
            <tbody>
              <tr><td>{T.b6}</td><td>{n(cifBreakdown.oceanFreight, cur)}</td></tr>
              <tr><td>{T.b7}</td><td>{n(cifBreakdown.marineInsurance, cur)}</td></tr>
              <tr className={styles.rowDark}><td>{T.subtotalFreight}</td><td>{n(cifBreakdown.freightAndInsurance, cur)}</td></tr>
            </tbody>
          </table>
          <p className={styles.footNote}>{T.bNote}</p>

          <p className={styles.subHead}>{T.sectionC}</p>
          <table className={styles.totalsTable}>
            <tbody>
              <tr><td>{T.cFob}</td><td>{n(cifBreakdown.fobSubtotal, cur)}</td></tr>
              <tr><td>{T.cFreight}</td><td>{n(cifBreakdown.oceanFreight, cur)}</td></tr>
              <tr><td>{T.cInsurance}</td><td>{n(cifBreakdown.marineInsurance, cur)}</td></tr>
              <tr className={styles.rowOrange}><td>{T.cTotal}</td><td>{n(totals.cifTotal, cur)}</td></tr>
            </tbody>
          </table>

          <Footer />
        </div>
      )}

      {/* ============ PAGE 3 — CUSTOMS ANNEX + SIGNATURES ============ */}
      {customs && (
        <div className={styles.page}>
          <div className={styles.topBar} />
          <MiniHeader title={T.annexTitle} />
          <p className={styles.objectText}>{T.annexIntro}</p>

          <p className={styles.subHead}>{T.tributesCalc}</p>
          <table className={styles.totalsTable}>
            <tbody>
              <tr><td>{T.cifValueRow}</td><td>{n(customs.cifValue, cur)}</td></tr>
              <tr><td>{T.dutyRow}</td><td>{n(customs.importDuty, cur)}</td></tr>
              <tr><td>{T.feeRow}</td><td>{n(customs.customsServiceFee, cur)}</td></tr>
              <tr><td>{T.vatRow(n(vatBase, cur))}</td><td>{n(customs.vat, cur)}</td></tr>
              {customs.luxuryFee > 0 ? (
                <tr><td>{T.luxuryRow}</td><td>{n(customs.luxuryFee, cur)}</td></tr>
              ) : null}
              <tr><td>{T.subtotalTributes}</td><td>{n(customs.total, cur)}</td></tr>
              <tr><td>{T.portFeesRow}</td><td>{T.variable}</td></tr>
              <tr className={styles.rowDark}><td>{T.grandAnnexRow}</td><td>{n(grandEstimate, cur)}</td></tr>
            </tbody>
          </table>
          <p className={styles.footNote}>{T.annexNote}</p>

          <p className={styles.para}>{T.requirements}</p>
          <p className={styles.para}>{T.conditions}</p>
          <p className={styles.para}>{T.acceptance}</p>

          <div className={styles.signatures}>
            <div className={styles.signature}>
              <span className={styles.signKicker}>{T.bySeller}</span>
              <b>{COMPANY.name}</b>
              <span className={styles.signSub}>{COMPANY.email}</span>
            </div>
            <div className={styles.signature}>
              <span className={styles.signKicker}>{T.byBuyer}</span>
              <b>{quote.customer.name}</b>
              <span className={styles.signSub}>{quote.customer.email || ""}</span>
            </div>
          </div>

          <Footer />
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <div className={styles.footerBar}>
      <div className={styles.footerBarTop} />
      <div className={styles.footerBarText}>
        Tel {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}
      </div>
    </div>
  );
}

function MiniHeader({ title }: { title: string }) {
  return (
    <div className={styles.miniHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.miniLogo} src={COMPANY.logo} alt="" />
      <p>{title}</p>
    </div>
  );
}
