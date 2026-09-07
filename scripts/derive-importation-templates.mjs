import './load-typescript.cjs';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
const require=createRequire(import.meta.url),{inspectPdf}=require('../lib/documents/pdf.ts');
for(const language of ['es','en','zh','es-zh']){
 const directory='private-documents/template-library';
 const source=JSON.parse(await fs.readFile(`${directory}/contract${language==='es-zh'?'':'-'+language}.json`,'utf8'));
 const original=await PDFDocument.load(await fs.readFile(`private-documents/${source.file}`)),pdf=await PDFDocument.create();
 for(const page of await pdf.copyPages(original,[2,3,4,5]))pdf.addPage(page);
 const bytes=await pdf.save(),file=`template-library/importation-${language}-master.pdf`;
 await fs.writeFile(`private-documents/${file}`,bytes);
 const mapping={...source.mapping,fields:source.mapping.fields.filter(f=>f.page>=3&&f.page<=6).map(f=>({...f,page:f.page-2})),protectedRegions:source.mapping.protectedRegions.filter(f=>f.page>=3).map(f=>({...f,page:f.page-2})),requiredFields:['buyer_name','destination_port','payment_terms']};
 await fs.writeFile(`${directory}/importation_terms-${language}.json`,JSON.stringify({name:`HainaAuto importation terms — ${language}`,type:'importation_terms',language,file,source:source.source??source.file,mapping,pages:await inspectPdf(bytes)},null,2));
}
console.log('Prepared four importation-terms templates from the signed official annex.');
