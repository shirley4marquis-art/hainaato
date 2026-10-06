import type { CifEstimate } from "../lib/cif-estimate";

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

export function CifEstimatePreview({ estimate }: { estimate: CifEstimate }) {
  return (
    <section className="cif-estimate" aria-label="Estimated CIF calculation" aria-live="polite">
      <div className="cif-estimate-head">
        <div><span>DESTINATION ESTIMATE</span><h3>Estimated CIF to {estimate.port}</h3></div>
        <div className="cif-estimate-price"><strong>{money(estimate.cifTotal)}</strong><small>Planning range {money(estimate.lowCifTotal)}–{money(estimate.highCifTotal)}</small></div>
      </div>
      <p className="cif-estimate-subtitle">{estimate.vehicleCount} vehicle{estimate.vehicleCount === 1 ? "" : "s"} · {estimate.vehicleTypes.join(", ")} · {estimate.country}</p>
      <dl className="cif-estimate-lines">
        <div><dt>Vehicle FOB subtotal</dt><dd>{money(estimate.fobSubtotal)}</dd></div>
        <div><dt>China origin handling</dt><dd>{money(estimate.originHandling)}</dd></div>
        <div><dt>Export clearance, documents &amp; B/L</dt><dd>{money(estimate.exportDocumentationCost)}</dd></div>
        <div><dt>Estimated ocean freight</dt><dd>{money(estimate.freightCost)} <small>({money(estimate.lowFreightCost)}–{money(estimate.highFreightCost)})</small></dd></div>
        <div><dt>Estimated marine insurance ({(estimate.insuranceRate * 100).toFixed(2)}% base rate)</dt><dd>{money(estimate.insuranceCost)}</dd></div>
        <div className="cif-estimate-total"><dt>Estimated CIF total</dt><dd>{money(estimate.cifTotal)}</dd></div>
      </dl>
      <p className="cif-estimate-note">{estimate.estimateNote} Rate snapshot: {estimate.rateDate}.</p>
      <p className="cif-estimate-excluded">Import duty, VAT, customs clearance, destination port charges, storage and inland delivery are excluded from CIF.</p>
    </section>
  );
}
