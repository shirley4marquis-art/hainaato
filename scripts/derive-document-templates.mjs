// Derive language and document variants by editing text on the supplied PDF.
// Original company artwork, tables, logo, headers and footers are retained.
import './load-typescript.cjs';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {prepareTemplate}=require('../lib/documents/prepare-template.ts');
const {inspectPdf}=require('../lib/documents/pdf.ts');
const {defaultField,EMPTY_MAPPING}=require('../lib/documents/types.ts');
const {saveTemplate}=require('../lib/documents/store.ts');
const root='private-documents',directory=path.join(root,'template-library');
await fs.mkdir(directory,{recursive:true});
const source='Cotizacion-HA-JAC-T9-Constructora-Joseines-Puerto-Cabello.pdf';
const original=await fs.readFile(path.join(root,source));
const clear={...structuredClone(EMPTY_MAPPING),fields:[
 {...defaultField(1),id:'title',x:402,y:56,width:153,height:52,replaceExisting:true,text:''},
 ...[1,2,3].map(page=>({...defaultField(page),id:`body-${page}`,x:34,y:page===1?119:25,width:525,height:page===1?643:747,replaceExisting:true,replaceImages:page===1,text:''}))
]};
const blank=await prepareTemplate(original,clear);
const derivedFile='template-library/derived-commercial-master.pdf';await fs.writeFile(path.join(root,derivedFile),blank);
const labels={
 quotation:['COTIZACIÓN COMERCIAL','COMMERCIAL QUOTATION','商业报价'],
 proforma:['FACTURA PROFORMA','PROFORMA INVOICE','形式发票'],
 invoice:['FACTURA COMERCIAL','COMMERCIAL INVOICE','商业发票'],
 specification:['ESPECIFICACIÓN DEL VEHÍCULO','VEHICLE SPECIFICATION','车辆规格表'],
 inspection:['INFORME DE INSPECCIÓN','VEHICLE INSPECTION REPORT','车辆检验报告'],
 acquisition:['ADQUISICIÓN Y SUMINISTRO','ACQUISITION / SUPPLY STATEMENT','车辆采购及供应声明'],
 export:['DOCUMENTOS DE EXPORTACIÓN','EXPORT DOCUMENTS','出口文件'],
 customs:['DOCUMENTACIÓN ADUANERA','CUSTOMS DOCUMENTS','海关文件'],
};
for(const type of Object.keys(labels))for(const language of ['es','en','zh','es-zh']){
 const tr=(es,en,zh)=>language==='es'?es:language==='en'?en:language==='zh'?zh:`${es} / ${zh}`;
 const mapping=structuredClone(EMPTY_MAPPING);
 const add=(page,field,x,y,width,height,extra={})=>mapping.fields.push({...defaultField(page),id:`${page}-${mapping.fields.length}`,field,x,y,width,height,fontSize:9,minFontSize:7,maxLines:20,...extra});
 const label=(page,text,x,y,width,height,extra={})=>add(page,'notes',x,y,width,height,{text,...extra});
 label(1,tr(...labels[type]),403,57,150,16,{fontSize:11,fontWeight:'bold',align:'right',maxLines:1,minFontSize:6});
 add(1,'document_number',405,77,146,12,{fontSize:8,align:'right',maxLines:1});
 add(1,'issue_date',405,91,146,12,{fontSize:8,align:'right',maxLines:1});
 label(1,tr('Cliente','Client','客户'),39,126,300,13,{color:'#e66a17',fontWeight:'bold'});
 const fields=[['buyer_name',tr('Nombre / empresa','Name / company','姓名 / 公司')],['buyer_email',tr('Correo electrónico','Email','电子邮箱')],['quantity',tr('Cantidad','Quantity','数量')],['destination_port',tr('Puerto de destino','Destination port','目的港')],['incoterm',tr('Condición comercial','Trade terms','贸易条件')],['expiry_date',tr('Validez','Valid until','有效期')]];
 fields.forEach(([key,name],i)=>{const y=[142,165,188,211,235,258][i];label(1,name,39,y,245,17,{fontWeight:'bold',maxLines:1});add(1,key,296,y,250,18,{fontSize:10,maxLines:2,minFontSize:7});});
 label(1,tr('Vehículos','Vehicles','车辆'),39,291,515,14,{color:'#e66a17',fontWeight:'bold'});
 add(1,'buyer_address',39,308,515,30,{maxLines:3});
 add(1,'vehicle_image',82,340,165,128,{kind:'image'});
 add(1,'vehicles',296,350,252,112,{kind:'vehicles',fontSize:10,minFontSize:8,maxLines:10,overflow:{page:2,x:40,y:510,width:515,height:260,insertBefore:3}});
 const technical=!['quotation','proforma','invoice'].includes(type);
 label(1,tr(technical?'DATOS DEL VEHÍCULO':'RESUMEN COMERCIAL',technical?'VEHICLE DETAILS':'COMMERCIAL SUMMARY',technical?'车辆信息':'商业摘要'),39,489,515,13,{fontWeight:'bold',color:'#e66a17'});
 label(1,tr('Concepto','Item','项目'),39,505,350,14,{fontWeight:'bold',color:'#ffffff'});
 label(1,technical?'': '{{currency}}',425,505,122,14,{align:'right',color:'#ffffff'});
 const amounts=technical?[
 ['engine',tr('Motor','Engine','发动机')],['fuel',tr('Combustible','Fuel','燃料')],['transmission',tr('Transmisión','Transmission','变速箱')],['mileage',tr('Kilometraje','Mileage','里程')],['vehicle_color',tr('Color','Colour','颜色')],['vin','VIN']
 ]:[
 ['subtotal',tr('Precio de los vehículos ({{incoterm}})','Vehicle prices ({{incoterm}})','车辆价格 ({{incoterm}})')],
 ['shipping_insurance',tr('Flete + seguro (desglose informado)','Freight + insurance (reported breakdown)','运费及保险（已提供明细）')],
 ['total_amount',tr('TOTAL A PAGAR A HAINA AUTO','TOTAL PAYABLE TO HAINA AUTO','应付 HAINA AUTO 总额')],
 ['customs_estimate',tr('Estimación aduanera informada','Reported customs estimate','已提供海关费用估算')],
 ['notes',tr('Gastos locales no incluidos','Local charges excluded','不包含目的地费用')],
 ['estimated_grand_total',tr('TOTAL ESTIMADO + ADUANA','ESTIMATED TOTAL + CUSTOMS','总额及海关费用估算')]
 ];
 amounts.forEach(([key,name],i)=>{const y=[522,540,563,590,620,647][i],color=[2,5].includes(i)?'#ffffff':'#10233f';label(1,name,39,y,359,18,{color,fontSize:9,maxLines:2});add(1,key,405,y,142,18,{align:'right',color,fontSize:10,maxLines:2,...(key==='notes'?{text:tr('Por confirmar','To be confirmed','待确认')}:{})});});
 label(1,tr('Los valores CIF ya incluyen los costes acordados. No se suman de nuevo.','CIF prices already include the agreed costs; these are not added again.','CIF价格已包含约定费用，不重复计入。'),39,676,515,29,{maxLines:2});
 label(1,tr('Notas y condiciones en las páginas siguientes.','Notes and conditions on the following pages.','备注及条件见后续页面。'),39,713,515,40,{fontSize:9,maxLines:4});
 label(2,tr('Detalle de la operación','Transaction details','交易明细'),39,30,515,17,{fontSize:12,fontWeight:'bold'});
 label(2,tr('Documento {{document_number}}','Document {{document_number}}','文件 {{document_number}}'),39,51,515,13);
 label(2,tr('A. Vehículos','A. Vehicles','A. 车辆'),39,82,515,15,{fontWeight:'bold'});
 label(2,tr('Concepto','Item','项目'),39,103,350,14,{color:'#ffffff'});
 label(2,tr('Valor','Value','数值'),425,103,122,14,{color:'#ffffff',align:'right'});
 const details=technical?[
 ['vehicle_brand',tr('Marca','Brand','品牌')],['vehicle_model',tr('Modelo','Model','型号')],['vehicle_year',tr('Año','Year','年份')],['vehicle_condition',tr('Estado','Condition','新旧状态')],['quantity',tr('Cantidad','Quantity','数量')],['vin','VIN']
 ]:[['quantity',tr('Cantidad','Quantity','数量')],['incoterm',tr('Condición comercial','Trade terms','贸易条件')],['destination_country',tr('País de destino','Destination country','目的国')],['destination_port',tr('Puerto','Port','港口')],['currency',tr('Moneda','Currency','币种')],['subtotal',tr('Subtotal vehículos','Vehicle subtotal','车辆小计')]];
 details.forEach(([key,name],i)=>{const y=[120,137,155,172,190,207][i];label(2,name,39,y,365,17);add(2,key,410,y,137,17,{align:'right',maxLines:2});});
 label(2,tr('B. Condiciones acordadas','B. Agreed terms','B. 约定条件'),39,248,515,15,{fontWeight:'bold'});
 label(2,tr('Concepto','Item','项目'),39,267,350,14,{color:'#ffffff'});
 const payment=[['initial_payment',tr('Pago inicial ({{initial_payment_percentage}}%)','Initial payment ({{initial_payment_percentage}}%)','首付款 ({{initial_payment_percentage}}%)')],['remaining_balance',tr('Saldo ({{remaining_percentage}}%)','Balance ({{remaining_percentage}}%)','尾款 ({{remaining_percentage}}%)')],['total_amount',tr('Total','Total','总额')]];
 payment.forEach(([key,name],i)=>{const y=[284,301,332][i];label(2,name,39,y,360,17);add(2,key,410,y,137,17,{align:'right'});});
 label(2,tr('C. Especificaciones y documentación','C. Specifications and documentation','C. 规格及文件'),39,381,515,15,{fontWeight:'bold'});
 [['engine',tr('Motor','Engine','发动机')],['fuel',tr('Combustible','Fuel','燃料')],['transmission',tr('Transmisión','Transmission','变速箱')],['mileage',tr('Kilometraje','Mileage','里程')]].forEach(([key,name],i)=>{const y=[402,419,437,454][i];label(2,name,39,y,360,17);add(2,key,410,y,137,17,{align:'right'});});
 label(3,tr('Condiciones y aceptación','Terms and acceptance','条件及确认'),39,30,515,19,{fontSize:13,fontWeight:'bold'});
 add(3,'document_number',39,55,515,17);
 const terms=[['destination_country',tr('País de destino','Destination country','目的国')],['destination_port',tr('Puerto de destino','Destination port','目的港')],['payment_method_summary',tr('Forma de pago','Payment method','付款方式')],['expiry_date',tr('Validez','Validity','有效期')],['customs_estimate',tr('Estimación aduanera','Customs estimate','海关费用估算')],['total_amount',tr('Total comercial','Commercial total','交易总额')]];
 terms.forEach(([key,name],i)=>{const y=[105,123,140,158,175,210][i];label(3,name,39,y,360,17);add(3,key,405,y,142,17,{align:'right'});});
 // Full approved payment details (wallet address etc.) — security-sensitive,
 // kept byte-identical across documents via lib/documents/payment-methods.ts.
 // Sits below the terms table (last row y210) and clears its dark total band.
 add(3,'payment_method',39,248,515,66,{maxLines:6});
 add(3,'payment_terms',39,320,515,52,{maxLines:4});
 add(3,type==='inspection'?'inspection_notes':type==='export'?'export_documents':'notes',39,473,515,280,{maxLines:28,overflow:{page:3,x:39,y:473,width:515,height:280,insertBefore:3}});
 label(3,tr('Por el exportador','For the exporter','出口商'),39,385,250,17,{fontWeight:'bold'});
 label(3,'HAINA AUTO EXPORT',39,409,250,17,{fontWeight:'bold',fontSize:12});
 add(3,'company_email',39,430,250,14);
 label(3,tr('Por el cliente','For the client','客户'),296,385,250,17,{fontWeight:'bold'});
 add(3,'buyer_name',296,409,250,18,{fontWeight:'bold',maxLines:2});
 add(3,'buyer_email',296,430,250,14);
 if(technical)for(const f of mapping.fields.filter(f=>f.kind==='vehicles'))f.text='{{vehicle_year}} {{vehicle_brand}} {{vehicle_model}}\nVIN: {{vin}}\n{{engine}} · {{fuel}} · {{transmission}}\n{{mileage}} km · {{vehicle_color}}';
 mapping.requiredFields=technical?['vehicles']:['buyer_name','destination_port','total_amount'];
 const entry={name:`HainaAuto ${type} — ${language} (derived)`,type,language,file:derivedFile,source,mapping,pages:await inspectPdf(blank)};
 await fs.writeFile(path.join(directory,`${type}-${language}.json`),JSON.stringify(entry,null,2));
 if(process.argv.includes('--import')){const saved=await saveTemplate({name:entry.name,type,language,originalName:path.basename(derivedFile),original:blank,mapping});console.log('Imported draft',saved.id);}
}
console.log('Prepared 32 derived quotation, invoice, specification and operational templates.');
