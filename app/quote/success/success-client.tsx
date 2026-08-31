"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

type QuoteSummary={ref:string;internalRef:string;destination:string;currency:string;cifTotal:number;depositPct:number;depositAmount:number;balanceAmount:number;validUntil:string|null;deliveryStatus:"processing"|"sent"|"failed"|"whatsapp-only";vehicles:{title:string;qty:number;unitPrice:number;photo:string|null}[]};
const SALES_EMAIL="sales@hainautocn.com";
const WHATSAPP_NUMBER="8615032178759";
function money(value:number,currency:string){return new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(value)}

export function QuoteSuccessClient({quoteRef,token}:{quoteRef:string;token:string}){
  const [quote,setQuote]=useState<QuoteSummary|null>(null);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if(!quoteRef||!token)return;
    let cancelled=false,attempts=0;let timer:ReturnType<typeof setTimeout>|undefined;
    const load=async()=>{try{const response=await fetch(`/api/quote-success?ref=${encodeURIComponent(quoteRef)}&token=${encodeURIComponent(token)}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load this quotation.");if(cancelled)return;setQuote(data.quote);setError(null);attempts+=1;if(data.quote.deliveryStatus==="processing"&&attempts<12)timer=setTimeout(load,2500)}catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"Could not load this quotation.")}};
    load();return()=>{cancelled=true;if(timer)clearTimeout(timer)};
  },[quoteRef,token]);
  if(!quoteRef||!token)return <main className="section"><div className="container quote-success-card"><h1>Quotation unavailable</h1><p>This quotation link is incomplete.</p><Link className="btn primary" href="/vehicles">Browse vehicles</Link></div></main>;
  if(error)return <main className="section"><div className="container quote-success-card"><h1>Quotation unavailable</h1><p>{error}</p><Link className="btn primary" href="/vehicles">Browse vehicles</Link></div></main>;
  if(!quote)return <main className="section"><div className="container quote-success-card"><p>Preparing your quotation…</p></div></main>;
  const approveText=`Hello HainaAuto, I approve quotation ${quote.ref} and would like the sales contract and payment instructions.`;
  const changeText=`Hello HainaAuto, I would like to request changes to quotation ${quote.ref}.`;
  const approveEmail=`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Approve quotation ${quote.ref}`)}&body=${encodeURIComponent(approveText)}`;
  const whatsapp=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(approveText)}`;
  const deliveryCopy=quote.deliveryStatus==="sent"?"The PDF has been sent to your email.":quote.deliveryStatus==="failed"?"The email could not be delivered; download your PDF below.":quote.deliveryStatus==="whatsapp-only"?"No email was supplied. Download the PDF or continue on WhatsApp.":"Your quote is ready. The PDF email is being prepared in the background.";
  return <main className="quote-success-page"><section className="container quote-success-grid"><div className="quote-success-main"><span className="eyebrow">QUOTATION CREATED</span><h1>Your CIF quotation is ready</h1><p className="quote-success-lead">Reference <b>{quote.ref}</b> · Delivery to {quote.destination||"your selected port"}</p><div className={`quote-delivery-status status-${quote.deliveryStatus}`}>{deliveryCopy}</div><div className="quote-success-vehicles">{quote.vehicles.map((vehicle,index)=><div key={`${vehicle.title}-${index}`}><span>{vehicle.qty} ×</span><b>{vehicle.title}</b><strong>{money(vehicle.unitPrice,quote.currency)} each</strong></div>)}</div><div className="quote-success-totals"><span>Total CIF <b>{money(quote.cifTotal,quote.currency)}</b></span><span>{quote.depositPct}% deposit <b>{money(quote.depositAmount,quote.currency)}</b></span><span>Balance <b>{money(quote.balanceAmount,quote.currency)}</b></span></div><div className="quote-success-actions"><a className="btn primary" href={approveEmail}>Approve quote &amp; prepare contract</a><a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">Approve on WhatsApp</a><a className="btn ghost" href={`/api/quote-pdf?ref=${encodeURIComponent(quote.internalRef)}&token=${encodeURIComponent(token)}`}>Download PDF</a></div><p className="quote-change-link"><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(changeText)}`} target="_blank" rel="noopener noreferrer">Need a different vehicle, quantity, or destination? Request changes.</a></p></div><aside className="quote-next-steps"><span className="eyebrow">NEXT STEPS</span><h2>From quote to shipment</h2><ol><li><b>Approve the quotation</b><span>Confirm the vehicles, price and destination.</span></li><li><b>Receive the sales contract</b><span>We send the contract and verified payment instructions.</span></li><li><b>Pay the {quote.depositPct}% deposit</b><span>Your order is secured and preparation begins.</span></li><li><b>Inspection and shipping</b><span>Receive inspection evidence and shipment documents.</span></li><li><b>Pay balance and collect</b><span>Complete payment before release at destination.</span></li></ol><Link href="/vehicles">Continue browsing vehicles →</Link></aside></section></main>;
}
