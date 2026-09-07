// Read-only verification of installed masters and a real CRM quotation.
// Generated verification files stay in the ignored private-documents directory.
import './load-typescript.cjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {documentPool}=require('../lib/documents/store.ts');
const {generateQuoteTemplatePdf}=require('../lib/documents/service.ts');
const {inspectPdf}=require('../lib/documents/pdf.ts');
const pool=documentPool();
try {
 const entries=(await pool.query(`SELECT t.document_type,t.language,t.original_name,t.sha256,
   encode(sha256(t.original_pdf),'hex') AS stored_hash,t.active,t.mapping
   FROM document_template_defaults d JOIN document_templates t ON t.id=d.template_id`)).rows;
 assert.equal(entries.length,41,'Expected 41 official defaults');
 for(const entry of entries){
  assert.equal(entry.sha256,entry.stored_hash,'Stored master checksum mismatch');
  assert.ok(entry.active&&entry.mapping.reviewed);
 }
 const security=(await pool.query(`SELECT c.relname,c.relrowsecurity,
   has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT') AS public_read
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('document_templates','document_template_defaults','document_number_counters','generated_documents')`)).rows;
 assert.equal(security.length,4);
 for(const table of security){assert.ok(table.relrowsecurity);assert.equal(table.public_read,false);}
 const before=(await pool.query('SELECT count(*)::int AS n FROM quotes')).rows[0].n;
 const reference=(await pool.query(`SELECT q.ref FROM quotes q JOIN quote_items i ON i.quote_id=q.id
   GROUP BY q.id,q.ref ORDER BY q.id DESC LIMIT 1`)).rows[0]?.ref;
 assert.ok(reference,'No existing quotation available to verify');
 const pdf=await generateQuoteTemplatePdf(reference);
 const pages=await inspectPdf(pdf);
 await fs.mkdir('private-documents/qa',{recursive:true});
 await fs.writeFile('private-documents/qa/live-crm-quotation.pdf',pdf);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM quotes')).rows[0].n,before);
 console.log({verifiedDefaults:entries.length,privateTables:security.length,existingQuotes:before,pages:pages.length,pdfBytes:pdf.length,pdfSha256:createHash('sha256').update(pdf).digest('hex'),productionRecordsWritten:0});
} catch(error){console.error('Library verification failed',{code:error.code,name:error.name,message:error.name==='DocumentError'||error.name==='AssertionError'?error.message:undefined});process.exitCode=1;}
finally{await pool.end();}
