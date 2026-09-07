import './load-typescript.cjs';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const require = createRequire(import.meta.url);
const { defaultField, EMPTY_MAPPING } = require('../lib/documents/types.ts');
const { prepareTemplate } = require('../lib/documents/prepare-template.ts');
const { inspectPdf } = require('../lib/documents/pdf.ts');
const { saveTemplate } = require('../lib/documents/store.ts');
const directory = path.resolve('private-documents/template-library');
await fs.mkdir(directory, { recursive: true });
const contractName = 'Contrato_Haina_Auto_Ali_Rmeiti_EST0076_Puerto_Cabello.pdf';
const quotationName = 'Cotizacion-HA-JAC-T9-Constructora-Joseines-Puerto-Cabello.pdf';

function mapper() {
  const mapping = structuredClone(EMPTY_MAPPING);
  function add(page, field, x, y, width, height, extra = {}) {
    const f = { ...defaultField(page), id: `p${page}-${field}-${mapping.fields.length}`, field, x, y, width, height, fontSize: 9, minFontSize: 7, maxLines: 20, replaceExisting: true, ...extra };
    mapping.fields.push(f); return f;
  }
  return { mapping, add };
}
async function textPages(filename) {
  const task = getDocument({ data: new Uint8Array(await fs.readFile(path.join('private-documents', filename))), useSystemFonts: true });
  const doc = await task.promise, pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p), content = await page.getTextContent();
    pages.push(content.items.filter(item => item.str?.trim()).map(item => ({ text: item.str, x: item.transform[4], y: page.view[3] - item.transform[5], width: item.width, size: item.height })));
  }
  await task.destroy(); return pages;
}
function autoLines(mapping, add, pages, replacements) {
  for (let i = 0; i < pages.length; i++) {
    const lines = new Map();
    for (const item of pages[i]) { const key = Math.round(item.y * 10); const items = lines.get(key) ?? []; items.push(item); lines.set(key, items); }
    const segments=[];
    for(const line of lines.values()){let segment=[];let end=-Infinity;for(const item of line.sort((a,b)=>a.x-b.x)){if(item.x-end>18&&segment.length){segments.push(segment);segment=[];}segment.push(item);end=item.x+item.width;}if(segment.length)segments.push(segment);}
    for (const items of segments) {
      const start = Math.min(...items.map(t => t.x)), end = Math.max(...items.map(t => t.x + t.width));
      const top = Math.min(...items.map(t => t.y - t.size)), bottom = Math.max(...items.map(t => t.y));
      if (mapping.fields.some(f => f.page === i + 1 && f.y < bottom + 2 && f.y + f.height > top - 1 && f.x < end && f.x + f.width > start)) continue;
      if (mapping.protectedRegions.some(f => f.page === i + 1 && f.y < bottom + 2 && f.y + f.height > top - 1 && f.x < end && f.x + f.width > start)) continue;
      const source = items.map(t => t.text).join(''); let text = source;
      for (const [from, to] of replacements) text = text.replaceAll(from, to);
      if (text !== source) add(i + 1, 'notes', Math.max(0,start - 1), top + 2, Math.min(555 - start, end - start + 5), bottom - top, { text, fontSize: Math.max(...items.map(t => t.size)), minFontSize: 6, maxLines: 1, wrap: false });
    }
  }
}

const q = mapper();
q.add(1,'document_number',405,72,145,12,{text:'N.º {{document_number}}',align:'right',fontSize:8,maxLines:1});
q.add(1,'issue_date',430,84,120,12,{align:'right',fontSize:8,maxLines:1});
for (const [field,y,text] of [['buyer_name',141,undefined],['buyer_email',165,undefined],['quantity',188,'{{quantity}} unidades'],['destination_port',211,'{{destination_port}}, {{destination_country}}'],['incoterm',235,'{{incoterm}} {{destination_port}} (Incoterms® 2020)'],['expiry_date',258,'{{expiry_date}}']]) q.add(1,field,296,y,250,17,{text,fontSize:10,minFontSize:7,maxLines:1});
q.add(1,'vehicle_summary',39,307,515,31,{text:'{{quantity}} vehículos con entrega {{incoterm}} en {{destination_port}}, {{destination_country}}. Detalle completo de unidades en las páginas siguientes.',fontSize:10,maxLines:2});
q.add(1,'vehicle_image',82,340,165,128,{kind:'image'});
q.add(1,'vehicles',296,365,252,78,{kind:'vehicles',fontSize:10,minFontSize:8,maxLines:6,overflow:{page:2,x:40,y:510,width:515,height:260,insertBefore:3}});
for (const [field,y,color] of [['subtotal',522,'#10233f'],['shipping_insurance',540,'#10233f'],['cif_price',557,'#ffffff'],['customs_estimate',590,'#10233f'],['estimated_grand_total',638,'#ffffff']]) q.add(1,field,410,y,137,17,{align:'right',fontSize:10,color,maxLines:1});
q.add(1,'total_amount',39,675,515,29,{text:'A pagar a HAINA AUTO EXPORT: {{total_amount}} {{incoterm}}.',fontWeight:'bold',fontSize:10});
q.add(1,'cif_price',39,707,515,15,{text:'Total {{incoterm}}: {{cif_price}}. Flete: {{shipping_cost}}. Seguro: {{insurance_cost}}.',fontSize:9,maxLines:1});
q.add(1,'notes',39,722,515,26,{text:'Los tributos y gastos en destino son estimaciones o partidas no incluidas. Confirmar con el agente de aduana en {{destination_country}}.',fontSize:9,maxLines:2});
for (const [field,y] of [['subtotal',120],['notes',137],['notes',155],['notes',172],['notes',190],['subtotal',207],['shipping_cost',284],['insurance_cost',301],['shipping_insurance',332],['subtotal',402],['shipping_cost',419],['insurance_cost',437],['cif_price',454]]) q.add(2,field,420,y,127,17,{align:'right',fontSize:10,maxLines:1,...(field==='notes'?{text:'Incluido / por confirmar'}:{})});
q.add(2,'notes',39,226,518,14,{text:'Partidas sujetas al desglose confirmado por HAINA AUTO.',fontSize:8,maxLines:1});
q.add(2,'notes',39,351,518,26,{text:'Flete y seguro conforme a la cotización y a las condiciones CIF acordadas.',fontSize:8,maxLines:2});
for (const [field,y] of [['cif_price',105],['notes',123],['notes',140],['notes',158],['customs_estimate',175],['estimated_grand_total',210]]) q.add(3,field,420,y,127,17,{align:'right',fontSize:10,maxLines:1,...(field==='notes'?{text:'Por confirmar'}:{})});
q.add(3,'notes',39,157,155,14,{text:'IVA según base confirmada',fontSize:10,maxLines:1});
q.add(3,'notes',39,273,518,30,{text:'Requisitos del cliente: confirmar los permisos, homologación y condiciones aplicables a los vehículos seleccionados en {{destination_country}}.',fontSize:10,maxLines:2});
q.add(3,'payment_terms',39,307,515,17,{text:'Condiciones: {{currency}}. {{initial_payment_percentage}}% inicial; {{remaining_percentage}}% restante.',fontSize:10,maxLines:1});
q.add(3,'buyer_email',39,327,518,30,{text:'Aceptación: {{company_email}}, con copia a {{buyer_email}}, citando {{document_number}}.',fontSize:10,maxLines:2});
q.add(3,'buyer_name',296,409,250,17,{fontSize:12,fontWeight:'bold',maxLines:1});
q.add(3,'buyer_email',296,428,250,14,{fontSize:9,maxLines:1});
q.add(3,'notes',39,244,518,23,{text:'Los impuestos y requisitos dependen del veh?culo y del pa?s de destino. Confirmar con el agente de aduana.',fontSize:8,maxLines:2});
autoLines(q.mapping,q.add,await textPages(quotationName),[['Subtotal FOB (veh?culo + origen China)','Precio de los veh?culos ({{incoterm}})'],['HA-COT-2026-097-JACT9','{{document_number}}'],['USD 7,600','{{cif_price}}'],['Puerto Cabello','{{destination_port}}'],['PUERTO CABELLO','{{destination_port}}'],['Venezuela','{{destination_country}}'],['1,755.00','{{shipping_cost}}']]);
q.mapping.requiredFields=['buyer_name','destination_port','total_amount'];

const c = mapper();
c.mapping.protectedRegions=[{page:2,x:34,y:475,width:215,height:177,label:'Authorized seller signature and company stamp'},{page:6,x:34,y:400,width:220,height:175,label:'Annex signature and company stamp'}];
c.add(1,'document_number',420,94,130,15,{text:'N.º {{document_number}}',align:'right',fontSize:9,maxLines:1});
c.add(1,'issue_date',35,176,165,22,{fontSize:12,fontWeight:'bold',maxLines:1});
c.add(1,'expiry_date',207,176,213,22,{fontSize:12,fontWeight:'bold',maxLines:1});
c.add(1,'cif_price',425,176,125,25,{fontSize:15,fontWeight:'bold',align:'right',color:'#e66a17',maxLines:1});
c.add(1,'buyer_name',37,239,252,66,{text:'{{buyer_name}}\n{{buyer_address}}\n{{buyer_country}} · {{buyer_email}}\n{{buyer_phone}}',fontSize:12,maxLines:6});
c.add(1,'quantity',37,349,123,16,{text:'{{quantity}} vehículos',color:'#ffffff',fontWeight:'bold',fontSize:10,maxLines:1});
c.add(1,'payment_method',423,349,124,16,{color:'#ffffff',fontSize:9,maxLines:1});
c.add(1,'notes',39,373,516,44,{text:'Este Contrato vende y exporta los vehículos de la cotización {{quotation_number}} al comprador {{buyer_name}}. El detalle completo de las unidades y sus VIN figura en el Anexo B. Forma parte integral el Anexo A — Términos y Condiciones de Importación (español / 中文).',fontSize:10,maxLines:3});
for(let i=0;i<2;i++) {
  const y=457+i*30;
  c.add(1,'vehicle_model',37,y,123,25,{text:'{{vehicle_year}} {{vehicle_brand}} {{vehicle_model}}',itemIndex:i,fontWeight:'bold',fontSize:9,maxLines:2});
  c.add(1,'vehicle_color',166,y,123,25,{text:'{{vehicle_condition}} · {{mileage}} km · {{vehicle_color}} · {{fuel}}',itemIndex:i,fontSize:9,maxLines:2});
  c.add(1,'vin',295,y,125,25,{itemIndex:i,fontSize:9,maxLines:2});
  c.add(1,'vehicle_total',435,y,112,25,{itemIndex:i,fontSize:9,align:'right',maxLines:2});
}
c.add(1,'notes',37,517,123,28,{text:'Detalle completo:\nAnexo B',fontSize:9,maxLines:2});
c.add(1,'cif_price',39,581,244,28,{fontSize:20,fontWeight:'bold',maxLines:1});
c.add(1,'cif_price',435,645,114,23,{fontSize:14,fontWeight:'bold',color:'#ffffff',align:'right',maxLines:1});
c.add(1,'customs_estimate',445,691,104,21,{fontSize:13,fontWeight:'bold',align:'right',maxLines:1});
c.add(1,'notes',39,717,510,14,{text:'Los tributos y gastos locales son del comprador y no se pagan a HAINA AUTO.',fontSize:8,maxLines:1});
c.add(2,'initial_payment_percentage',38,34,245,14,{text:'{{initial_payment_percentage}}% INICIAL',color:'#ffffff',fontSize:8,maxLines:1});
c.add(2,'remaining_percentage',296,34,252,14,{text:'{{remaining_percentage}}% RESTANTE',color:'#ffffff',fontSize:8,maxLines:1});
c.add(2,'initial_payment',38,51,245,23,{fontSize:16,fontWeight:'bold',maxLines:1});
c.add(2,'remaining_balance',296,51,252,23,{fontSize:16,fontWeight:'bold',maxLines:1});
c.add(2,'quantity',38,74,245,14,{text:'Al firmar, para reservar {{quantity}} unidades',fontSize:8,maxLines:1});
c.add(2,'payment_terms',34,101,520,130,{text:'3. PAGO / 付款\n{{payment_method}}\n{{payment_terms}}',fontSize:11,maxLines:9,replaceImages:true});
c.add(2,'buyer_name',296,487,250,23,{text:'{{buyer_name}} · {{buyer_country}}',fontSize:12,fontWeight:'bold',maxLines:1});
c.add(3,'vehicle_summary',39,694,516,74,{text:'VIN y unidades de este Contrato / 本合同车辆识别信息：\n{{vehicle_summary}}\nDetalle completo en Anexo B / 完整清单见附件 B。',fontSize:9,maxLines:9});
c.add(5,'payment_terms',39,32,516,55,{text:'{{initial_payment_percentage}}% al firmar; {{remaining_percentage}}% restante conforme a las condiciones acordadas.\n首付款 {{initial_payment_percentage}}%；尾款 {{remaining_percentage}}%。\n{{payment_terms}}',fontSize:9,maxLines:4});
c.add(5,'payment_method',39,128,516,68,{text:'Método autorizado / 授权付款方式：{{payment_method}}\n{{payment_terms}}\nNingún cambio de pago es válido sin confirmación oficial de HAINA AUTO.\n未经 HAINA AUTO 正式确认的收款信息变更无效。',fontSize:9,maxLines:5});
c.add(6,'buyer_name',296,414,250,22,{fontSize:12,fontWeight:'bold',maxLines:1});
c.add(6,'destination_port',296,494,251,12,{text:'{{destination_port}} · {{destination_country}}',fontSize:8,maxLines:1});
c.add(6,'vehicle_summary',296,506,251,25,{text:'VIN: ver Anexo B / 车辆识别码见附件 B',fontSize:8,maxLines:2});
c.add(7,'document_number',190,31,220,20,{text:'ANEXO B — VEHÍCULOS Y VIN',fontSize:13,fontWeight:'bold',align:'center',maxLines:1});
c.add(7,'notes',70,51,458,17,{text:'Unidades de {{document_number}} / {{buyer_name}}',fontSize:9,align:'center',maxLines:1});
c.add(7,'vehicles',39,90,516,660,{kind:'vehicles',replaceImages:true,fontSize:11,minFontSize:9,maxLines:45,overflow:{page:7,x:39,y:90,width:516,height:660,insertBefore:6}});
autoLines(c.mapping,c.add,await textPages(contractName),[['Puerto Cabello, Carabobo','{{destination_port}}'],['Puerto Cabello','{{destination_port}}'],['PUERTO CABELLO','{{destination_port}}'],['Venezuela','{{destination_country}}'],['委内瑞拉卡贝略港','{{destination_country}} {{destination_port}}'],['卡贝略港','{{destination_port}}'],['委内瑞拉','{{destination_country}}'],['CIF','{{incoterm}}']]);
c.mapping.requiredFields=['buyer_name','destination_port','payment_terms','payment_method','vin'];
c.mapping.allowedIncoterms=['CIF'];
c.add(7,'contract_terms',39,754,516,19,{replaceExisting:false,fontSize:10,minFontSize:9,maxLines:1,overflow:{page:7,x:39,y:90,width:516,height:660,insertBefore:6}});

const entries=[{name:'Official HainaAuto quotation',type:'quotation',language:'es',file:quotationName,mapping:q.mapping},{name:'Official HainaAuto contract and bilingual annexes',type:'contract',language:'es-zh',file:contractName,mapping:c.mapping},{name:'Official HainaAuto business verification',type:'other',language:'es-zh',file:'HAINA_AUTO_Verificacion_Empresarial_ES.pdf',mapping:{...structuredClone(EMPTY_MAPPING),lockedPages:[1,2,3,4]}}];
for(const entry of entries) {
  const original=await fs.readFile(path.join('private-documents',entry.file));
  const pages=await inspectPdf(original);
  const prepared=await prepareTemplate(original,entry.mapping);
  await fs.writeFile(path.join(directory,entry.type+'.json'),JSON.stringify({...entry,pages},null,2));
  await fs.writeFile(path.join(directory,entry.type+'-prepared.pdf'),prepared);
  console.log('Prepared',entry.type,pages.length,'pages',entry.mapping.fields.length,'mapped fields');
  // Import is explicit and append-only; activation remains an admin action.
  if(process.argv.includes('--import')) { const saved=await saveTemplate({name:entry.name,type:entry.type,language:entry.language,originalName:entry.file,original,mapping:entry.mapping});console.log('Imported draft',saved.id); }
}
