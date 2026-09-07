// Runs against the temporary /document-qa page; every CRM/API call below is
// intercepted with fictitious local data. No mail or production write occurs.
import './load-typescript.cjs';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {quote} from './document-test-fixture.mjs';
const require=createRequire(import.meta.url),{documentData}=require('../lib/documents/data.ts'),{generatePdf}=require('../lib/documents/pdf.ts'),{prepareTemplate}=require('../lib/documents/prepare-template.ts');
const library=[];
for(const filename of (await fs.readdir('private-documents/template-library')).filter(f=>f.endsWith('.json')&&f.includes('-'))){const entry=JSON.parse(await fs.readFile(`private-documents/template-library/${filename}`,'utf8'));library.push({...entry,id:randomUUID(),familyId:randomUUID(),version:1,active:true,isDefault:true,mapping:{...entry.mapping,reviewed:true},createdAt:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'});}
const saved=[],files=new Map();let lastMapping;
const qaDirectory='app/document-qa',qaPage=`${qaDirectory}/page.tsx`;
await fs.mkdir(qaDirectory,{recursive:true});
await fs.writeFile(qaPage,`import {AdminShell} from '../admin/admin-shell';
import {DocumentCenter} from '../admin/documents/document-center';
import {TemplateEditor} from '../admin/documents/templates/template-editor';
export default async function Qa({searchParams}:{searchParams:Promise<{editor?:string}>}){const {editor}=await searchParams;return <AdminShell>{editor?<TemplateEditor id={editor}/>:<DocumentCenter/>}</AdminShell>}`,{flag:'wx'});
const server=spawn(process.execPath,['scripts/next-with-wasm.mjs','dev','--webpack','--port','3100'],{stdio:'ignore',windowsHide:true});
let browser;
try{
 for(let attempt=0;attempt<120;attempt++){
  if(server.exitCode!==null)throw Error('QA server exited before startup.');
  try{const r=await fetch('http://localhost:3100/document-qa',{signal:AbortSignal.timeout(1000)});if(r.ok)break;}catch{}
  if(attempt===119)throw Error('QA server did not start.');
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/api/admin/**',async route=>{
  const request=route.request(),url=new URL(request.url()),pathname=url.pathname;
  const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  try{
   if(pathname==='/api/admin/document-templates')return json({ok:true,templates:library});
   if(pathname.startsWith('/api/admin/document-templates/')){
    const template=library.find(t=>t.id===pathname.split('/').at(-1));assert.ok(template);
    if(request.method()==='POST'){const body=request.postDataJSON();await prepareTemplate(await fs.readFile(`private-documents/${template.file}`),body.mapping);lastMapping=body.mapping;return json({ok:true,template:{...template,id:randomUUID(),version:2}});}
    if(url.searchParams.has('file'))return route.fulfill({status:200,contentType:'application/pdf',body:await fs.readFile(`private-documents/${template.file}`)});
    return json({ok:true,template});
   }
   if(pathname==='/api/admin/quotes')return json({ok:true,quotes:[{ref:quote.ref,documentNumber:quote.documentNumber,customerName:quote.customer.name,vehicleSummary:'5 JAC Hunter T9 vehicles'}]});
   if(pathname.startsWith('/api/admin/quotes/'))return json({ok:true,quote});
   if(pathname==='/api/admin/documents'){
    if(request.method()==='GET')return json({ok:true,documents:saved});
    const input=request.postDataJSON(),template=library.find(t=>t.id===input.templateId);assert.ok(template);
    const data=documentData(quote,input.type,input.language,'HA-QT-2026-TEST',input.overrides,input.vins);
    const original=await fs.readFile(`private-documents/${template.file}`),prepared=await prepareTemplate(original,template.mapping),pdf=await generatePdf(prepared,template.mapping,data);
    const document={id:randomUUID(),number:'HA-QT-2026-TEST',filename:'HainaAuto-Quotation-QA.pdf',type:input.type,language:input.language,quoteRef:quote.ref,templateId:template.id,createdAt:new Date().toISOString()};files.set(document.id,pdf);await fs.writeFile('tmp/browser-download.pdf',pdf);saved.push(document);return json({ok:true,document});
   }
   
   if(pathname.startsWith('/api/admin/documents/')){const pdf=files.get(pathname.split('/').at(-1));assert.ok(pdf);return route.fulfill({status:200,headers:{'Content-Type':'application/pdf',...(url.searchParams.has('download')?{'Content-Disposition':'attachment; filename="HainaAuto-Quotation-QA.pdf"'}:{})},body:pdf});}
   return route.abort();
  }catch(error){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({ok:false,error:error.message})});}
 });
 await page.goto('http://localhost:3100/document-qa');
 await page.getByLabel('Client / order').selectOption(quote.ref);
 await page.getByRole('combobox',{name:/^Language/}).selectOption('es-zh');
 await page.getByLabel('Payment method',{exact:true}).fill('Bank transfer / 银行转账');
 await page.getByLabel('Payment terms',{exact:true}).fill('40% initial; 60% balance. 首付40%；尾款60%。');
 await page.getByRole('button',{name:'Generate & preview'}).click();
 await page.locator('canvas').waitFor({state:'visible',timeout:60000});
 await page.locator('[aria-busy="false"] canvas').waitFor({state:'visible',timeout:60000});
 assert.equal((await page.getByRole('alert').allTextContents()).join('').trim(),'');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,'Mobile document screen must not overflow horizontally');
 await page.screenshot({path:'private-documents/qa/mobile-document-preview.png',fullPage:true});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download PDF',exact:true}).click();const download=await downloadPromise,downloaded=await fs.readFile(await download.path());
 const digest=b=>createHash('sha256').update(b).digest('hex');assert.equal(digest(downloaded),digest(files.get(saved[0].id)));
 await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('[aria-busy="false"] canvas').waitFor({state:'visible'});
 await page.setViewportSize({width:1440,height:1000});
 const template=library.find(t=>t.type==='quotation'&&t.language==='es');
 await page.goto(`http://localhost:3100/document-qa?editor=${template.id}`);
 await page.locator('[aria-busy="false"] canvas').waitFor({state:'visible',timeout:60000});
 await page.getByRole('button',{name:'Add dynamic field',exact:true}).click();
 await page.getByLabel('X',{exact:true}).fill('40');await page.getByLabel('Y from top',{exact:true}).fill('470');await page.getByLabel('Width',{exact:true}).fill('100');await page.getByLabel('Height',{exact:true}).fill('15');
 await page.getByRole('combobox',{name:/^Zoom/}).selectOption('1.5');
 const selected=page.locator('button[aria-label="Move buyer_name"]').last();await selected.scrollIntoViewIfNeeded();const box=await selected.boundingBox();assert.ok(box);
 const before=Number(await page.getByLabel('X',{exact:true}).inputValue());const canvasWidth=await page.locator('canvas').evaluate(el=>el.getBoundingClientRect().width);
 await page.mouse.move(box.x+10,box.y+5);await page.mouse.down();await page.mouse.move(box.x+30,box.y+5,{steps:5});await page.mouse.up();
 const after=Number(await page.getByLabel('X',{exact:true}).inputValue());assert.ok(Math.abs((after-before)-20/canvasWidth*template.pages[0].width)<1,JSON.stringify({before,after,canvasWidth,expected:20/canvasWidth*template.pages[0].width}));
 await page.screenshot({path:'private-documents/qa/desktop-template-editor.png',fullPage:true});
 const savePromise=page.waitForResponse(r=>r.url().includes('/api/admin/document-templates/')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save new version',exact:true}).click();const saveResult=await savePromise;assert.equal(saveResult.status(),200,await saveResult.text());assert.ok(lastMapping.fields.length===template.mapping.fields.length+1);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: mobile generation, bilingual preview, page navigation, byte-identical download, responsive width, zoom-aware field dragging, no browser exceptions.');
}finally{
 await browser?.close();
 if(server.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}else server.kill('SIGTERM');}
 server.unref();
 await fs.unlink(qaPage);await fs.rmdir(qaDirectory).catch(()=>{});
}
