import './load-typescript.cjs';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const require=createRequire(import.meta.url);
const {prepareTemplate}=require('../lib/documents/prepare-template.ts');
const {inspectPdf}=require('../lib/documents/pdf.ts');
const {defaultField,EMPTY_MAPPING}=require('../lib/documents/types.ts');
const {saveTemplate}=require('../lib/documents/store.ts');
const directory='private-documents/template-library';
const source=JSON.parse(await fs.readFile(`${directory}/contract.json`,'utf8'));
const original=await fs.readFile(`private-documents/${source.file}`);
const clear={...structuredClone(EMPTY_MAPPING),protectedRegions:source.mapping.protectedRegions,fields:[]};
const area=(page,x,y,width,height)=>clear.fields.push({...defaultField(page),id:`clear-${clear.fields.length}`,x,y,width,height,text:'',replaceExisting:true,replaceImages:true});
area(1,315,50,241,62);area(1,34,146,521,630);
area(2,34,30,521,442);area(2,290,475,265,180);
for(const page of [3,4,5,7])area(page,34,25,521,751);
area(6,34,25,521,373);area(6,290,400,265,175);
const blank=await prepareTemplate(original,clear),file='template-library/derived-contract-master.pdf';
await fs.writeFile(`private-documents/${file}`,blank);
const task=getDocument({data:new Uint8Array(original),useSystemFonts:true}),doc=await task.promise;
const lines=[];
for(let page=1;page<=7;page++){
 const p=await doc.getPage(page),content=await p.getTextContent(),groups=new Map();
 for(const item of content.items.filter(i=>i.str?.trim())){const y=p.view[3]-item.transform[5],key=Math.round(y*10);const group=groups.get(key)??{y,items:[]};group.items.push(item);groups.set(key,group);}
 lines.push([...groups.values()].sort((a,b)=>a.y-b.y).map(g=>({y:g.y,text:g.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')})));
}
await task.destroy();
const english={
 3:`ANNEX A — VEHICLE IMPORTATION TERMS AND CONDITIONS
HAINA AUTO China / nindgeauto.com
These terms form an integral part of the purchase contract, proforma invoice and other commercial documents for the purchase, export and international shipment of the vehicle.

1. EXPORT ORIGIN
HAINA AUTO China will export the vehicle from the People's Republic of China, directly or through its authorized logistics, export and international transport partners. The Seller completes the applicable Chinese export procedures and prepares the documentation required for international shipment.

2. COMMERCIAL TERMS — CIF
Unless expressly stated otherwise in the Proforma Invoice or Contract, the transaction is CIF — Cost, Insurance and Freight, Incoterms® 2020. Destination: {{destination_port}}, {{destination_country}}. The CIF price includes the agreed vehicle price, transport to the Chinese port of departure, Chinese export procedures and documentation, export customs clearance, ocean freight to the agreed destination port, and marine insurance under the agreed CIF conditions.

3. COSTS EXCLUDED FROM CIF
Unless expressly agreed in writing, CIF excludes import duties and taxes, VAT or other local taxes, nationalization, destination port charges, storage, demurrage or detention, customs agent fees, local certification or inspections, registration or plates, and transport from the destination port to the Buyer's address. The Buyer bears these costs unless an additional clearance, nationalization or delivery service is expressly agreed.

4. VEHICLE IDENTIFICATION
The vehicle must match the Proforma Invoice, specification sheet or contract, including the agreed brand, model, year, VIN/chassis, engine, fuel, transmission, colour, mileage, condition and equipment.`,
 4:`5. VEHICLE INSPECTION
Before shipment, the Seller performs or arranges an inspection of general condition, VIN and conformity. The Buyer may receive photographs, videos, VIN, condition information and available inspection reports. New vehicles may have reasonable mileage from factory handling, inspection, storage and logistics.

6. EXPORT DOCUMENTS
As applicable, the Seller provides the commercial invoice, proforma invoice, packing list, bill of lading, vehicle and export documentation, VIN, available inspection information, certificate of origin where applicable, insurance certificate or policy, and other reasonably required documents.

7. SHIPMENT TIMING AND SCHEDULE
Shipment is arranged after receipt of the required payment and Buyer information. Departure, arrival and transit dates are estimates unless guaranteed in writing. The Seller is not liable for reasonable delays caused by schedules, congestion, customs, weather, shipping lines, transshipment, restrictions, strikes or force majeure.

8. TRANSFER OF RISK
Under CIF Incoterms® 2020, risk transfers to the Buyer when the vehicle is delivered on board at the Chinese port of departure. The Seller continues to arrange and pay for freight and insurance to {{destination_port}}.

9. MARINE INSURANCE
The Seller arranges marine insurance under the applicable CIF conditions. Claims are subject to the insurer's terms, limits and exclusions. The Seller provides reasonably available supporting documents.

10. NATIONALIZATION AND DESTINATION CUSTOMS
Unless agreed in writing, the Buyer is responsible for clearance, taxes, nationalization, certification, registration, inspections and permits. Final decisions rest with the authorities of {{destination_country}}.

11. BUYER INFORMATION
The Buyer provides accurate name, identification, address, telephone, email, country and port, and information required by the shipping line or customs. Costs caused by incorrect information are borne by the Buyer.

12. PAYMENT TERMS`,
 5:`14. DELAYS, STORAGE AND PORT CHARGES
The Buyer must collect the vehicle promptly. Storage, demurrage and detention arising from delays attributable to the Buyer are borne by the Buyer. If costs arise from a verified documentary error by the Seller, the parties will review responsibility.

15. IMPORT RESTRICTIONS
Before purchase, the Buyer confirms that the vehicle may be imported, nationalized and registered in {{destination_country}}, including requirements for age, emissions, safety, steering position, fuel, certification and registration.

16. ORDER CANCELLATION
After the initial payment and reservation or preparation of the vehicle, cancellation is subject to review. Costs already incurred may be deducted. The deposit is not automatically refundable once performance has begun.

17. PAYMENT DEFAULT
If the Buyer does not pay on time, the Seller may suspend export, documents, release and related services. Justified additional costs caused by delay may be added to the outstanding balance.

18. FORCE MAJEURE
Neither party is liable for delays caused by disasters, war, port closures, government restrictions, epidemics, strikes or logistics interruptions outside its reasonable control. The affected party must notify the other and mitigate the effects.

19. VEHICLE CLAIMS`,
 6:`A substantial difference from the agreed specifications must be reported with evidence: photographs, videos, VIN, inspection and description. The parties will seek a resolution in good faith.

20. CUSTOMS AND SUPPORT SERVICES
If HAINA AUTO facilitates a destination agent, its assistance is coordination unless expressly agreed otherwise. Official charges and decisions are not guaranteed.

21. DOCUMENTATION AND VERIFICATION
Before shipment, the Buyer may request reasonable available documentation to verify the transaction, solely to complete this purchase.

22. ACCEPTANCE OF TERMS
Signing the Contract, accepting the Proforma or making the initial payment confirms that the Buyer has read and accepts these terms, especially CIF, included and excluded costs, risk, customs, payment, transport and import requirements.`,
};
for(const language of ['es','en','zh']){
 const tr=(es,en,zh)=>language==='es'?es:language==='en'?en:zh;
 const mapping={...structuredClone(source.mapping),fields:structuredClone(source.mapping.fields.slice(0,37)).map(f=>({...f,replaceExisting:false,replaceImages:false}))};
 const add=(page,text,x,y,width,height,extra={})=>mapping.fields.push({...defaultField(page),id:`derived-${mapping.fields.length}`,field:'notes',text,x,y,width,height,fontSize:9,minFontSize:7,maxLines:100,...extra});
 const set=(index,es,en,zh)=>mapping.fields[index].text=tr(es,en,zh);
 set(5,'{{quantity}} vehículos','{{quantity}} vehicles','{{quantity}} 辆车');
 set(7,'Este Contrato vende y exporta los vehículos de {{quotation_number}} a {{buyer_name}}. El Anexo A forma parte integral. La lista completa de unidades y VIN figura en el Anexo B.','This Contract sells and exports the vehicles in {{quotation_number}} to {{buyer_name}}. Annex A is an integral part. The complete vehicle and VIN list is in Annex B.','本合同向 {{buyer_name}} 销售并出口报价单 {{quotation_number}} 所列车辆。附件A为合同组成部分，完整车辆及VIN清单见附件B。');
 set(16,'Detalle completo:\nAnexo B','Complete list:\nAnnex B','完整清单：\n附件B');
 set(20,'Los tributos y gastos locales son del comprador y no se pagan a HAINA AUTO.','Taxes and local costs are borne by the Buyer and are not paid to HAINA AUTO.','税费和当地费用由买方承担，不支付给 HAINA AUTO。');
 set(21,'{{initial_payment_percentage}}% INICIAL','{{initial_payment_percentage}}% INITIAL','{{initial_payment_percentage}}% 首付款');
 set(22,'{{remaining_percentage}}% RESTANTE','{{remaining_percentage}}% BALANCE','{{remaining_percentage}}% 尾款');
 set(25,'Al firmar, para reservar {{quantity}} unidades','On signing, to reserve {{quantity}} vehicles','签署时支付，以预留 {{quantity}} 辆车');
 set(26,'3. PAGO\n{{payment_method}}\n{{payment_terms}}','3. PAYMENT\n{{payment_method}}\n{{payment_terms}}','3. 付款\n{{payment_method}}\n{{payment_terms}}');
 set(28,'VIN y unidades:\n{{vehicle_summary}}\nDetalle completo en Anexo B.','Vehicles and VINs:\n{{vehicle_summary}}\nComplete list in Annex B.','车辆及VIN：\n{{vehicle_summary}}\n完整清单见附件B。');
 set(29,'{{initial_payment_percentage}}% al firmar; {{remaining_percentage}}% restante.\n{{payment_terms}}','{{initial_payment_percentage}}% on signing; {{remaining_percentage}}% balance.\n{{payment_terms}}','签署时支付 {{initial_payment_percentage}}%；尾款 {{remaining_percentage}}%。\n{{payment_terms}}');
 set(30,'13. MÉTODO DE PAGO\n{{payment_method}}','13. PAYMENT METHOD\n{{payment_method}}','13. 付款方式\n{{payment_method}}');
 // payment_method now carries the full approved block (method, network, wallet
 // address, "no change without confirmation" — see lib/documents/payment-methods.ts),
 // so the cover chip shows only the short summary and §3/§13 get room to breathe.
 mapping.fields[6].field='payment_method_summary';
 mapping.fields[26].maxLines=12;
 mapping.fields[30].height=80;mapping.fields[30].maxLines=8;
 set(33,'VIN: ver Anexo B','VIN: see Annex B','VIN：见附件B');
 set(34,'ANEXO B — VEHÍCULOS Y VIN','ANNEX B — VEHICLES AND VINS','附件B — 车辆及VIN');
 set(35,'Unidades de {{document_number}} / {{buyer_name}}','Vehicles for {{document_number}} / {{buyer_name}}','{{document_number}} 车辆 / {{buyer_name}}');
 add(1,tr('CONTRATO','CONTRACT','车辆购销合同'),365,58,188,25,{fontSize:20,fontWeight:'bold',align:'right',maxLines:1});
 add(1,'CIF · Incoterms® 2020',315,84,238,9,{align:'right',fontSize:8});
 [[39,tr('FECHA','DATE','日期')],[210,tr('VÁLIDA HASTA','VALID UNTIL','有效期')],[425,tr('TOTAL','TOTAL','总额')]].forEach(([x,t])=>add(1,t,x,153,x===425?125:160,13,{color:'#ffffff',fontSize:8}));
 add(1,tr('COMPRADOR','BUYER','买方'),39,218,249,14,{color:'#ffffff',fontWeight:'bold'});
 add(1,tr('VENDEDOR','SELLER','卖方'),296,218,251,14,{color:'#ffffff',fontWeight:'bold'});
 add(1,'HAINA AUTO EXPORT\nNingde Haina Baichuan Automobile Sales Co., Ltd.\n91350902MA31JKK5XF\nWeng Yueyun\nsales@hainaautochina.com · +86 155 3102 6121',296,239,251,68,{fontSize:10});
 [[39,tr('OBJETO','SUBJECT','标的')],[168,'INCOTERMS'],[296,tr('PUERTO','PORT','港口')],[425,tr('PAGO','PAYMENT','付款')]].forEach(([x,t])=>add(1,t,x,326,122,15,{fontWeight:'bold'}));
 add(1,'CIF',168,349,122,16,{color:'#ffffff'});add(1,'{{destination_port}}',296,349,123,16,{color:'#ffffff',maxLines:1});
 add(1,tr('1. UNIDADES, COLOR Y VIN','1. VEHICLES, COLOUR AND VIN','1. 车辆、颜色及VIN'),39,422,514,16,{fontWeight:'bold',fontSize:11});
 [[39,tr('UNIDAD','VEHICLE','车辆')],[168,tr('DETALLE','DETAILS','详情')],[296,'VIN'],[435,'{{currency}}']].forEach(([x,t])=>add(1,t,x,444,x===435?112:123,12,{fontWeight:'bold',color:'#ffffff',fontSize:8}));
 add(1,tr('TOTAL CIF — {{destination_port}}','CIF TOTAL — {{destination_port}}','CIF总额 — {{destination_port}}'),39,561,514,15,{fontWeight:'bold'});
 add(1,tr('Incluye vehículo, flete y seguro. No incluye impuestos ni gastos locales.','Includes vehicle, freight and insurance. Excludes taxes and local costs.','包含车辆、运费及保险，不包含税费及当地费用。'),296,582,251,47,{fontSize:10});
 add(1,tr('TOTAL A PAGAR','TOTAL PAYABLE','应付总额'),39,645,350,23,{fontSize:12,fontWeight:'bold',color:'#ffffff'});
 add(1,tr('Estimación aduanera','Customs estimate','海关费用估算'),39,691,400,21,{fontSize:11});
 add(1,tr('2. CALENDARIO DE PAGO','2. PAYMENT SCHEDULE','2. 付款计划'),39,747,514,20,{fontSize:12,fontWeight:'bold'});
 const ownership=language==='en'?`4. OWNERSHIP, RISK AND DOCUMENTS\nThe vehicles remain Haina's property until full verified payment. CIF risk passes to the Buyer on loading at origin. Haina arranges freight and insurance to {{destination_port}}. Before the balance, Haina sends photos, VIN and specifications. If a vehicle becomes unavailable, Haina will notify the Buyer and may offer a comparable alternative with written acceptance; without an alternative, payment is refunded within 10 business days less documented non-recoverable costs. Estimated transit: 30–45 days from vessel departure.`:language==='zh'?`4. 所有权、风险及文件\n全款核实到账前车辆所有权属于Haina。CIF风险于始发港装船时转移至买方。Haina安排至 {{destination_port}} 的运费及保险。尾款前提供照片、VIN及规格。车辆无法供应时应通知买方，可经书面同意提供同等替代；无替代时于10个工作日内退款，扣除有凭证的不可追回费用。预计航程为船舶出发后30至45天。`:lines[1].filter(l=>l.y>=246&&l.y<=319).map(l=>l.text).join('\n');
 add(2,ownership.replaceAll('Puerto Cabello','{{destination_port}}'),39,243,514,103,{fontSize:10,minFontSize:8});
 const defaultTerms=language==='en'?`5. DEFAULT, CANCELLATION AND GENERAL RULES\nWithout timely balance payment, Haina may stop shipment. After 15 days' notice it may terminate and resell; payments cover documented costs, with any surplus refunded or shortfall claimed. If Haina cannot perform for reasons attributable to it, it refunds within 10 business days. Indirect damages are excluded. Liability is limited to the CIF paid for the affected vehicle, except fraud. Force majeure requires notice and mitigation; after 60 days either party may terminate with adjustment of funds. Destination charges are the Buyer's. Spanish prevails. Annex A prevails over this summary on matters not regulated here, except the specific amounts, VIN, colour and payment schedule in this Contract.`:language==='zh'?`5. 违约、取消及一般规则\n未按时支付尾款时，Haina可停止装运。通知15日后可解除并转售；已付款用于有凭证费用，退还余额或追索不足部分。因Haina自身原因无法履约的，于10个工作日内退款。不承担间接损失；除欺诈外，责任以受影响车辆已付CIF金额为限。不可抗力应通知并减损，60日后任一方可终止并结算。目的地费用由买方承担。西班牙语文本优先。未在本合同约定事项以附件A为准，但具体金额、VIN、颜色及付款计划以本合同为准。`:lines[1].filter(l=>l.y>=333&&l.y<=427).map(l=>l.text).join('\n');
 add(2,defaultTerms.replaceAll('Venezuela','{{destination_country}}'),39,348,514,92,{fontSize:9,minFontSize:7});
 add(2,tr('6. FIRMAS','6. SIGNATURES','6. 签署'),39,443,514,20,{fontSize:11,fontWeight:'bold'});
 add(2,tr('COMPRADOR — POR FIRMAR','BUYER — TO SIGN','买方 — 待签署'),296,476,250,11,{fontSize:8});
 add(2,tr('Firma: __________________________\nFecha: __________________________\nDocumento de identidad: __________','Signature: _______________________\nDate: ___________________________\nIdentification: ____________________','签名：__________________________\n日期：__________________________\n身份证明：______________________'),296,515,250,69,{fontSize:10,lineHeight:1.8});
 for(const page of [3,4,5,6]){
   const range=page===3?[25,688]:page===4?[25,778]:page===5?[205,778]:[25,360];
   const content=language==='en'?english[page]:lines[page-1].filter(l=>l.y>=range[0]&&l.y<=range[1]&&(/[\u3400-\u9fff]/u.test(l.text)===(language==='zh'))).map(l=>l.text).join('\n');
   const text=content.replaceAll('Puerto Cabello','{{destination_port}}').replaceAll('卡贝略港','{{destination_port}}').replaceAll('Venezuela','{{destination_country}}').replaceAll('委内瑞拉','{{destination_country}}').replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/gu,'$1');
   add(page,text,39,range[0]+7,514,range[1]-range[0]-8,{fontSize:10,minFontSize:7,lineHeight:1.2});
 }
 add(6,tr('FIRMAS DEL ANEXO A','ANNEX A SIGNATURES','附件A签署'),39,374,514,20,{fontWeight:'bold',fontSize:11});
 add(6,tr('COMPRADOR','BUYER','买方'),296,400,250,13,{fontSize:8});
 add(6,tr('Documento: ___________________\nFirma: ________________________\nFecha: ________________________','Identification: __________________\nSignature: _____________________\nDate: _________________________','身份证明：____________________\n签名：________________________\n日期：________________________'),296,439,250,54,{fontSize:9,lineHeight:1.7});
 mapping.reviewed=false;
 mapping.fields.push({...defaultField(7),id:'additional-contract-terms',field:'contract_terms',x:39,y:754,width:516,height:19,fontSize:10,minFontSize:9,maxLines:1,overflow:{page:7,x:39,y:90,width:516,height:660,insertBefore:6}});
 const entry={name:`HainaAuto contract — ${language} (derived)`,type:'contract',language,file,source:source.file,mapping,pages:await inspectPdf(blank)};
 await fs.writeFile(`${directory}/contract-${language}.json`,JSON.stringify(entry,null,2));
 if(process.argv.includes('--import')){const saved=await saveTemplate({name:entry.name,type:entry.type,language,originalName:'derived-contract-master.pdf',original:blank,mapping});console.log('Imported draft',saved.id);}
}
console.log('Prepared Spanish, English and Chinese contract variants; protected signature artwork retained.');
