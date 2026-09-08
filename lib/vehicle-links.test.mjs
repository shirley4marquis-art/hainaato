import '../scripts/load-typescript.cjs';
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {getVehicleBySlug}=require('./vehicle-details.ts');
const sourceDomain=/^https?:\/\/(?:[^/]+\.)?(?:hainaauto\.com|cntransit\.cn)(?:\/|$)/i;

test('active supplier records resolve to their local vehicle pages',()=>{
 let checked=0;
 for(const file of fs.readdirSync('data/vehicle-detail-shards').filter(f=>f.endsWith('.json'))){
  const shard=JSON.parse(fs.readFileSync(path.join('data/vehicle-detail-shards',file),'utf8'));
  for(const [slug,vehicle] of Object.entries(shard)){
   assert.equal(sourceDomain.test(vehicle.url??''),false,slug+' still exposes a source URL');
   if(vehicle.site!=='hainaauto'&&vehicle.site!=='cntransit')continue;
   const loaded=getVehicleBySlug(slug);
   assert.equal(loaded.url,`/vehicles/${encodeURIComponent(slug)}`);
   assert.deepEqual(loaded.images,vehicle.images);
   assert.equal(loaded.priceCNY,vehicle.priceCNY);
   checked++;
  }
 }
 assert.ok(checked>30000);
 assert.equal(getVehicleBySlug('../../source'),null);
});

test('catalogue compaction and sharding cannot restore imported source links',()=>{
 const root=process.cwd();
 fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
 const workspace=fs.mkdtempSync(path.join(root,'tmp','local-links-test-'));
 const vehicles=path.join(workspace,'data','vehicles');fs.mkdirSync(vehicles,{recursive:true});
 const fixture={slug:'hainaauto-test-vehicle',site:'hainaauto',url:'https://hainaauto.com/vehicle/123',title:'Test vehicle',priceCNY:100,images:['photo.webp']};
 fs.writeFileSync(path.join(vehicles,'vehicle.json'),JSON.stringify(fixture));
 execFileSync(process.execPath,[path.join(root,'scripts/compact-vehicle-data.mjs')],{cwd:workspace});
 execFileSync(process.execPath,[path.join(root,'scripts/shard-vehicle-data.mjs')],{cwd:workspace});
 const expected={...fixture,url:'/vehicles/hainaauto-test-vehicle'};
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(workspace,'data/vehicle-details.json'),'utf8'))[fixture.slug],expected);
 const output=Object.assign({},...fs.readdirSync(path.join(workspace,'data/vehicle-detail-shards')).map(file=>JSON.parse(fs.readFileSync(path.join(workspace,'data/vehicle-detail-shards',file),'utf8'))));
 assert.deepEqual(output[fixture.slug],expected);
});
