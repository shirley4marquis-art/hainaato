// One design master for every company-generated document.
// Run after the legacy source preparation scripts, before QA/installation.
import './load-typescript.cjs';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PDFDocument,rgb} from 'pdf-lib';
const require=createRequire(import.meta.url);
const {prepareTemplate}=require('../lib/documents/prepare-template.ts');
const {inspectPdf}=require('../lib/documents/pdf.ts');
const {defaultField,EMPTY_MAPPING}=require('../lib/documents/types.ts');
const root='private-documents', dir=root+'/template-library';
export const DESIGN_REVISION='contract-reference-2026-09-v1';
const source='Contrato_Haina_Auto_Ali_Rmeiti_EST0076_Puerto_Cabello.pdf';
const original=await fs.readFile(root+'/'+source);
const sourcePdf=await PDFDocument.load(original),single=await PDFDocument.create();
single.addPage((await single.copyPages(sourcePdf,[0]))[0]);
const clear={...structuredClone(EMPTY_MAPPING),fields:[
 {...defaultField(1),id:'clear-title',x:310,y:48,width:245,height:64,text:'',replaceExisting:true},
 {...defaultField(1),id:'clear-body',x:30,y:155,width:530,height:615,text:'',replaceExisting:true,replaceImages:true},
]};
const cover=await prepareTemplate(await single.save(),clear);
await fs.writeFile(dir+'/contract-design-cover.pdf',cover);
const W=595.304,H=841.89;
const C={navy:'#0b203c',orange:'#f36b16',muted:'#758092',border:'#dce0e6',pale:'#f8f0e5',stripe:'#f5f6f8'};
const color=hex=>rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
const title={
 contract:['CONTRATO','CONTRACT',"购销合同"],
 quotation:['COTIZACIÓN','QUOTATION',"商业报价"],
 proforma:['FACTURA PROFORMA','PROFORMA INVOICE',"形式发票"],
 invoice:['FACTURA COMERCIAL','COMMERCIAL INVOICE',"商业发票"],
 specification:['FICHA TÉCNICA','SPECIFICATION',"车辆规格"],
 inspection:['INSPECCIÓN','INSPECTION',"车辆检验"],
 acquisition:['ADQUISICIÓN','ACQUISITION',"车辆采购"],
 export:['EXPORTACIÓN','EXPORT DOCUMENTS',"出口文件"],
 customs:['ADUANAS','CUSTOMS DOCUMENTS',"海关文件"],
 importation_terms:['IMPORTACIÓN','IMPORTATION TERMS','进口条款'],
 other:['VERIFICACIÓN','VERIFICATION',"企业核验"],
};
const translate=language=>(es,en,zh)=>language==='en'?en:language==='zh'?zh:language==='es-zh'?es+' / '+zh:es;
function fieldsFor(language){
 const fields=[],tr=translate(language);
 const add=(page,field,x,y,width,height,extra={})=>{
  const f={...defaultField(page),id:'design-'+fields.length,field,x,y,width,height,fontSize:9,minFontSize:7,maxLines:2,color:C.navy,lineHeight:1.2,...extra};
  fields.push(f);return f;
 };
 const label=(page,text,x,y,width,height,extra={})=>add(page,'notes',x,y,width,height,{text,...extra});
 return {fields,tr,add,label};
}
function heading(f,page,type){
 const {label,add,tr}=f;
 label(page,tr(...title[type]),310,55.7,234.9,27,{fontSize:22,minFontSize:12,fontWeight:'bold',maxLines:1,align:'right'});
 const subtitle=['contract','quotation','proforma','invoice','importation_terms'].includes(type)
 ? tr('Compraventa internacional · {{incoterm}} · Incoterms® 2020','International sale · {{incoterm}} · Incoterms® 2020',"国际贸易 · {{incoterm}} · Incoterms® 2020")
 : tr('Documentación oficial · HAINA AUTO EXPORT','Official documentation · HAINA AUTO EXPORT',"正式文件 · HAINA AUTO EXPORT");
 label(page,subtitle,300,83.1,244.9,10.5,{fontSize:9,minFontSize:6,fontWeight:'bold',color:C.orange,align:'right',maxLines:1});
 add(page,'document_number',340,94.95,204.9,12,{text:'N.º {{document_number}}',fontSize:9,color:C.muted,align:'right',maxLines:1});
}
function front(type,language){
 const f=fieldsFor(language),{label,add,tr}=f,technical=!['contract','quotation','proforma','invoice','importation_terms'].includes(type);
 heading(f,1,type);
 label(1,tr('FECHA','DATE',"日期"),36.4,166.35,162,10.5,{fontSize:8,fontWeight:'bold',color:C.muted,maxLines:1});
 label(1,tr('VÁLIDA HASTA','VALID UNTIL',"有效期"),208.35,166.35,205,10.5,{fontSize:8,fontWeight:'bold',color:C.muted,maxLines:1});
 label(1,tr(technical?'CANTIDAD':'TOTAL',technical?'QUANTITY':'TOTAL',technical?"数量":"总额"),423,166.35,125.3,10.5,{fontSize:8,fontWeight:'bold',color:C.muted,align:'right',maxLines:1});
 add(1,'issue_date',36.4,177.15,165,17,{fontSize:12,minFontSize:9,fontWeight:'bold',maxLines:1});
 add(1,'expiry_date',208.35,177.15,211,17,{fontSize:12,minFontSize:9,fontWeight:'bold',maxLines:1});
 add(1,technical?'quantity':'total_amount',425,176.95,123.3,21,{fontSize:16,minFontSize:10,fontWeight:'bold',color:C.orange,align:'right',maxLines:1});
 label(1,tr(technical?'VEHÍCULO':'COMPRADOR',technical?'VEHICLE':'BUYER',technical?"车辆":"买方"),38.9,221.95,249,11,{fontSize:8,fontWeight:'bold',color:'#ffffff',maxLines:1});
 label(1,tr('VENDEDOR','SELLER',"卖方"),296.85,221.95,250,11,{fontSize:8,fontWeight:'bold',color:'#ffffff',maxLines:1});
 add(1,technical?'vehicle_model':'buyer_name',38.9,239.7,249,17,{...(technical?{text:'{{vehicle_brand}} {{vehicle_model}}'}:{}),fontSize:13,minFontSize:9,fontWeight:'bold',maxLines:1});
 add(1,'buyer_address',38.9,258.2,249,48,{text:technical?'{{vehicle_year}} · {{vehicle_condition}} · {{vehicle_color}}\n{{engine}} · {{fuel}} · {{transmission}}\nVIN: {{vin}}':'{{buyer_country}} · {{buyer_address}}\n{{buyer_email}}\n{{buyer_phone}}',fontSize:9,minFontSize:8,maxLines:4});
 label(1,'HAINA AUTO EXPORT',296.85,239.7,250,17,{fontSize:13,fontWeight:'bold',maxLines:1});
 label(1,'Ningde Haina Baichuan Automobile Sales Co., Ltd.',296.85,258.2,250,12,{fontSize:9,maxLines:1});
 label(1,tr('Código social','Company code','统一社会信用代码')+' 91350902MA31JKK5XF',296.85,271.15,250,10.5,{fontSize:8,maxLines:1});
 label(1,tr('Representante legal: Weng Yueyun','Legal representative: Weng Yueyun',"法定代表人：Weng Yueyun"),296.85,282.65,250,11,{fontSize:9,maxLines:1});
 label(1,'sales@hainaautochina.com · +86 155 3102 6121',296.85,295.6,250,11,{fontSize:8,maxLines:1});
 const meta=[
 [37.9,tr('OBJETO','SUBJECT',"标的"),'quantity',tr('{{quantity}} vehículos','{{quantity}} vehicles',"{{quantity}} 辆车")],
 [166.85,technical?tr('COMBUSTIBLE','FUEL',"燃料"):'INCOTERMS',technical?'fuel':'incoterm'],
 [295.8,tr(technical?'MOTOR':'PUERTO DE DESTINO',technical?'ENGINE':'DESTINATION PORT',technical?"发动机":"目的港"),technical?'engine':'destination_port'],
 [424.75,tr(technical?'TRANSMISIÓN':'PAGO',technical?'TRANSMISSION':'PAYMENT',technical?"变速箱":"付款"),technical?'transmission':'payment_method_summary'],
 ];
 for(const [x,t,key,text] of meta){
  label(1,t,x,336.5,122,10,{fontSize:7,minFontSize:5.5,fontWeight:'bold',color:'#ffffff',maxLines:1});
  add(1,key,x,349.2,122,15,{...(text?{text}:{}),fontSize:10,minFontSize:7,fontWeight:'bold',color:'#ffffff',maxLines:1});
 }
 const intro=type==='contract'
 ?tr('Este Contrato vende y exporta los vehículos de {{quotation_number}} a {{buyer_name}}. El Anexo A forma parte integral. La relación completa de unidades y VIN figura en el Anexo B.','This Contract sells and exports the vehicles in {{quotation_number}} to {{buyer_name}}. Annex A is integral to this Contract. The complete vehicle and VIN list is in Annex B.',"本合同向 {{buyer_name}} 销售并出口报价单 {{quotation_number}} 所列车辆。附件A为合同组成部分，完整车辆及VIN清单见附件B。")
 :tr('Documento {{document_number}}. El detalle completo de las unidades y la información de la operación figuran en las páginas siguientes.','Document {{document_number}}. Complete vehicle details and transaction information follow on the next pages.',"文件 {{document_number}}。完整车辆清单及交易信息见后续页面。");
 label(1,intro,39.8,374.05,508,40,{fontSize:10,minFontSize:8.5,maxLines:3});
 label(1,tr('1. UNIDADES, COLOR Y VIN','1. VEHICLES, COLOUR AND VIN',"1. 车辆、颜色及VIN"),39.8,421.4,510,15,{fontSize:11,fontWeight:'bold',maxLines:1});
 for(const [x,t,width,align] of [[37.9,tr('UNIDAD','VEHICLE',"车辆"),121,'left'],[166.85,tr('DETALLE','DETAILS',"详情"),121,'left'],[295.8,'VIN',121,'left'],[424.75,technical?tr('MOTOR','ENGINE',"发动机"):'{{incoterm}} {{currency}}',122,'right']]){
  label(1,t,x,441.85,width,11,{fontSize:8,fontWeight:'bold',color:'#ffffff',align,maxLines:1});
 }
 for(let i=0;i<2;i++){
  const y=458.6+i*30.1;
  add(1,'vehicle_model',37.9,y,122,26,{text:'{{vehicle_year}} {{vehicle_brand}} {{vehicle_model}}',itemIndex:i,fontSize:9,fontWeight:'bold'});
  add(1,'vehicle_color',166.85,y,122,26,{text:'{{vehicle_condition}} · {{mileage}} km · {{vehicle_color}} · {{fuel}}',itemIndex:i,fontSize:9});
  add(1,'vin',295.8,y,122,26,{itemIndex:i,fontSize:9,maxLines:1});
  add(1,technical?'engine':'vehicle_total',424.75,y,122,26,{itemIndex:i,fontSize:9,align:'right',maxLines:2});
 }
 label(1,tr(technical?'Detalle completo':'Flete + seguro',technical?'Complete details':'Freight + insurance',technical?"完整资料":"运费及保险"),37.9,518.8,122,26,{fontSize:9,fontWeight:'bold'});
 add(1,technical?'notes':'shipping_insurance',166.85,518.8,122,26,{...(technical?{text:tr('Páginas siguientes','Following pages',"见后续页面")}:{})});
 label(1,'—',295.8,518.8,122,14);
 add(1,technical?'quantity':'shipping_insurance',424.75,518.8,122,26,{align:'right'});
 const totalLabel=technical?tr('RESUMEN DEL VEHÍCULO','VEHICLE SUMMARY',"车辆摘要"):tr('TOTAL {{incoterm}} — {{destination_port}}','{{incoterm}} TOTAL — {{destination_port}}',"{{incoterm}} 总额 — {{destination_port}}");
 label(1,totalLabel,39.9,570.45,243,11,{fontSize:8,fontWeight:'bold',color:C.muted,maxLines:1});
 add(1,technical?'vehicle_model':'total_amount',39.9,582.25,243,29,{fontSize:20,minFontSize:12,fontWeight:'bold',maxLines:1});
 label(1,technical?tr('Información del vehículo:','Vehicle information:',"车辆信息："):tr('Condición comercial: {{incoterm}}','Trade terms: {{incoterm}}',"贸易条款：{{incoterm}}"),297.85,570.45,249,11,{fontSize:8,fontWeight:'bold',maxLines:1});
 label(1,technical?'{{engine}} · {{fuel}} · {{transmission}}\n{{vehicle_color}} · {{mileage}} km':tr('• Flete + seguro: {{shipping_insurance}}\n• No incluye impuestos ni gastos locales','• Freight + insurance: {{shipping_insurance}}\n• Excludes taxes and local charges',"• 运费及保险：{{shipping_insurance}}\n• 不含税费及当地费用"),297.85,582,249,36,{fontSize:9,minFontSize:7.5,maxLines:3});
 label(1,technical?tr('UNIDADES DOCUMENTADAS','DOCUMENTED VEHICLES',"所列车辆"):totalLabel,38.9,646,360,18,{fontSize:10,minFontSize:7,fontWeight:'bold',color:'#ffffff',maxLines:1});
 add(1,technical?'quantity':'total_amount',411,645.75,134.8,19,{fontSize:14,minFontSize:9,fontWeight:'bold',color:'#ffffff',align:'right',maxLines:1});
 label(1,technical?tr('Identificación del vehículo','Vehicle identification',"车辆识别码"):tr('Estimación aduanera (no se paga a Haina)','Customs estimate (not payable to Haina)',"海关费用估算（不支付给Haina）"),38.9,691.75,355,19,{fontSize:9,minFontSize:7,fontWeight:'bold',color:C.muted,maxLines:1});
 add(1,technical?'vin':'customs_estimate',398,691.45,147.8,20,{fontSize:technical?10:14,minFontSize:8,fontWeight:'bold',align:'right',maxLines:1});
 label(1,technical?tr('Datos sujetos a la documentación y verificación de la unidad.','Details subject to the vehicle documentation and verification.',"车辆信息以文件及核验为准。"):tr('Costo total referencial: {{estimated_grand_total}}','Estimated total cost: {{estimated_grand_total}}',"总费用参考：{{estimated_grand_total}}"),39.8,718.25,509,12,{fontSize:8,color:C.muted,maxLines:1});
 label(1,tr(technical?'2. DETALLE Y DOCUMENTACIÓN':'2. CALENDARIO DE PAGO',technical?'2. DETAILS AND DOCUMENTATION':'2. PAYMENT SCHEDULE',technical?"2. 详细信息及文件":"2. 付款计划"),39.8,735.7,510,16,{fontSize:11,fontWeight:'bold',maxLines:1});
 return f.fields;
}
async function addStationery(pdf){
 const master=await PDFDocument.load(cover);
 const header=await pdf.embedPage(master.getPage(0),{left:0,bottom:H-159,right:W,top:H});
 const footer=await pdf.embedPage(master.getPage(0),{left:0,bottom:0,right:W,top:H-775});
 const page=pdf.addPage([W,H]);
 page.drawPage(header,{x:0,y:H-159,width:W,height:159});
 page.drawPage(footer,{x:0,y:0,width:W,height:H-775});
 return page;
}
function band(page,y,height=18){page.drawRectangle({x:34.3,y:H-y-height,width:515.9,height,color:color(C.navy)});}
function box(page,y,height,fill=C.stripe){page.drawRectangle({x:34.3,y:H-y-height,width:515.9,height,color:color(fill),borderColor:color(C.border),borderWidth:.5});}
async function commercial(entry){
 const pdf=await PDFDocument.create();pdf.addPage((await pdf.copyPages(await PDFDocument.load(cover),[0]))[0]);
 const p2=await addStationery(pdf),p3=await addStationery(pdf);
 const f=fieldsFor(entry.language),{label,add,tr}=f,technical=!['quotation','proforma','invoice'].includes(entry.type);
 f.fields.push(...front(entry.type,entry.language));
 // Renumber because front() and this builder have separate deterministic counters.
 const section=(p,y,text)=>{band(p===2?p2:p3,y);label(p,text,39,y+3,505,12,{color:'#ffffff',fontWeight:'bold',fontSize:8,maxLines:1});};
 heading(f,2,entry.type);heading(f,3,entry.type);
 section(2,170,tr('UNIDADES — RELACIÓN COMPLETA','VEHICLES — COMPLETE LIST',"完整车辆清单"));
 add(2,'vehicles',39,196,508,322,{kind:'vehicles',fontSize:10,minFontSize:9,maxLines:80,...(technical?{text:'{{vehicle_year}} {{vehicle_brand}} {{vehicle_model}}\nVIN: {{vin}} · {{vehicle_color}} · {{vehicle_condition}}\n{{engine}} · {{fuel}} · {{transmission}} · {{mileage}} km'}:{}),overflow:{page:2,x:39,y:196,width:508,height:322,insertBefore:3}});
 section(2,538,tr(technical?'INFORMACIÓN DE LA OPERACIÓN':'CALENDARIO DE PAGO',technical?'TRANSACTION INFORMATION':'PAYMENT SCHEDULE',technical?"交易信息":"付款计划"));
 box(p2,556,75,C.pale);
 label(2,tr(technical?'CLIENTE':'PAGO INICIAL ({{initial_payment_percentage}}%)',technical?'CLIENT':'INITIAL PAYMENT ({{initial_payment_percentage}}%)',technical?"客户":"首付款 ({{initial_payment_percentage}}%)"),39,564,247,12,{fontSize:8,fontWeight:'bold',color:C.muted,maxLines:1});
 label(2,tr(technical?'DESTINO':'SALDO ({{remaining_percentage}}%)',technical?'DESTINATION':'BALANCE ({{remaining_percentage}}%)',technical?"目的地":"尾款 ({{remaining_percentage}}%)"),297,564,247,12,{fontSize:8,fontWeight:'bold',color:C.muted,maxLines:1});
 add(2,technical?'buyer_name':'initial_payment',39,584,247,35,{fontSize:technical?11:16,fontWeight:'bold',maxLines:2});
 add(2,technical?'destination_port':'remaining_balance',297,584,247,35,{fontSize:technical?11:16,fontWeight:'bold',maxLines:2});
 add(2,'buyer_name',39,645,508,24,{text:technical?'{{buyer_email}} · {{buyer_phone}}':'{{buyer_name}} · {{buyer_email}}',fontSize:9,maxLines:2});
 add(2,'buyer_address',39,679,508,30,{fontSize:9,maxLines:2});
 label(2,tr('Documento {{document_number}} · {{quotation_number}}','Document {{document_number}} · {{quotation_number}}',"文件 {{document_number}} · {{quotation_number}}"),39,737,508,14,{fontSize:8,color:C.muted,maxLines:1});
 section(3,170,tr('NOTAS Y CONDICIONES','NOTES AND CONDITIONS',"备注及条件"));
 add(3,'payment_method',39,199,508,104,{fontSize:10,minFontSize:8,maxLines:8});
 add(3,'payment_terms',39,315,508,132,{fontSize:10,minFontSize:9,maxLines:10,overflow:{page:3,x:39,y:196,width:508,height:530,insertBefore:4}});
 section(3,466,tr('DOCUMENTACIÓN ADICIONAL','ADDITIONAL DOCUMENTATION',"附加文件"));
 add(3,entry.type==='inspection'?'inspection_notes':entry.type==='export'?'export_documents':'notes',39,496,508,224,{fontSize:10,minFontSize:9,maxLines:50,overflow:{page:3,x:39,y:196,width:508,height:530,insertBefore:4}});
 label(3,'HAINA AUTO EXPORT · {{company_email}}',39,737,508,14,{fontSize:8,color:C.muted,maxLines:1});
 const mapping={...structuredClone(EMPTY_MAPPING),fields:f.fields.map((v,i)=>({...v,id:'unified-'+i})),requiredFields:technical?['vehicles']:['buyer_name','destination_port','total_amount']};
 return {bytes:await pdf.save(),mapping};
}
// The full payment block already contains the approved network and change warning.
// Avoid repeating that block inside the narrow bilingual annex field.
function paymentField(f){
 return f.field==='payment_method'&&f.y===128
 ? {...f,text:'{{payment_method}}',height:76,maxLines:8}
 : f;
}
for(const filename of (await fs.readdir(dir)).filter(n=>n.endsWith('.json'))){
 const entry=JSON.parse(await fs.readFile(dir+'/'+filename,'utf8'));
 let result;
 if(entry.type==='importation_terms')continue;
 if(entry.type==='contract'){
  const base=await prepareTemplate(await fs.readFile(root+'/'+entry.file),{...entry.mapping,fields:entry.mapping.fields.filter(f=>f.page!==1)});
  const pdf=await PDFDocument.load(base);
  pdf.removePage(0);pdf.insertPage(0,(await pdf.copyPages(await PDFDocument.load(cover),[0]))[0]);
  result={bytes:await pdf.save(),mapping:{...entry.mapping,fields:[...front('contract',entry.language),...entry.mapping.fields.filter(f=>f.page!==1).map(f=>({...paymentField(f),replaceExisting:false,replaceImages:false}))].map((f,i)=>({...f,id:'unified-'+i}))}};
 }else if(entry.type==='other'){
  const pdf=await PDFDocument.create(),page=await addStationery(pdf),f=fieldsFor(entry.language);
  heading(f,1,'other');band(page,220);
  f.label(1,f.tr('IDENTIDAD Y DOCUMENTACIÓN DE LA EMPRESA','COMPANY IDENTITY AND DOCUMENTATION',"公司身份及文件"),39,224,508,12,{color:'#ffffff',fontWeight:'bold',fontSize:8,maxLines:1});
  f.label(1,'HAINA AUTO EXPORT',39,260,508,26,{fontSize:20,fontWeight:'bold',maxLines:1});
  f.label(1,'Ningde Haina Baichuan Automobile Sales Co., Ltd.\n91350902MA31JKK5XF\n11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China',39,309,508,90,{fontSize:11,maxLines:5});
  box(page,430,120,C.pale);
  f.label(1,f.tr('Los documentos originales de verificación se adjuntan a continuación.','The original verification documents are attached on the following pages.',"原始核验文件附于以下页面。"),44,451,496,60,{fontSize:12,maxLines:4});
  f.label(1,'sales@nindgeauto.com · nindgeauto.com',39,588,508,20,{fontSize:11,maxLines:1});
  const evidence=await PDFDocument.load(await fs.readFile(root+'/HAINA_AUTO_Verificacion_Empresarial_ES.pdf'));
  for(const p of await pdf.copyPages(evidence,evidence.getPageIndices()))pdf.addPage(p);
  result={bytes:await pdf.save(),mapping:{...structuredClone(EMPTY_MAPPING),fields:f.fields,lockedPages:evidence.getPageIndices().map(i=>i+2)}};
 }else result=await commercial(entry);
 const file='template-library/unified-'+filename.replace('.json','.pdf');
 await fs.writeFile(root+'/'+file,result.bytes);
 await fs.writeFile(dir+'/'+filename,JSON.stringify({...entry,file,source,designRevision:DESIGN_REVISION,mapping:result.mapping,pages:await inspectPdf(result.bytes)},null,2));
 console.log('Unified',entry.type,entry.language);
}
// Use the same cover for standalone terms; retain every signed annex page.
for(const language of ['es','en','zh','es-zh']){
 const filename='importation_terms-'+language+'.json';
 const entry=JSON.parse(await fs.readFile(dir+'/'+filename,'utf8'));
 const prior=await PDFDocument.load(await prepareTemplate(await fs.readFile(root+'/'+entry.file),entry.mapping));
 const pdf=await PDFDocument.create();pdf.addPage((await pdf.copyPages(await PDFDocument.load(cover),[0]))[0]);
 const skip=entry.designRevision===DESIGN_REVISION&&entry.designCover===true?1:0;
 for(const p of await pdf.copyPages(prior,prior.getPageIndices().slice(skip)))pdf.addPage(p);
 const shift=1-skip;
 const fields=[...front('importation_terms',language),...entry.mapping.fields.filter(f=>f.page>skip).map(f=>({...paymentField(f),page:f.page+shift,replaceExisting:false,replaceImages:false,...(f.overflow?{overflow:{...f.overflow,page:f.overflow.page+shift,insertBefore:f.overflow.insertBefore+shift}}:{})}))].map((f,i)=>({...f,id:'unified-'+i}));
 const mapping={...entry.mapping,fields,protectedRegions:entry.mapping.protectedRegions.map(r=>({...r,page:r.page+shift})),lockedPages:entry.mapping.lockedPages.map(p=>p+shift)};
 const bytes=await pdf.save(),file='template-library/unified-'+filename.replace('.json','.pdf');
 await fs.writeFile(root+'/'+file,bytes);
 await fs.writeFile(dir+'/'+filename,JSON.stringify({...entry,file,mapping,pages:await inspectPdf(bytes),designRevision:DESIGN_REVISION,designCover:true,source},null,2));
 console.log('Unified importation terms',language);
}
