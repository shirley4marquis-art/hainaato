import type {AdminQuoteInput} from "./crm";
const text=(v:unknown)=>typeof v==="string"&&v.trim().length>0;
export function validateQuote(q:AdminQuoteInput):string|null {
 if(!q||!text(q.customer?.name)||!text(q.destinationPort)||!text(q.destinationCountry))return "Customer name, destination country and port are required.";
 if(!["USD","EUR","CNY"].includes(q.currency??"USD"))return "Choose USD, EUR or CNY.";
 if(q.language&&!["en","es"].includes(q.language))return "Choose English or Español.";
 if(q.incoterm&&!["FOB","CIF"].includes(q.incoterm))return "Choose FOB or CIF.";
 if(!Array.isArray(q.items)||!q.items.length||q.items.length>100)return "Add between 1 and 100 vehicles.";
 const vins=new Set<string>();
 for(const item of q.items){
  if(item?.vin){const vin=item.vin.trim().toUpperCase();if(vins.has(vin))return "A VIN can appear only once in a quote.";vins.add(vin);if(item.qty!==1)return "A vehicle with an assigned VIN must have quantity 1.";}
  if(!item||!text(item.make)||!text(item.model))return "Each vehicle needs a make and model.";
  if(!Number.isInteger(item.qty)||item.qty<1||item.qty>1000)return "Quantities must be whole numbers between 1 and 1,000.";
  if(!["new","used"].includes(item.condition))return "Choose a vehicle condition.";
  if([item.fobOriginal,item.fobFinal,item.discount??0].some(v=>typeof v!=="number"||!Number.isFinite(v)||v<0||v>1e9))return "Vehicle prices must be valid non-negative amounts.";
 }
 if([q.inlandTransportCost,q.exportDocumentationCost,q.freightCost,q.insuranceCost,q.dutyEstimateOverride].some(v=>v!=null&&(typeof v!=="number"||!Number.isFinite(v)||v<0||v>1e9)))return "Costs must be valid non-negative amounts.";
 if([q.depositPct,q.dutyPct].some(v=>v!=null&&(typeof v!=="number"||!Number.isFinite(v)||v<0||v>100)))return "Percentages must be between 0 and 100.";
 return null;
}
