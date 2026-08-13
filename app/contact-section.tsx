"use client";
import Link from "next/link";
import Image from "next/image";
import {Send} from "lucide-react";
import {FormEvent,useEffect,useState} from "react";
import {TELEGRAM_URL,WECHAT_USERNAME,WHATSAPP_URL,TelegramIcon,WeChatIcon,WhatsAppIcon} from "./contact-links";
import {submitLead} from "./submit-lead";

function field(data:FormData,key:string):string|undefined{const v=data.get(key);return typeof v==="string"&&v.trim()?v.trim():undefined}

export function GetInTouchSection(){
  const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle");
  const [error,setError]=useState<string|null>(null);
  const [ref,setRef]=useState<string|null>(null);
  const [wechatOpen,setWechatOpen]=useState(false);
  useEffect(()=>{const sync=()=>setWechatOpen(window.location.hash==="#wechat");sync();window.addEventListener("hashchange",sync);const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setWechatOpen(false);history.replaceState(null,"",window.location.pathname)}};window.addEventListener("keydown",close);return()=>{window.removeEventListener("hashchange",sync);window.removeEventListener("keydown",close)}},[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(state==="sending")return;
    const form=event.currentTarget;
    const data=new FormData(form);
    setState("sending");setError(null);
    const result=await submitLead({name:field(data,"name"),contact:field(data,"contact"),vehicle:field(data,"brand_model"),budget:field(data,"budget"),destination:field(data,"destination"),message:field(data,"message"),publicConsent:data.get("publicConsent")==="on",source:"contact-section"});
    if(result.ok){setRef(result.ref);setState("sent");form.reset()}
    else{setError(result.error);setState("error")}
  }
  return <section className="requirements-section" id="contact"><div className="container">
    <header className="requirements-heading"><span>GET IN TOUCH</span><h2>Submit requirements</h2><i/></header>
    <div className="requirements-wrap">
      <aside className="requirements-aside"><h3>Talk to export desk</h3><p>Send your target model, budget range, and destination port — we usually reply the same business day.</p><ul><li>Target model &amp; quantity</li><li>Budget range &amp; payment preference</li><li>Destination country / port</li></ul><div className="requirements-links" aria-label="Export desk contact links"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>WhatsApp</a><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer"><TelegramIcon/>Telegram</a><a href="#wechat"><WeChatIcon/>WeChat</a><Link href="/help">Browse help center</Link></div><div className="wechat-contact"><WeChatIcon/><span><b>WeChat</b><small>Search username</small><strong>{WECHAT_USERNAME}</strong></span></div></aside><div className={`wechat-modal-backdrop${wechatOpen?" open":""}`} id="wechat"><section className="wechat-modal" role="dialog" aria-modal="true" aria-labelledby="wechat-modal-title"><a className="wechat-modal-close" href="#contact" onClick={()=>setWechatOpen(false)} aria-label="Close WeChat QR code">×</a><WeChatIcon/><h2 id="wechat-modal-title">Scan to message — connect with us on WeChat</h2><p>Open WeChat and scan this QR code to chat with our export team.</p><Image src="/images/wechat-qr.png" width={820} height={1214} alt={`WeChat QR code for ${WECHAT_USERNAME}`} className="wechat-modal-qr" priority/><small>WeChat username</small><strong>{WECHAT_USERNAME}</strong></section></div>
      <div className="requirements-form-card"><form onSubmit={submit} aria-busy={state==="sending"}><div className="requirements-fields">
        <label>Your name <em>*</em><input name="name" required maxLength={128} autoComplete="name"/></label>
        <label>WhatsApp / Email / Phone <em>*</em><input name="contact" required maxLength={255} autoComplete="email"/></label>
        <label>Target model<input name="brand_model" maxLength={255} placeholder="e.g. Toyota Camry, BYD Seal"/></label>
        <label>Budget range<input name="budget" maxLength={128} placeholder="e.g. USD 15,000 – 25,000"/></label>
        <label className="wide">Destination country / port<input name="destination" maxLength={255} placeholder="e.g. Dubai, Vladivostok"/></label>
        <label className="wide">Additional requirements<textarea name="message" rows={4} maxLength={2000} placeholder="Color, fuel type, quantity, delivery timeline…"/></label>
        <label className="wide requirements-consent"><input type="checkbox" name="publicConsent"/> Allow an anonymized status update (reference, destination and status only — never your name or contact details) to appear in the shipment updates ticker on this site.</label>
      </div><button type="submit" disabled={state==="sending"}><Send/>{state==="sending"?"Sending…":"Submit requirements"}</button>{state==="sent"&&<p className="requirements-success" role="status">Thank you. Our export desk will follow up within one business day{ref?` (reference ${ref})`:""}.</p>}{state==="error"&&<p className="requirements-error" role="alert">{error}</p>}</form></div>
    </div>
  </div></section>;
}
