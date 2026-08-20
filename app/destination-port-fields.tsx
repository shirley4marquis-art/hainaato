"use client";
import {useState} from "react";
import {SHIPPING_COUNTRIES} from "../lib/shipping-ports";

export function DestinationPortFields({countryName="country",portName="destinationPort",idPrefix="destination",required=true,className}:{countryName?:string;portName?:string;idPrefix?:string;required?:boolean;className?:string}){
  const [country,setCountry]=useState("");
  const selected=SHIPPING_COUNTRIES.find((entry)=>entry.country===country);
  return <>
    <label className={className} htmlFor={`${idPrefix}-country`}>Destination country{required?" *":""}
      <select id={`${idPrefix}-country`} name={countryName} value={country} required={required} autoComplete="country-name" onChange={(event)=>setCountry(event.target.value)}>
        <option value="">Select country</option>
        {SHIPPING_COUNTRIES.map((entry)=><option value={entry.country} key={entry.iso2}>{entry.country}</option>)}
      </select>
    </label>
    <label className={className} htmlFor={`${idPrefix}-port`}>Destination port{required?" *":""}
      <select key={country} id={`${idPrefix}-port`} name={portName} required={required} disabled={!selected} defaultValue="">
        <option value="">{selected?"Select port":"Select a country first"}</option>
        {selected?.ports.map((port)=><option value={port.name} key={port.code??port.name}>{port.name}{port.code?` (${port.code})`:""}</option>)}
        {selected&&<option value="Other / To be confirmed">Other / Not sure yet</option>}
      </select>
    </label>
  </>;
}
