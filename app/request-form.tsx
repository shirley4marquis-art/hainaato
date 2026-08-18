"use client";
import {FormEvent,useState} from "react";
import {submitLead} from "./submit-lead";
import {submitQuoteRequest} from "./submit-quote-request";
import {clearCart} from "./cart-store";

type Status="idle"|"sending"|"sent"|"error";

function field(data:FormData,key:string):string|undefined{const v=data.get(key);return typeof v==="string"&&v.trim()?v.trim():undefined}
function checked(data:FormData,key:string):boolean{return data.get(key)==="on"}

const CONSENT_LABEL="Allow an anonymized status update (reference, destination and status only — never your name or contact details) to appear in the shipment updates ticker on this site.";

export function RequestForm({kind}:{kind:"quote"|"contact"|"dealer"}){
  const [state,setState]=useState<Status>("idle");
  const [error,setError]=useState<string|null>(null);
  const [ref,setRef]=useState<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(state==="sending")return;
    const form=event.currentTarget;
    const data=new FormData(form);
    setState("sending");setError(null);
    const result=await submitLead({name:field(data,"name"),email:field(data,"email"),phone:field(data,"phone"),company:field(data,"company"),message:field(data,"message"),publicConsent:checked(data,"publicConsent"),source:`request-form:${kind}`});
    if(result.ok){setRef(result.ref);setState("sent");form.reset()}
    else{setError(result.error);setState("error")}
  }
  const labels={quote:"Request a vehicle quotation",contact:"Send a message",dealer:"Apply for the dealer programme"};
  return <form className="request-form" onSubmit={submit} aria-busy={state==="sending"}><h2>{labels[kind]}</h2><div className="form-grid"><label htmlFor={`${kind}-name`}>Full name *</label><input id={`${kind}-name`} name="name" required autoComplete="name"/><label htmlFor={`${kind}-email`}>Email *</label><input id={`${kind}-email`} name="email" type="email" required autoComplete="email"/><label htmlFor={`${kind}-phone`}>Phone / WhatsApp *</label><input id={`${kind}-phone`} name="phone" required autoComplete="tel"/><label htmlFor={`${kind}-company`}>Company</label><input id={`${kind}-company`} name="company" autoComplete="organization"/><label className="wide" htmlFor={`${kind}-message`}>{kind==="quote"?"Vehicle, stock code and destination":"How can we help?"} *</label><textarea className="wide" id={`${kind}-message`} name="message" required rows={6}/><label className="wide consent-checkbox"><input type="checkbox" name="publicConsent" id={`${kind}-consent`}/> {CONSENT_LABEL}</label></div><button className="btn primary" disabled={state==="sending"}>{state==="sending"?"Sending…":"Submit request"}</button><div role="status" aria-live="polite">{state==="sent"&&<p className="success">Thank you. Your request has been recorded for follow-up{ref?` (reference ${ref})`:""}.</p>}{state==="error"&&<p className="form-error" role="alert">{error}</p>}</div></form>
}

export function HomeRequestForm(){
  const [state,setState]=useState<Status>("idle");
  const [error,setError]=useState<string|null>(null);
  const [ref,setRef]=useState<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(state==="sending")return;
    const form=event.currentTarget;
    const data=new FormData(form);
    setState("sending");setError(null);
    const result=await submitLead({name:field(data,"name"),contact:field(data,"contact"),vehicle:field(data,"model"),budget:field(data,"budget"),destination:field(data,"destination"),message:field(data,"message"),publicConsent:checked(data,"publicConsent"),source:"home-request-form"});
    if(result.ok){setRef(result.ref);setState("sent");form.reset()}
    else{setError(result.error);setState("error")}
  }
  return <form className="request-form" onSubmit={submit} aria-busy={state==="sending"}><h2>Submit requirements</h2><div className="form-grid"><label htmlFor="hr-name">Your name *</label><input id="hr-name" name="name" required autoComplete="name"/><label htmlFor="hr-contact">WhatsApp / Email / Phone *</label><input id="hr-contact" name="contact" required/><label htmlFor="hr-model">Target model</label><input id="hr-model" name="model" placeholder="e.g. Toyota Camry, BYD Seal"/><label htmlFor="hr-budget">Budget range</label><input id="hr-budget" name="budget" placeholder="e.g. USD 15,000–25,000"/><label className="wide" htmlFor="hr-destination">Destination country / port *</label><input className="wide" id="hr-destination" name="destination" required placeholder="e.g. Dubai, Vladivostok"/><label className="wide" htmlFor="hr-message">Additional requirements</label><textarea className="wide" id="hr-message" name="message" rows={4} placeholder="Color, fuel type, quantity, delivery timeline…"/><label className="wide consent-checkbox"><input type="checkbox" name="publicConsent" id="hr-consent"/> {CONSENT_LABEL}</label></div><button className="btn primary" disabled={state==="sending"}>{state==="sending"?"Sending…":"Submit requirements"}</button><div role="status" aria-live="polite">{state==="sent"&&<p className="success">Thank you. Our team will contact you within one business day{ref?` (reference ${ref})`:""}.</p>}{state==="error"&&<p className="form-error" role="alert">{error}</p>}</div></form>
}

export function VehicleRequestForm({vehicleTitle}:{vehicleTitle:string}){
  const [state,setState]=useState<Status>("idle");
  const [error,setError]=useState<string|null>(null);
  const [ref,setRef]=useState<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(state==="sending")return;
    const form=event.currentTarget;
    const data=new FormData(form);
    setState("sending");setError(null);
    const result=await submitLead({name:field(data,"name"),vehicle:vehicleTitle,destination:field(data,"destination"),quantity:field(data,"quantity"),phone:field(data,"whatsapp"),email:field(data,"email"),message:field(data,"message"),publicConsent:checked(data,"publicConsent"),source:`vehicle-request:${vehicleTitle}`});
    if(result.ok){setRef(result.ref);setState("sent");form.reset()}
    else{setError(result.error);setState("error")}
  }
  return <form className="request-form compact" onSubmit={submit} aria-busy={state==="sending"}><h2>Request This Vehicle</h2><div className="form-grid"><label htmlFor="rv-vehicle">Vehicle</label><input id="rv-vehicle" name="vehicle" defaultValue={vehicleTitle} readOnly/><label htmlFor="rv-name">Full name *</label><input id="rv-name" name="name" required autoComplete="name"/><label htmlFor="rv-destination">Destination country *</label><input id="rv-destination" name="destination" placeholder="e.g. UAE, Russia, Chile" required/><label htmlFor="rv-quantity">Quantity</label><input id="rv-quantity" name="quantity" type="number" min={1} defaultValue={1}/><label htmlFor="rv-whatsapp">WhatsApp *</label><input id="rv-whatsapp" name="whatsapp" type="tel" placeholder="+..." required/><label htmlFor="rv-email">Email</label><input id="rv-email" name="email" type="email"/><label htmlFor="rv-message">Message</label><textarea id="rv-message" name="message" rows={3} placeholder="Color, timeline, incoterms…"/><label className="consent-checkbox"><input type="checkbox" name="publicConsent" id="rv-consent"/> {CONSENT_LABEL}</label></div><button className="btn primary" disabled={state==="sending"}>{state==="sending"?"Sending…":"Request price"}</button><div role="status" aria-live="polite">{state==="sent"&&<p className="success">Thank you. Our team will contact you within one business day{ref?` (reference ${ref})`:""}.</p>}{state==="error"&&<p className="form-error" role="alert">{error}</p>}</div></form>
}

// Fully automated cart-checkout quotation request — pulls each vehicle's
// real specs/photos from its own listing (see app/api/quote-requests) rather
// than a free-text message, generates a PDF and emails it to the customer
// synchronously, so this can take several seconds; the busy state says so
// explicitly rather than looking stuck.
// onSubmitted fires (and the cart clears) only once the server has fully
// finished — quote saved, PDF rendered, email sent. Success is reported
// through that callback rather than local state: this component's own
// vehicles prop comes from the cart, so clearCart() immediately empties it
// at the parent and unmounts this form before any local "sent" state could
// ever paint. The parent (app/cart/page.tsx) owns showing the confirmation.
export function CartRequestForm({vehicles,onSubmitted}:{vehicles:{slug:string;title:string}[];onSubmitted:(ref:string,documentNumber:string|null)=>void}){
  const [state,setState]=useState<Status>("idle");
  const [error,setError]=useState<string|null>(null);
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const qtyFor=(slug:string)=>quantities[slug]??1;

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(state==="sending"||vehicles.length===0)return;
    setState("sending");setError(null);
    const data=new FormData(event.currentTarget);
    const result=await submitQuoteRequest({
      name:field(data,"name"),
      email:field(data,"email"),
      phone:field(data,"whatsapp"),
      country:field(data,"country"),
      cityState:field(data,"cityState"),
      destinationPort:field(data,"destinationPort"),
      message:field(data,"message"),
      publicConsent:checked(data,"publicConsent"),
      vehicles:vehicles.map((v)=>({slug:v.slug,qty:qtyFor(v.slug)})),
    });
    if(result.ok){onSubmitted(result.ref,result.documentNumber);clearCart()}
    else{setError(result.error);setState("error")}
  }

  return <form className="request-form" onSubmit={submit} aria-busy={state==="sending"}>
    <h2>Request a Formal Quotation</h2>
    <p style={{margin:"-8px 0 16px",fontSize:13,color:"var(--muted)"}}>We'll generate a personalized PDF quotation from these listings and email it to you immediately — no need to wait for a reply.</p>
    <div className="form-grid">
      <label className="wide" htmlFor="cr-vehicles">Vehicles &amp; quantity ({vehicles.length})</label>
      <div className="wide" style={{display:"flex",flexDirection:"column",gap:8,marginBottom:4}}>
        {vehicles.map((v)=>(
          <div key={v.slug} style={{display:"flex",alignItems:"center",gap:10,fontSize:13}}>
            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</span>
            <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:400,margin:0}}>
              Qty
              <input type="number" min={1} max={50} value={qtyFor(v.slug)} style={{width:60}}
                onChange={(e)=>setQuantities((q)=>({...q,[v.slug]:Math.max(1,Number(e.target.value)||1)}))}/>
            </label>
          </div>
        ))}
      </div>
      <label htmlFor="cr-name">Full name *</label><input id="cr-name" name="name" required autoComplete="name"/>
      <label htmlFor="cr-email">Email *</label><input id="cr-email" name="email" type="email" required autoComplete="email"/>
      <label htmlFor="cr-whatsapp">Phone / WhatsApp *</label><input id="cr-whatsapp" name="whatsapp" type="tel" placeholder="+..." required autoComplete="tel"/>
      <label htmlFor="cr-country">Country *</label><input id="cr-country" name="country" placeholder="e.g. UAE, Russia, Chile" required autoComplete="country-name"/>
      <label htmlFor="cr-cityState">City / State</label><input id="cr-cityState" name="cityState" autoComplete="address-level2"/>
      <label htmlFor="cr-destinationPort">Preferred destination port (if known)</label><input id="cr-destinationPort" name="destinationPort" placeholder="e.g. Cartagena, Jebel Ali"/>
      <label className="wide" htmlFor="cr-message">Additional requirements or comments</label>
      <textarea className="wide" id="cr-message" name="message" rows={3} placeholder="Color, timeline, incoterms…"/>
      <label className="wide consent-checkbox"><input type="checkbox" name="publicConsent" id="cr-consent"/> {CONSENT_LABEL}</label>
    </div>
    <button className="btn primary" disabled={state==="sending"||vehicles.length===0}>
      {state==="sending"?"Generating your quotation…":`Request quote for ${vehicles.length} vehicle${vehicles.length===1?"":"s"}`}
    </button>
    <div role="status" aria-live="polite">
      {state==="error"&&<p className="form-error" role="alert">{error}</p>}
    </div>
  </form>
}
