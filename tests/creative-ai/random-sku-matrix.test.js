'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {matrix,formatNames}=require('../../scripts/creative-ai/qa-random-sku-matrix');
test('SKU matrix has 600 distinct brand/variant/ratio/language combinations, including overlapping cross-brand variant IDs',()=>{
 const brands=['Duroflex','Sleepyhead'].map(brandId=>({brandId,products:Array.from({length:10},(_,i)=>({variant:{id:String(i)}}))}));
 const rows=matrix(brands);assert.equal(rows.length,600);assert.equal(new Set(rows.map(r=>r.key)).size,600);
 for(const b of brands)assert.equal(rows.filter(r=>r.brand===b).length,300);
 assert.equal(rows.filter(r=>r.language==='Hindi').length,300);
 const presets=require('../../lib/creative-ai/runtime/output-formats').presets,gcd=(a,b)=>b?gcd(b,a%b):a;
 const selected=formatNames.map(n=>presets.find(p=>p.id==='custom:studio-'+n));assert.ok(selected.every(p=>p?.kind==='static'));
 assert.equal(new Set(selected.map(p=>{const d=gcd(p.width,p.height);return p.width/d+':'+p.height/d;})).size,15);
 assert.ok(selected.some(p=>p.width/p.height>7));assert.ok(selected.some(p=>p.height/p.width===5));
});
