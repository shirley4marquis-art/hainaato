"use client";
import {useSpanish} from "./quote-copy";
import {useState} from "react";
import {SHIPPING_COUNTRIES} from "../lib/shipping-ports";

export function DestinationPortFields({countryName="country",portName="destinationPort",idPrefix="destination",required=true,className}:{countryName?:string;portName?:string;idPrefix?:string;required?:boolean;className?:string}){
  const spanish=useSpanish();
  const [country,setCountry]=useState("");
  const countryNames=spanish?new Intl.DisplayNames(["es"],{type:"region"}):null;
  const selected=SHIPPING_COUNTRIES.find((entry)=>entry.country===country);
  return <>
    <label className={className} htmlFor={`${idPrefix}-country`}>{spanish?"País de destino":"Destination country"}{required?" *":""}
      <select id={`${idPrefix}-country`} name={countryName} value={country} required={required} autoComplete="country-name" onChange={(event)=>setCountry(event.target.value)}>
        <option value="">{spanish?"Selecciona un país":"Select country"}</option>
        {SHIPPING_COUNTRIES.map((entry)=><option value={entry.country} key={entry.iso2}>{countryNames?.of(entry.iso2.toUpperCase())??entry.country}</option>)}
      </select>
    </label>
    <label className={className} htmlFor={`${idPrefix}-port`}>{spanish?"Puerto de destino":"Destination port"}{required?" *":""}
      <select key={country} id={`${idPrefix}-port`} name={portName} required={required} disabled={!selected} defaultValue="">
        <option value="">{selected?(spanish?"Selecciona un puerto":"Select port"):(spanish?"Selecciona primero un país":"Select a country first")}</option>
        {selected?.ports.map((port)=><option value={port.name} key={port.code??port.name}>{port.name}{port.code?` (${port.code})`:""}</option>)}
        {selected&&<option value="Other / To be confirmed">{spanish?"Otro / Aún no lo sé":"Other / Not sure yet"}</option>}
      </select>
    </label>
  </>;
}
