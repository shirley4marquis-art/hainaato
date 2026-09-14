import { PDFDocument, rgb } from "pdf-lib";
import { generatePdf } from "./pdf";
import { cleanValue } from "./mapping";
import { defaultField, DocumentError, type DocumentData, type FieldMapping } from "./types";

// Customer guidance adapted from the public FAQs at / and /help. These are
// indicative steps, never a replacement for the agreed sales contract.
const faq = {
 en: [
  ["01 / Reserve your vehicle", "Send the stock ID or vehicle link. We confirm availability, specifications, condition, price and export terms before booking."],
  ["02 / Inspect and approve", "Photos, video and inspection reports can be arranged before shipment. On-site or third-party inspection is available; available mileage and accident records are checked before approval."],
  ["03 / Confirm payment", "T/T, L/C or other agreed secure settlement methods are confirmed in the sales contract for your country and transaction. Follow the agreed deposit and balance schedule."],
  ["04 / Prepare and ship", "Export preparation and documentation come before dispatch. RoRo or container shipping depends on the route. Typical transit is 2–6 weeks after departure; preparation and customs clearance add time."],
  ["05 / Clear customs and receive", "Our team prepares export documentation and coordinates with your customs broker. Import eligibility, local duties and destination charges depend on your country and agreed terms."]
 ],
 es: [
  ["01 / Reserve su vehículo", "Envíe el código de stock o enlace. Confirmamos disponibilidad, especificaciones, estado, precio y condiciones de exportación antes de reservar."],
  ["02 / Inspeccione y apruebe", "Se pueden coordinar fotos, videos e informes antes del envío, así como inspección presencial o de terceros. Se revisan los registros disponibles de kilometraje y accidentes antes de aprobar."],
  ["03 / Confirme el pago", "T/T, L/C u otros métodos seguros acordados se confirman en el contrato según el país y la operación. Respete el calendario acordado de anticipo y saldo."],
  ["04 / Preparación y embarque", "La preparación y documentación preceden al envío. RoRo o contenedor según la ruta. El tránsito suele ser de 2–6 semanas desde la salida; preparación y aduanas requieren tiempo adicional."],
  ["05 / Aduanas y entrega", "Preparamos la documentación de exportación y coordinamos con su agente aduanal. Los requisitos de importación, impuestos y gastos en destino dependen del país y las condiciones acordadas."]
 ],
 zh: [["01 / 预订车辆","提供库存编号或车辆链接。预订前确认库存、规格、车况、价格和出口条款。"],["02 / 验车与确认","发货前可安排照片、视频、检测报告及现场或第三方验车。批准前核查可获取的里程和事故记录。"],["03 / 确认付款","电汇、信用证或其他约定付款方式根据国家和交易在销售合同中确认。按约定支付定金和尾款。"],["04 / 出口与运输","发运前完成出口准备和文件。根据路线选择滚装或集装箱。通常离港后运输需2–6周，准备和清关另需时间。"],["05 / 清关与收车","我们准备出口文件并与报关代理协调。进口资格、当地税费及目的地费用取决于国家和约定条款。"]]
};
export function publicSpecificationNotes(specs: Record<string, unknown>): string {
 return Object.entries(specs).filter(([key, value]) => cleanValue(value) && !/price|precio|seller|selling|margin|profit|adjustment|cost|价格|成本|利润/i.test(key)).map(([key,value]) => cleanValue(key) + ": " + cleanValue(value)).join("\n");
}
export async function generateQuotationLayout(data: DocumentData, galleries: Uint8Array[][], specificationOnly = false): Promise<Buffer> {
 if (!data.vehicles.length) throw new DocumentError("Select at least one vehicle.");
 const tr = (en: string, es: string, zh: string) => data.language === "en" ? en : data.language === "zh" ? zh : data.language === "es-zh" ? es + " / " + zh : es;
 const pdf = await PDFDocument.create(), fields: FieldMapping[] = [], images: Uint8Array[] = [];
 const width = 595.28, height = 841.89, margin = 38, content = width - 2 * margin;
 const v = data.values;
 const text = (page: number, value: unknown, y: number, h: number, extra: Partial<FieldMapping> = {}) => {
  const cleaned = cleanValue(value).split("\n").map(line => line.trim().replace(/[ \t]+/g," ")).filter(Boolean).join("\n");
  if (cleaned.length > 30000) throw new DocumentError("The description exceeds the readable two-page layout. Shorten repeated details and try again.");
  if (cleaned) fields.push({ ...defaultField(page), id: "layout-" + fields.length, field: "notes", text: cleaned, x: margin, y, width: content, height: h, fontSize: 10, minFontSize: 8.5, maxLines: 100, ...extra });
 };
 const section = (page: number, title: string, y: number) => {
  pdf.getPage(page - 1).drawRectangle({x: margin, y: height-y-23, width: content, height: 23, color: rgb(.94,.95,.97)});
  text(page, title, y+5, 15, {x: margin+9,width: content-18,fontWeight:"bold",fontSize:10,minFontSize:9});
 };
 const addPage = (title: string) => {
  const page=pdf.addPage([width,height]), n=pdf.getPageCount();
  page.drawRectangle({x:0,y:height-100,width,height:100,color:rgb(.04,.12,.22)});
  page.drawRectangle({x:margin,y:height-107,width:content,height:3,color:rgb(.76,.59,.28)});
  text(n,"NINDGE AUTOMOBILE",25,23,{fontSize:20,minFontSize:16,fontWeight:"bold",color:"#ffffff"});
  text(n,title,59,24,{fontSize:12,color:"#e3c588"});
  text(n,[v.document_number,v.issue_date].filter(Boolean).join("  |  "),117,18,{fontSize:9,minFontSize:8});
  return n;
 };
 if (!specificationOnly) {
  // Keep each commercial summary compact, including multi-car orders.
  for (let start=0;start<data.vehicles.length;start+=5) {
   const n=addPage(tr("QUOTATION / EXPORT & PROCESS","COTIZACIÓN / EXPORTACIÓN Y PROCESO","报价 / 出口流程"));
   const buyer=[v.buyer_name,v.buyer_company,v.buyer_email,v.buyer_phone,v.buyer_address,v.buyer_country].filter(x=>cleanValue(x)).join(" · ");
   text(n,buyer,145,43,{fontWeight:"bold"});
   text(n,[tr("Destination","Destino","目的地")+": "+[v.destination_port,v.destination_country].filter(Boolean).join(", "),v.incoterm, v.expiry_date ? tr("Valid until","Válida hasta","有效期至")+": "+v.expiry_date : ""].filter(Boolean).join(" | "),194,30);
   section(n,tr("YOUR QUOTATION","SU COTIZACIÓN","报价明细"),230);
   const items=data.vehicles.slice(start,start+5).map(item=>[item.quantity+" ×",item.vehicle_year,item.vehicle_brand,item.vehicle_model,"|",item.unit_price,"|",item.vehicle_total].filter(x=>cleanValue(x)).join(" "));
   text(n,items.join("\n"),264,69,{fontSize:10});
   const costs=[tr("Vehicle subtotal","Subtotal vehículos","车辆小计")+": "+v.subtotal,tr("Freight","Flete","运费")+": "+v.shipping_cost,tr("Insurance","Seguro","保险")+": "+v.insurance_cost,v.inland_cost ? tr("Inland transport","Transporte interior","内陆运输")+": "+v.inland_cost : "",v.documentation_cost ? tr("Export documents","Documentación","出口文件")+": "+v.documentation_cost : ""].filter(Boolean);
   text(n,costs.join(" · "),338,30,{fontSize:9,minFontSize:8.5});
   text(n,tr("Total","Total","合计")+": "+v.total_amount+"   |   "+tr("Deposit","Anticipo","定金")+" ("+v.initial_payment_percentage+"%): "+v.initial_payment+"   |   "+tr("Balance","Saldo","尾款")+": "+v.remaining_balance,375,32,{fontWeight:"bold",fontSize:11});
   const terms=[v.payment_terms, v.payment_method, v.customs_estimate ? tr("Estimated duties (separate)","Impuestos estimados (aparte)","预估税费（另计）")+": "+v.customs_estimate : ""].filter(x=>cleanValue(x)).join(" · ");
   text(n,terms,415,42,{fontSize:9,minFontSize:8.5});
   section(n,tr("EXPORT GUIDE / FROM OUR FAQ","GUÍA DE EXPORTACIÓN / PREGUNTAS FRECUENTES","出口指南 / 常见问题"),469);
   const entries=data.language === "en" ? faq.en : data.language === "zh" ? faq.zh : faq.es;
   entries.forEach(([title,body],i) => {
    const top=504+i*49;
    text(n,title+(data.language === "es-zh" ? " / "+faq.zh[i][0].slice(5) : ""),top,13,{fontSize:9,minFontSize:8.5,fontWeight:"bold"});
    text(n,body+(data.language === "es-zh" ? " "+faq.zh[i][1] : ""),top+15,32,{fontSize:9,minFontSize:8.5,lineHeight:1.1});
   });
   text(n,"nindgeauto.com/help · "+tr("Timing is indicative. Final terms are confirmed in the sales contract.","Plazos orientativos. Las condiciones finales se confirman en el contrato.","时间仅供参考，最终条款以销售合同为准。"),761,25,{fontSize:8.5,minFontSize:8});
  }
 }
 for (const [index,item] of data.vehicles.entries()) {
  const n=addPage(tr("VEHICLE / SPECIFICATIONS & DETAILS","VEHÍCULO / ESPECIFICACIONES Y DETALLES","车辆 / 规格及详情"));
  text(n,[item.vehicle_year,item.vehicle_brand,item.vehicle_model].filter(x=>cleanValue(x)).join(" "),146,43,{fontSize:19,minFontSize:12,fontWeight:"bold"});
  let y=203;
  const photos=galleries[index] ?? [];
  if (photos.length) {
   const slot=(content-12)/3;
   photos.slice(0,3).forEach((bytes,i)=>{
    fields.push({...defaultField(n),id:"layout-"+fields.length,field:"vehicle_image",kind:"image",itemIndex:images.length,x:margin+i*(slot+6),y,width:slot,height:119}); images.push(bytes);
   });
   y+=135;
  }
  section(n,tr("VEHICLE FACTS","DATOS DEL VEHÍCULO","车辆信息"),y); y+=34;
  const labels: [string,string][] = [
   ["vehicle_condition",tr("Condition","Estado","车况")],["vin","VIN"],["vehicle_color",tr("Exterior colour","Color exterior","外观颜色")],["interior_color",tr("Interior colour","Color interior","内饰颜色")],
   ["engine",tr("Engine","Motor","发动机")],["fuel",tr("Fuel / powertrain","Combustible / energía","燃料 / 动力")],["transmission",tr("Transmission","Transmisión","变速箱")],["drivetrain",tr("Drive","Tracción","驱动")],
   ["power",tr("Power (hp)","Potencia (hp)","功率 (hp)")],["mileage",tr("Mileage (km)","Kilometraje (km)","里程 (km)")],["capacity",tr("Capacity","Capacidad","容量")],["quantity",tr("Quantity","Cantidad","数量")],
   ["stock_id",tr("Stock ID","Código de stock","库存编号")],["body_type",tr("Body type","Carrocería","车身类型")],
   ["unit_price",tr("Unit price","Precio unitario","单价")]
  ];
  const facts=labels.filter(([key])=>cleanValue(item[key])).map(([key,label])=>label+": "+cleanValue(item[key]));
  const details=cleanValue(item.notes).split("\n").map(line=>line.trim()).filter(Boolean);
  // A single flowing description removes empty placeholders and retains every
  // supplied detail. Never silently truncate or add a third single-car page.
  const factsHeight=Math.max(90,Math.ceil(facts.length/2)*25);
  const split=Math.ceil(facts.length/2), column=(content-18)/2;
  text(n,facts.slice(0,split).join("\n"),y,factsHeight,{width:column,fontSize:10.5,minFontSize:8.5,lineHeight:1.65});
  text(n,facts.slice(split).join("\n"),y,factsHeight,{x:margin+column+18,width:column,fontSize:10.5,minFontSize:8.5,lineHeight:1.65});
  if(details.length) {
   y+=factsHeight+12;
   section(n,tr("EQUIPMENT & ADDITIONAL DETAILS","EQUIPAMIENTO Y DETALLES ADICIONALES","配置及其他详情"),y); y+=34;
   text(n,[...new Set(details)].join("\n"),y,754-y,{fontSize:10.5,minFontSize:8.5,lineHeight:1.3});
  }
  text(n,tr("Specifications are based on available vehicle records; confirm the exact unit and inspection before booking.","Datos según los registros disponibles; confirme la unidad exacta y la inspección antes de reservar.","规格基于现有车辆记录；预订前请确认具体车辆及验车结果。"),766,25,{fontSize:8.5,minFontSize:8});
 }
 for(let n=1;n<=pdf.getPageCount();n++) text(n,"info@nindgeauto.com  ·  nindgeauto.com                                      "+n+" / "+pdf.getPageCount(),809,15,{fontSize:8,minFontSize:8});
 try { return await generatePdf(await pdf.save(),{fields,protectedRegions:[],lockedPages:[],requiredFields:[],reviewed:true},{...data,images}); }
 catch(error) { if(error instanceof DocumentError && /too long|Unable to fit/.test(error.message)) throw new DocumentError("The quotation details exceed the readable two-page layout. Shorten repeated descriptions or payment terms and try again; no details have been truncated."); throw error; }
}
