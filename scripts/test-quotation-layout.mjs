import './load-typescript.cjs';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {quote} from './document-test-fixture.mjs';
const require=createRequire(import.meta.url);
const {generateQuotationLayout,publicSpecificationNotes}=require('../lib/documents/quotation-layout.ts');
const {documentData}=require('../lib/documents/data.ts');
const {bindField}=require('../lib/documents/mapping.ts');
const {defaultField}=require('../lib/documents/types.ts');
assert.equal(bindField({...defaultField(),text:'Engine: {{engine}}\nMileage: {{mileage}}\nStatic terms'},{engine:'',mileage:0}),'Mileage: 0\nStatic terms');
assert.equal(publicSpecificationNotes({Engine:'2.0T',Cost:'100',Empty:'',Seats:'5'}),'Engine: 2.0T\nSeats: 5');
await fs.mkdir('output/pdf',{recursive:true});await fs.mkdir('tmp/pdfs',{recursive:true});
const canvas=createCanvas(480,300),ctx=canvas.getContext('2d');ctx.fillStyle='#e7edf3';ctx.fillRect(0,0,480,300);ctx.fillStyle='#10233f';ctx.font='24px sans-serif';ctx.fillText('VEHICLE PHOTO / QA',95,150);const photo=canvas.toBuffer('image/png');
for(const language of ['en','es','zh','es-zh']){
 const data=documentData({...quote,items:[{...quote.items[0],specSummary:'Dimensions: 5330 × 1965 × 1920 mm\nWheelbase: 3110 mm\nSafety: ABS, stability control, reversing camera\nInterior: Leather seats; climate control\nWheels: 18-inch alloy wheels'}]},'quotation',language,'NINDGE-QT-DEMO');
 const bytes=await generateQuotationLayout(data,[[photo,photo,photo]]);
 await fs.writeFile('output/pdf/quotation-'+language+'.pdf',bytes);
 const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;assert.equal(doc.numPages,2);
 let all='';for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n);const text=(await p.getTextContent()).items.map(i=>i.str??'').join(' ');all+=text;const viewport=p.getViewport({scale:1.2}),out=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await p.render({canvasContext:out.getContext('2d'),viewport}).promise;await fs.writeFile('tmp/pdfs/quotation-'+language+'-'+n+'.png',out.toBuffer('image/png'));}
 assert.ok(all.includes('3110'));assert.ok(all.includes('Hunter T9'));assert.ok(!/undefined|\{\{|Engine: *Mileage/.test(all));await doc.cleanup();
 const sparse={...data,vehicles:[{vehicle_brand:'Example',vehicle_model:'Compact',mileage:0,quantity:1}]};const sparsePdf=await generateQuotationLayout(sparse,[[]]);assert.ok(sparsePdf.length);
 await assert.rejects(()=>generateQuotationLayout({...data,vehicles:[{...data.vehicles[0],notes:'Extremely long description '.repeat(500)}]},[[photo]]),/two-page/);
 console.log(language+': 2 pages, details retained, sparse values and overflow checked');
}

