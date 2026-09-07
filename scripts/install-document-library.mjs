// Run with --env-file=.env.local after PDF QA. This never edits customer,
// vehicle, quote or order records. --activate opts into reviewed defaults.
import './load-typescript.cjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const require=createRequire(import.meta.url);
const {documentPool,listTemplates,saveTemplate}=require('../lib/documents/store.ts');
const activate=process.argv.includes('--activate'),pool=documentPool();
const directory='private-documents/design-library';
try{
 await pool.query(await fs.readFile('supabase/migrations/202609070001_document_templates.sql','utf8'));
 const previous=await listTemplates();let imported=0,unchanged=0;
 for(const filename of (await fs.readdir(directory)).filter(f=>f.endsWith('.json')&&f!=='quotation.json')){
  const entry=JSON.parse(await fs.readFile(`${directory}/${filename}`,'utf8'));
  if(entry.designRevision!=='contract-reference-2026-09-v1')throw new Error('Run scripts/build-document-library.mjs before installing templates.');
  const original=await fs.readFile(`private-documents/${entry.file}`),mapping={...entry.mapping,reviewed:activate};
  const sha=createHash('sha256').update(original).digest('hex'),prior=previous.find(t=>t.name===entry.name&&t.type===entry.type&&t.language===entry.language);
  if(prior&&prior.sha256===sha&&isDeepStrictEqual(prior.mapping,mapping)&&prior.active===activate){unchanged++;continue;}
  await saveTemplate({name:entry.name,type:entry.type,language:entry.language,originalName:entry.file.split('/').at(-1),original,mapping,activate,previousId:prior?.id});imported++;
  console.log(`Installed ${entry.type} (${entry.language})`);
 }
 console.log({imported,unchanged,activated:activate});
}catch(error){console.error('Document library installation failed',{code:error.code,name:error.name,message:error.name==='DocumentError'?error.message:undefined});process.exitCode=1;}
finally{await pool.end();}
