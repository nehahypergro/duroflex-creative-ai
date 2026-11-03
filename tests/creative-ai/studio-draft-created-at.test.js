'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model.js');
test('new briefs record their creation time and saves preserve it',()=>{
 for(const brand of ['Duroflex','Sleepyhead']){
 const values=new Map(),store=M.storage({getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)});
 const d=M.newDraft(brand);assert.ok(Number.isFinite(Date.parse(d.createdAt)),'new drafts need a creation timestamp');assert.equal(d.createdAt,d.updatedAt);
 const saved=store.save(d);assert.equal(store.save({...saved,brief:'Updated brief'}).createdAt,d.createdAt);
 const legacy=M.newDraft(brand);delete legacy.createdAt;assert.equal(store.save(legacy).createdAt,undefined,'do not invent historical creation dates');
 }
});
