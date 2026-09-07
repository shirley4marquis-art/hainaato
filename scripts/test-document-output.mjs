import './load-typescript.cjs';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {generatePdf}=require('../lib/documents/pdf.ts');
const {documentData}=require('../lib/documents/data.ts');
const {prepareTemplate}=require('../lib/documents/prepare-template.ts');
import {quote,vins} from './document-test-fixture.mjs';
const dir='private-documents/qa';await fs.mkdir(dir,{recursive:true});
const summary=[];
for(const key of (await fs.readdir('private-documents/template-library')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5))){
 const type=key.split('-')[0];
 const entry=JSON.parse(await fs.readFile(`private-documents/template-library/${key}.json`,'utf8'));
 const original=await fs.readFile('private-documents/'+entry.file);
 const mapping={...entry.mapping,reviewed:true};
 const prepared=await prepareTemplate(original,mapping);
 const data=documentData(quote,type,entry.language,`HA-${type==='contract'?'CT':'QT'}-2026-TEST`,{payment_method:'USDT / 数字货币',payment_terms:'40% inicial; 60% antes de liberar documentos. 首付40%，放行文件前支付尾款60%。'},vins);
 const bytes=await generatePdf(prepared,mapping,data);await fs.writeFile(`${dir}/${key}-sample.pdf`,bytes);
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,standardFontDataUrl:process.cwd().replaceAll('\\','/')+'/node_modules/pdfjs-dist/standard_fonts/'}),doc=await task.promise;
 let text='';
 for(let page=1;page<=doc.numPages;page++){
  const p=await doc.getPage(page);text+=(await p.getTextContent()).items.map(i=>i.str??'').join(' ')+'\n';
  const view=p.getViewport({scale:1.4}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await p.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;await fs.writeFile(`${dir}/${key}-${page}.png`,canvas.toBuffer('image/png'));
 }
 if(type!=='other'){
  assert.ok(!/Ali Rmeiti|Rodolfo Vicent|EST0076|Joseines|constructorajoseines/.test(text),'Old customer text must be removed');
  assert.ok(!/undefined|\[object Object\]|\{\{/.test(text),'No broken dynamic values');
  assert.ok(text.includes('María José Núñez'),'Spanish text is present');
  assert.ok(text.includes('南北国际进出口'),'Chinese buyer name is embedded');
  assert.ok(text.includes('Hunter T9 5'),'All five vehicles are present');
 }
 await fs.writeFile(`${dir}/${key}-text.txt`,text);summary.push({type,pages:doc.numPages,bytes:bytes.length});await task.destroy();
}
await fs.writeFile(`${dir}/summary.json`,JSON.stringify(summary,null,2));console.log(summary);
