// Compare the immutable company stationery and signed artwork after rendering.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const dir='private-documents/template-library',qa='private-documents/qa',scale=1.4;
const task=getDocument({data:new Uint8Array(await fs.readFile('private-documents/Contrato_Haina_Auto_Ali_Rmeiti_EST0076_Puerto_Cabello.pdf')),useSystemFonts:true});
const reference=await task.promise,first=await reference.getPage(1),v=first.getViewport({scale}),canvas=createCanvas(Math.ceil(v.width),Math.ceil(v.height));
await first.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
const regions=[{name:'logo and company header',x:34,y:25,w:260,h:116},{name:'orange rule',x:40,y:155,w:510,h:2},{name:'navy footer',x:34,y:778,w:515,h:27}];
const report=[];
for(const filename of (await fs.readdir(dir)).filter(f=>f.endsWith('.json'))){
 const entry=JSON.parse(await fs.readFile(dir+'/'+filename,'utf8'));
 assert.equal(entry.designRevision,'contract-reference-2026-09-v1');
 const png=await loadImage(qa+'/'+filename.replace('.json','-1.png')),actual=createCanvas(png.width,png.height);actual.getContext('2d').drawImage(png,0,0);
 for(const r of regions){
  const x=Math.ceil(r.x*scale),y=Math.ceil(r.y*scale),w=Math.floor(r.w*scale),h=Math.floor(r.h*scale);
  const a=canvas.getContext('2d').getImageData(x,y,w,h).data,b=actual.getContext('2d').getImageData(x,y,w,h).data;
  let changed=0;for(let i=0;i<a.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))>5)changed++;
  assert.ok(changed/(w*h)<.005,filename+' changed '+r.name);
 }
 report.push({template:filename,stationery:'matches reference'});
}
await task.destroy();
await fs.writeFile(qa+'/design-consistency.json',JSON.stringify(report,null,2));
console.log('Verified reference header, orange rule and footer on '+report.length+' document covers.');
