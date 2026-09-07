import '../../scripts/load-typescript.cjs';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PDFDocument,PDFName,StandardFonts,degrees} from 'pdf-lib';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {inspectPdf,generatePdf}=require('./pdf.ts');
const {validateMapping,cleanValue}=require('./mapping.ts');
const {defaultField,EMPTY_MAPPING}=require('./types.ts');
const {moneyNumber}=require('./data.ts');
const {reserveDocumentNumber}=require('./numbering.ts');
const {pdfResponse}=require('./http.ts');
const {prepareTemplate}=require('./prepare-template.ts');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const data={values:{buyer_name:'María José — 南北国际进出口',notes:'á é í ó ú ñ ¿ ¡ 车辆进口合同 买方 卖方 目的港 车辆识别码'},vehicles:[],images:[],language:'es-zh'};
async function master(){const pdf=await PDFDocument.create();const p=pdf.addPage([620,860]);p.setCropBox(10,15,595,820);p.setRotation(degrees(90));p.drawText('COMPANY ARTWORK',{x:50,y:700,size:15,font:await pdf.embedFont(StandardFonts.Helvetica)});return Buffer.from(await pdf.save());}
test('rotated multipage master, boxes and immutable bytes survive generation',async()=>{
 const bytes=await master(),before=hash(bytes),pages=await inspectPdf(bytes);
 const mapping={...structuredClone(EMPTY_MAPPING),reviewed:true,fields:[{...defaultField(),x:40,y:40,width:350,height:45}]};
 const output=await generatePdf(bytes,mapping,data);
 assert.equal(hash(bytes),before);assert.deepEqual(await inspectPdf(output),pages);
 const pdf=await PDFDocument.load(output);assert.equal(pdf.getPageCount(),1);assert.equal(pdf.getPage(0).getRotation().angle,90);
});
test('unsafe PDF actions and truncated files are rejected',async()=>{
 await assert.rejects(inspectPdf(Buffer.from('%PDF-1.7 invalid')),/Unable to load/);
 const pdf=await PDFDocument.create();pdf.addPage();pdf.catalog.set(PDFName.of('OpenAction'),pdf.context.obj({S:'JavaScript',JS:'app.alert(1)'}));
 await assert.rejects(inspectPdf(await pdf.save()),/scripts|Unsafe/);
});
test('protected signature regions, locked pages and overflow sources cannot be covered',async()=>{
 const pages=await inspectPdf(await master()),field={...defaultField(),x:40,y:40,width:200,height:40};
 const m={...structuredClone(EMPTY_MAPPING),fields:[field],protectedRegions:[{page:1,x:40,y:40,width:200,height:40,label:'Stamp'}]};
 assert.throws(()=>validateMapping(m,pages),/protected/);
 assert.throws(()=>validateMapping({...m,protectedRegions:[],lockedPages:[1]},pages),/protected/);
 assert.throws(()=>validateMapping({...m,fields:[{...field,x:300,overflow:{page:1,x:300,y:150,width:200,height:100,insertBefore:1}}]},pages),/unsigned/);
});
test('oversized text fails instead of clipping; absent optional data is clean',async()=>{
 const bytes=await master(),mapping={...structuredClone(EMPTY_MAPPING),reviewed:true,fields:[{...defaultField(),width:30,height:10,minFontSize:10,maxLines:1}]};
 await assert.rejects(generatePdf(bytes,mapping,data),/too long/);
 for(const input of [undefined,null,NaN,{},'undefined null NaN [object Object] {{buyer_name}}'])assert.equal(cleanValue(input).trim(),'');
 assert.throws(()=>moneyNumber('28,500','price'),/numeric/);assert.equal(moneyNumber(28500,'price')*2,5700000);
});
test('PDF preview and download responses contain exactly the same saved bytes',async()=>{
 const bytes=await master(),preview=pdfResponse(bytes,'test.pdf'),download=pdfResponse(bytes,'test.pdf',true);
 assert.match(preview.headers.get('content-disposition'),/^inline/);assert.match(download.headers.get('content-disposition'),/^attachment/);
 assert.equal(hash(Buffer.from(await preview.arrayBuffer())),hash(bytes));assert.equal(hash(Buffer.from(await download.arrayBuffer())),hash(bytes));
});
test('PDF clearing removes old text objects without mutating the master',async()=>{
 const pdf=await PDFDocument.create(),p=pdf.addPage([595,842]);p.drawText('OLD CUSTOMER',{x:40,y:700,size:10});p.drawText('STAMP',{x:40,y:100,size:10});const bytes=Buffer.from(await pdf.save()),before=hash(bytes);
 const mapping={...structuredClone(EMPTY_MAPPING),fields:[{...defaultField(),x:38,y:128,width:200,height:25,replaceExisting:true}],protectedRegions:[{page:1,x:30,y:720,width:100,height:60,label:'Stamp'}]};
 await prepareTemplate(bytes,mapping);assert.equal(hash(bytes),before);
});
test('long bilingual contract clauses continue before the locked signed final page',async()=>{
 const source=await PDFDocument.create();source.addPage([595,842]);const signed=source.addPage([595,842]);signed.drawText('AUTHORIZED SIGNATURE / STAMP',{x:40,y:120,size:12});
 const master=await source.save(),mapping={...structuredClone(EMPTY_MAPPING),reviewed:true,lockedPages:[2],fields:[{...defaultField(),field:'contract_terms',x:40,y:60,width:500,height:30,maxLines:2,overflow:{page:1,x:40,y:60,width:500,height:680,insertBefore:2}}]};
 const pdf=await PDFDocument.load(await generatePdf(master,mapping,{...data,values:{contract_terms:'Condiciones de importación — 车辆进口条款。 '.repeat(400)}}));
 assert.ok(pdf.getPageCount()>2);const last=pdf.getPages().at(-1);
 assert.deepEqual(last.getMediaBox(),signed.getMediaBox());
 const streamBytes=(doc,page)=>page.node.Contents().asArray().map(ref=>hash(doc.context.lookup(ref).contents));
 const loadedMaster=await PDFDocument.load(master);
 assert.deepEqual(streamBytes(pdf,last),streamBytes(loadedMaster,loadedMaster.getPage(1)),'Signed page content streams must be unchanged');
});
test('safe migration, private tables, sequential concurrent numbering and rollback',async()=>{
 const db=new PGlite();
 try{
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE quotes(document_number text); INSERT INTO quotes VALUES ('HA-QT-2026-0099');");
  await db.exec(await fs.readFile('supabase/migrations/202609070001_document_templates.sql','utf8'));
  await db.exec(await fs.readFile('supabase/migrations/202609070001_document_templates.sql','utf8'));
  const tables=await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('document_templates','generated_documents')");assert.ok(tables.rows.every(r=>r.relrowsecurity));
  const permission=await db.query("SELECT has_table_privilege('anon','document_templates','SELECT') AS allowed");assert.equal(permission.rows[0].allowed,false);
  await db.query("INSERT INTO document_templates(id,family_id,version,name,document_type,language,original_name,original_pdf,prepared_pdf,sha256,mapping,pages) VALUES('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111',1,'Test','quotation','es','test.pdf',$1,$1,'hash','{}','[]')",[new Uint8Array([1,2,3])]);
  await assert.rejects(db.query("UPDATE document_templates SET original_pdf=$1",[new Uint8Array([4])]),/immutable/);
  await db.query("UPDATE document_templates SET active=true");
  const numbers=await Promise.all(Array.from({length:20},()=>db.transaction(tx=>reserveDocumentNumber(tx,'quotation',2026))));
  assert.equal(new Set(numbers).size,20);assert.equal(numbers[0],'HA-QT-2026-0100');assert.equal(numbers.at(-1),'HA-QT-2026-0119');
  await assert.rejects(db.transaction(async tx=>{await reserveDocumentNumber(tx,'quotation',2026);throw Error('rollback');}));
  assert.equal(await db.transaction(tx=>reserveDocumentNumber(tx,'quotation',2026)),'HA-QT-2026-0120');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM quotes')).rows[0].n,1);
 }finally{await db.close();}
});

test('reference Liberation Sans headings keep their specified size',async()=>{
 const {DocumentFonts,fontVerticalMetrics}=require('./fonts.ts');
 const {fitText}=require('./pdf.ts');
 const fonts=new DocumentFonts(await PDFDocument.create(),'CONTRATO');
 const field={...defaultField(),fontSize:22,minFontSize:12,fontWeight:'bold',width:234.9,height:27,maxLines:1};
 const fontFor=await fonts.prepare('CONTRATO',field);
 assert.equal(fitText('CONTRATO',field,fontFor).size,22);
 const metrics=fontVerticalMetrics(fontFor('C'),22);
 assert.ok(metrics.descent>4 && metrics.descent<5,'Font descenders must be scaled from 2048-unit font space');
});
