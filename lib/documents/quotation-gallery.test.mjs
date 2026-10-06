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
 const single=await loadQuotationPhotos([item],async source=>source.includes('a.jpg')?Buffer.from('one'):null);
 assert.equal(single[0].length,1);
 const duplicates=await loadQuotationPhotos([item],async()=>Buffer.from('duplicate'));
 assert.equal(duplicates[0].length,1);
});
test('missing photos fail clearly rather than issuing a quotation without images',async()=>{
 await assert.rejects(()=>loadQuotationPhotos([{...item,photos:[]}],async()=>null),/No accessible catalogue photos.*JAC T9/);
});
test('each vehicle gets its own three photos and shared sources are fetched once',async()=>{
 let calls=0;
 const images=await loadQuotationPhotos([item,item],async source=>{calls++;return Buffer.from(source);});
 assert.deepEqual(images.map(p=>p.length),[3,3]);
 assert.equal(calls,3);
});

test('transient upstream failures are retried before rejecting the quotation',async()=>{
 const attempts=new Map();
 const images=await loadQuotationPhotos([{...item,photos:item.photos.slice(0,3)}],async source=>{
  const count=(attempts.get(source)??0)+1; attempts.set(source,count);
  return count===1?null:Buffer.from(source);
 });
 assert.equal(images[0].length,3);
 assert.deepEqual([...attempts.values()],[2,2,2]);
});
