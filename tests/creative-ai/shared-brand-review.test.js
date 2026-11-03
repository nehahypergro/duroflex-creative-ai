'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('ten separate brand stores retain every same-brand update without changing the other brand',async()=>{
 const {BrandStore}=require('../../lib/creative-ai/runtime/brands'),root=await fs.mkdtemp(path.join(os.tmpdir(),'brand-writers-'));
 try{const stores=Array.from({length:10},()=>new BrandStore(root));for(const id of ['brand-duroflex','brand-sleepyhead'])await stores[0].save(id,'brand.json',{id,name:id,notes:[]});
 for(const id of ['brand-duroflex','brand-sleepyhead']){await Promise.all(stores.map((s,i)=>s.update(id,async b=>{await new Promise(r=>setTimeout(r,2));b.notes.push(id+'-'+i);})));const b=await stores[0].read(id);assert.equal(b.notes.length,10);assert.ok(b.notes.every(n=>n.startsWith(id)));}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('ten reviewer transactions serialize instead of losing callbacks to a busy lock',async()=>{
 const {ReviewLedger}=require('../../lib/creative-ai/creative-reviewer/lifecycle'),root=await fs.mkdtemp(path.join(os.tmpdir(),'review-writers-')),key='a'.repeat(64);
 try{const ledgers=Array.from({length:10},()=>new ReviewLedger(root)),results=await Promise.allSettled(ledgers.map(l=>l.transact(key,async old=>{await new Promise(r=>setTimeout(r,2));return {unitKey:key,count:(old?.count||0)+1};})));assert.equal(results.filter(r=>r.status==='fulfilled').length,10);assert.equal((await ledgers[0].read(key)).count,10);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
