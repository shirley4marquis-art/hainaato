import './scripts/load-typescript.cjs';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const sharp=require('sharp');
const {NextRequest}=require('next/server');
const code=ts.transpileModule(readFileSync('app/api/vehicle-image/[site]/[id]/[file]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const png=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
function route(statuses){
 let calls=0;
 const exports={};
 const https={request(_options,callback){
  const req=new EventEmitter();
  req.destroy=error=>req.emit('error',error);
  req.end=()=>queueMicrotask(()=>{
   const status=statuses[Math.min(calls++,statuses.length-1)];
   const res=Readable.from([status===200?png:Buffer.from('unavailable')]);
   res.statusCode=status;res.headers={'content-type':'image/png'};
   callback(res);req.emit('response',res);
  });
  return req;
 }};
 runInNewContext(code,{exports,require:name=>name==='node:https'?https:name.includes('vehicle-details')?{getVehicleBySlug:()=>({images:['photo.png']})}:require(name),Buffer,URL,Uint8Array,AbortSignal,setTimeout,clearTimeout,console:{warn(){}},fetch:()=>{throw Error('unexpected DNS lookup');}});
 return {get:(file='photo.png')=>exports.GET(new NextRequest('https://example.com/api/vehicle-image/cntransit/1/'+file),{params:Promise.resolve({site:'cntransit',id:'1',file})}),calls:()=>calls};
}
test('cntransit temporary HTTP failure retries and returns complete image bytes',async()=>{
 const r=route([503,200]);const response=await r.get();
 assert.equal(response.status,200);assert.equal(r.calls(),2);
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
 assert.equal(response.headers.get('content-length'),String(png.length));
});
test('persistent upstream errors remain noncacheable and retries are bounded',async()=>{
 const r=route([502]);const response=await r.get();
 assert.equal(response.status,502);assert.equal(r.calls(),2);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('upstream missing files are not retried',async()=>{
 const r=route([404]);assert.equal((await r.get()).status,502);assert.equal(r.calls(),1);
});
test('unrelated filenames never reach upstream',async()=>{
 const r=route([200]);assert.equal((await r.get('other.png')).status,404);assert.equal(r.calls(),0);
});
