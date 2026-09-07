import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const source=JSON.parse(await fs.readFile('private-documents/template-library/contract.json','utf8'));
const task=getDocument({data:new Uint8Array(await fs.readFile(`private-documents/${source.file}`)),useSystemFonts:true}),doc=await task.promise;
const report=[];
for(const region of source.mapping.protectedRegions){
 const page=await doc.getPage(region.page),viewport=page.getViewport({scale:1.4}),original=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:original.getContext('2d'),viewport}).promise;
 const x=Math.ceil(region.x*1.4),y=Math.ceil(region.y*1.4),w=Math.floor(region.width*1.4)-2,h=Math.floor(region.height*1.4)-2,expected=original.getContext('2d').getImageData(x,y,w,h).data;
 for(const language of ['','-es','-en','-zh']){
  const png=await loadImage(`private-documents/qa/contract${language}-${region.page}.png`),actual=createCanvas(png.width,png.height);actual.getContext('2d').drawImage(png,0,0);const pixels=actual.getContext('2d').getImageData(x,y,w,h).data;
  let changed=0,maxDifference=0;for(let i=0;i<expected.length;i+=4){const delta=Math.max(...[0,1,2].map(c=>Math.abs(expected[i+c]-pixels[i+c])));if(delta>5)changed++;maxDifference=Math.max(maxDifference,delta);}
  const ratio=changed/(w*h);assert.ok(ratio<0.005,`Signature pixels changed on page ${region.page} ${language}: ${ratio}`);report.push({page:region.page,language:language||'-es-zh',changedPixelFraction:ratio,maxDifference});
 }
}
await task.destroy();await fs.writeFile('private-documents/qa/signature-comparison.json',JSON.stringify(report,null,2));console.log(report);
