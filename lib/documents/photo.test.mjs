import '../../scripts/load-typescript.cjs';
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const {optimizeDocumentPhoto}=require('./photo.ts');
test('large document photos become bounded JPEGs with correct orientation',async()=>{
 const input=await sharp({create:{width:2400,height:1200,channels:3,background:'#336699'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const output=await optimizeDocumentPhoto(input),meta=await sharp(output).metadata();
 assert.equal(meta.format,'jpeg');assert.equal(meta.width,800);assert.equal(meta.height,1600);
 assert.equal(meta.orientation,undefined);
});
test('small transparent images retain dimensions and get a white background',async()=>{
 const input=await sharp({create:{width:80,height:40,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 const output=await optimizeDocumentPhoto(input),meta=await sharp(output).metadata();
 assert.equal(meta.width,80);assert.equal(meta.height,40);assert.equal(meta.hasAlpha,false);
 const {data}=await sharp(output).raw().toBuffer({resolveWithObject:true});
 assert.ok(data[0]>250 && data[1]>250 && data[2]>250);
});
