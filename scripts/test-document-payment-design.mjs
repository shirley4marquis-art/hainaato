import './load-typescript.cjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {quote,vins} from './document-test-fixture.mjs';
const require=createRequire(import.meta.url),{generatePdf}=require('../lib/documents/pdf.ts'),{documentData}=require('../lib/documents/data.ts'),{prepareTemplate}=require('../lib/documents/prepare-template.ts'),{paymentMethodBlock,USDT_WALLET_ADDRESS}=require('../lib/documents/payment-methods.ts');
const directory=process.argv[2]??'private-documents/template-library';
for(const type of ['contract','quotation','proforma','invoice'])for(const language of ['es','en','zh','es-zh']){
 const key=type==='contract'&&language==='es-zh'?'contract':type+'-'+language;
 const entry=JSON.parse(await fs.readFile(directory+'/'+key+'.json','utf8'));
 const bytes=await generatePdf(await prepareTemplate(await fs.readFile('private-documents/'+entry.file),entry.mapping),{...entry.mapping,reviewed:true},documentData(quote,type,language,'HA-TEST-2026',{payment_method:paymentMethodBlock('usdt-binance-bsc',language),payment_terms:'40% initial; 60% balance.'},vins));
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise;let text='';
 for(let i=1;i<=pdf.numPages;i++)text+=(await (await pdf.getPage(i)).getTextContent()).items.map(i=>i.str??'').join(' ')+'\n';
 assert.ok(text.includes(USDT_WALLET_ADDRESS),key+' must retain the complete approved wallet');
 assert.ok(text.includes('BEP-20'),key+' must retain the network');
 assert.ok(text.includes('TRC-20'),key+' must retain the network warning');
 await task.destroy();
}
console.log('Verified complete approved payment details in 16 commercial/contract variants.');
