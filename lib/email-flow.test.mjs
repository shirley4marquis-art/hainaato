import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
function load(file, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const require = createRequire(filename);
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filename), id);
      if (fs.existsSync(resolved + ".ts")) return load(resolved + ".ts", mocks, cache);
    }
    return require(id);
  };
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  new Function("require", "module", "exports", outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}


async function withTransport(respond, run) {
  const key = process.env.RESEND_API_KEY, fetch = globalThis.fetch;
  process.env.RESEND_API_KEY = 're_mock_only';
  const calls=[];
  globalThis.fetch=async(url,init)=>{calls.push({url,headers:init.headers,payload:JSON.parse(init.body)});return respond(calls.length)};
  try { await run(load('lib/email.ts'),calls); }
  finally { globalThis.fetch=fetch;if(key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=key; }
}
const message={to:'buyer@real-domain.com',subject:'Test quotation',html:'<p>Quotation attached</p>'};
test('PDF attachment arrives in the provider payload with its exact bytes',async()=>{
 await withTransport(()=>Response.json({id:'accepted'}),async({sendEmail},calls)=>{
 const pdf=Buffer.from('%PDF-1.7\nmock quotation bytes');
 assert.equal((await sendEmail({...message,attachment:{filename:'quote.pdf',content:pdf,contentType:'application/pdf'}})).ok,true);
 assert.equal(calls.length,1);assert.equal(calls[0].payload.reply_to,'info@nindgeauto.com');
 assert.deepEqual(Buffer.from(calls[0].payload.attachments[0].content,'base64'),pdf);
 assert.equal(calls[0].payload.attachments[0].content_type,'application/pdf');
 });
});
test('transient provider failures retry the identical message with one idempotency key',async()=>{
 await withTransport(n=>n===1?Response.json({message:'temporarily unavailable'},{status:503}):Response.json({id:'accepted'}),async({sendEmail},calls)=>{
 assert.equal((await sendEmail(message)).ok,true);assert.equal(calls.length,2);
 assert.ok(calls[0].headers['Idempotency-Key']);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);assert.deepEqual(calls[0].payload,calls[1].payload);
 });
});
test('network timeout retries safely and permanent domain errors do not retry',async()=>{
 await withTransport(n=>{if(n===1)throw new Error('timeout');return Response.json({id:'accepted'})},async({sendEmail},calls)=>{assert.equal((await sendEmail(message)).ok,true);assert.equal(calls.length,2)});
 await withTransport(()=>Response.json({message:'Domain is not verified'},{status:403}),async({sendEmail},calls)=>{const r=await sendEmail(message);assert.equal(r.ok,false);assert.match(r.error,/Domain is not verified/);assert.equal(calls.length,1)});
});
test('unconfirmed provider responses never report success and oversized files never send',async()=>{
 await withTransport(()=>Response.json({}),async({sendEmail},calls)=>{assert.equal((await sendEmail(message)).ok,false);assert.equal(calls.length,1)});
 await withTransport(()=>{throw new Error('Must not send')},async({sendEmail},calls)=>{const r=await sendEmail({...message,attachment:{filename:'large.pdf',content:Buffer.alloc(25*1024*1024+1)}});assert.equal(r.ok,false);assert.match(r.error,/25 MB/);assert.equal(calls.length,0)});
});
test('all customer drafts use loadable logos and escape customer markup',()=>{
 const {buildQuoteEmailDraft}=load('lib/quote-email-drafts.ts');
 const quote={ref:'TEST-0001',documentNumber:'TEST-QT-0001',customer:{name:'<script>bad</script>'},items:[],language:'en',currency:'USD',cifTotal:10000,depositPct:40,depositAmount:4000,balanceAmount:6000,destinationPort:'Test port',destinationCountry:'Test country',validUntil:null};
 for(const type of ['quotation','follow_up','contract_deposit','shipping_docs','arrival_balance']){const draft=buildQuoteEmailDraft(quote,type);assert.match(draft.html,/https:\/\/www\.nindgeauto\.com\/nindge-mark\.png/);assert.doesNotMatch(draft.html,/cid:|<script>/);}
});
test('unsupported admin send modes fail before rendering or sending',async()=>{
 let sends=0,renders=0;
 const {POST}=load('app/api/admin/quotes/[ref]/resend/route.ts',{
 '../../../../../../lib/security/admin':{guardAdminRequest:async()=>null},
 '../../../../../../lib/crm':{adminGetQuote:async()=>({customer:{email:'buyer@real-domain.com'}}),recordQuoteEmail:async()=>{}},
 '../../../../../../lib/render-quote-pdf':{renderQuotePdfWithRetry:async()=>{renders++;return Buffer.from('pdf')}},
 '../../../../../../lib/email':{sendEmail:async()=>{sends++;return {ok:true}}},
 });
 for(const body of [{mode:'custom'}, {draftType:'typo'}]){const r=await POST(new Request('https://local.test/api/admin/quotes/TEST/resend',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({ref:'TEST'})});assert.equal(r.status,400);}
 assert.equal(sends,0);assert.equal(renders,0);
});

for(const outcome of ['sent','pdf-failed','send-failed','whatsapp-only'])test('quote submission lifecycle: '+outcome,async()=>{
 const tasks=[],records=[],sends=[];let saved=false;const pdf=Buffer.from('%PDF-1.7 mock');
 const {POST}=load('app/api/quote-requests/route.ts',{
 'next/server':{NextResponse:{json:(b,i)=>Response.json(b,i)},after:fn=>tasks.push(fn)},
 '../../../lib/security/http':{guardRequest:async()=>null},
 '../../../lib/security/rate-limit':{checkRateLimit:async()=>({ok:true})},
 '../../../lib/vehicles':{getVehicleIndexEntryBySlug:()=>({brand:'Toyota',model:'Hilux',condition:'new'})},
 '../../../lib/vehicle-details':{getVehicleBySlug:()=>({priceCNY:24000,images:[],specs:{},bodyType:'SUV'})},
 '../../../lib/image-ranking':{rankVehicleImages:x=>x},
 '../../../lib/currency':{convertFromCNY:x=>x},
 '../../../lib/vehicle-document-details':{buildVehicleConfigurationRows:()=>[],buildVehicleFactRows:()=>[],formatRowsForHistory:()=>''},
 '../../../lib/crm':{adminSaveQuote:async()=>{saved=true;return 'TEST-0001'},adminGetQuote:async()=>null,recordQuoteEmail:async(ref,record)=>records.push(record)},
 '../../../lib/quote-access':{createQuoteAccessToken:()=> 'signed'},
 '../../../lib/render-quote-pdf':{renderQuotePdfWithRetry:async()=>{if(outcome==='pdf-failed')throw new Error('Photo unavailable');return pdf}},
 '../../../lib/email':{sendQuoteCreatedSalesNotification:()=>new Promise(()=>{}),customerQuoteEmailHtml:()=>({subject:'Quote',html:'<p>Quote</p>'}),sendEmail:async msg=>{sends.push(msg);return outcome==='send-failed'?{ok:false,error:'Domain not verified'}:{ok:true,providerMessageId:'accepted'}}},
 });
 const input={name:'Buyer',country:'Venezuela',vehicles:[{slug:'test-car',qty:1}],...(outcome==='whatsapp-only'?{phone:'+580000000'}:{email:'buyer@real-domain.com'})};
 const response=await POST(new Request('https://local.test/api/quote-requests',{method:'POST',body:JSON.stringify(input)}));
 assert.equal(response.status,200);assert.equal(saved,true);assert.equal(sends.length,0);assert.equal(tasks.length,2);
 // A stalled sales notification must not hold up the separate customer task.
 tasks[0]();await tasks[1]();
 if(outcome==='whatsapp-only'){assert.equal(sends.length,0);assert.equal(records.length,0);return;}
 assert.equal(records.length,1);
 assert.equal(records[0].status,outcome==='sent'?'sent':'failed');
 if(outcome==='pdf-failed')assert.equal(sends.length,0);
 else {assert.equal(sends.length,1);assert.deepEqual(sends[0].attachment.content,pdf);assert.equal(records[0].providerMessageId,outcome==='sent'?'accepted':null);}
});
