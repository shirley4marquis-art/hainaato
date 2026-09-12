import { documentLabels } from "../../../lib/documents/translations";
import { documentTitle, type DocumentSnapshot, type DocumentStatus } from "../../../lib/documents/model";
import styles from "./document.module.css";
export function DocumentView({snapshot:s,number,status="draft"}:{snapshot:DocumentSnapshot;number:string;status?:DocumentStatus}) {
 const l=documentLabels[s.language]; const q=s.quote; const t=s.totals;
 const locale=s.language==="es"?"es-ES":"en-GB";
 const money=(n:number)=>new Intl.NumberFormat(locale,{style:"currency",currency:q.currency}).format(n);
 const date=(v:string)=>new Date(`${v.slice(0,10)}T12:00:00Z`).toLocaleDateString(locale,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"});
 const word=(v:string)=>l[v as keyof typeof l] || v;
 const rows: [string,string][]=[[l.subtotal,money(t.itemsSubtotal)],[l.inland,money(q.inlandTransportCost)],[l.exportCost,money(q.exportDocumentationCost)],[l.freight,q.incoterm==="FOB"?money(t.freight):l.included],[l.insurance,q.incoterm==="FOB"?money(t.insurance):l.included],[l.cif,money(t.cifTotal)],[l.customs,t.customsEstimate==null?l.missing:money(t.customsEstimate)],[l.grand,money(t.grandTotal)],[`${l.deposit} (${t.depositPct}%)`,money(t.depositAmount)],[l.balance,money(t.balanceAmount)]];
 const receipt=["receipt","confirmation"].includes(s.type);
 const clause=s.type==="contract"?l.contractClause:s.type==="inspection"?l.inspectionClause:["supply","traceability"].includes(s.type)?l.supplyClause:s.type==="export"?l.exportClause:receipt?l.receiptClause:"";
 return <article className={styles.paper} lang={s.language} data-document-ready="true">
  <header className={styles.header}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={s.company.logo} alt={s.company.name} width={64} height={64}/>
   <div><strong>{s.company.name}</strong><p>{s.company.address}</p><p>{s.company.email} · {s.company.phone}</p></div>
  </header>
  <h1>{documentTitle(s.type,s.language)}</h1>
  <div className={styles.meta}><p><b>{l.number}</b><span>{number}</span></p><p><b>{l.date}</b><span>{date(s.issueDate)}</span></p><p><b>{l.reference}</b><span>{q.documentNumber || q.ref}</span></p><p><b>{l.status}</b><span>{l[status]}</span></p></div>
  <section><h2>{l.customer}</h2><strong>{q.customer.name}</strong><p>{[q.customer.address,q.customer.city,q.customer.country].filter(Boolean).join(", ")}</p><p>{l.contact}: {[q.customer.email,q.customer.phone].filter(Boolean).join(" · ") || l.missing}</p></section>
  <table><thead><tr><th>{l.vehicle}</th><th>{l.quantity}</th>{!receipt&&<><th>{l.price}</th><th>{l.total}</th></>}</tr></thead><tbody>{q.items.map((v,i)=><tr key={i}><td><b>{[v.year,v.make,v.model].filter(Boolean).join(" ")}</b><p>{l.vin}: {v.vin || l.missing}</p><p>{l.condition}: {word(v.condition)}</p>{["specification","inspection","traceability"].includes(s.type)&&<p>{[[l.mileage,v.mileageKm],[l.engine,v.engine],[l.fuel,v.fuelType],[l.transmission,v.transmission],[l.color,v.exteriorColor]].filter(([,value])=>value!=null&&value!=="").map(([label,value])=>`${label}: ${word(String(value))}`).join(" · ")}</p>}</td><td>{v.qty}</td>{!receipt&&<><td>{money(v.fobFinal)}</td><td>{money(v.fobFinal*v.qty)}</td></>}</tr>)}</tbody></table>
  <section className={styles.destination}><p><b>{l.destination}</b> {q.destinationCountry}</p><p><b>{l.port}</b> {q.destinationPort}</p></section>
  {!receipt&&<><dl className={styles.totals}>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{l.localCosts}</p></>}
  {(receipt||s.type==="purchase")&&<section><h2>{l.payment}</h2>{s.operations.filter(o=>o.kind==="payment"&&o.status==="confirmed").map(o=><div className={styles.record} key={o.id}><b>{o.data.reference}</b><p>{l.amount}: {new Intl.NumberFormat(locale,{style:"currency",currency:o.data.currency}).format(Number(o.data.amount))}</p><p>{l.date}: {o.data.date?date(o.data.date):l.missing} · {l.status}: {l.confirmed}</p></div>)}</section>}
  {["shipping","export","purchase"].includes(s.type)&&<section><h2>{l.shipment}</h2>{s.operations.filter(o=>o.kind==="shipment").map(o=><div className={styles.record} key={o.id}><p>{l.tracking}: {o.data.tracking || l.missing}</p><p>{l.vessel}: {o.data.vessel || l.missing}</p><p>{l.departure}: {o.data.departure?date(o.data.departure):l.missing} · {l.arrival}: {o.data.arrival?date(o.data.arrival):l.missing}</p><p>{l.status}: {word(o.status)}</p></div>)}</section>}
  {clause&&<section><p>{clause}</p></section>}
  {!receipt&&<section><h2>{l.terms}</h2><p>{s.paymentTerms || l.defaultTerms}</p></section>}
  {s.notes&&<section><h2>{l.notes}</h2><p className={styles.notes}>{s.notes}</p></section>}
  {["contract","inspection","supply","traceability","receipt","confirmation"].includes(s.type)&&<section><h2>{l.signatures}</h2><div className={styles.signatures}><div>{l.seller}<hr/>{l.signature}</div><div>{l.buyer}<hr/>{l.signature}</div></div></section>}
  <footer>{l.prepared} · {s.company.website} · {number}</footer>
 </article>;
}
