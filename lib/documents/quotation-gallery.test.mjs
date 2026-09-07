import '../../scripts/load-typescript.cjs';
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {loadQuotationPhotos}=require('./quotation-gallery.ts');
const item={make:'JAC',model:'T9',photos:[{url:'/vehicle-images/a.jpg'},{url:'/vehicle-images/b.jpg'},{url:'/vehicle-images/c.jpg'},{url:'/vehicle-images/d.jpg'}]};
test('quotation photos skip failures and duplicate image contents',async()=>{
 const images=await loadQuotationPhotos([item],async source=>source.includes('a.jpg')?null:Buffer.from(source));
 assert.equal(images[0].length,3);
 await assert.rejects(()=>loadQuotationPhotos([item],async()=>Buffer.from('duplicate')),/3 distinct/);
});
test('missing photos fail clearly rather than issuing a quotation without images',async()=>{
 await assert.rejects(()=>loadQuotationPhotos([{...item,photos:[]}],async()=>null),/JAC T9.*0 available/);
});
test('each vehicle gets its own three photos and shared sources are fetched once',async()=>{
 let calls=0;
 const images=await loadQuotationPhotos([item,item],async source=>{calls++;return Buffer.from(source);});
 assert.deepEqual(images.map(p=>p.length),[3,3]);
 assert.equal(calls,3);
});
