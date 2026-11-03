'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
function memory(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
test('Unfinished Home inputs persist per brand, survive reload, and reject stale/corrupt writes',()=>{const raw=memory(),s=M.composerStorage(raw);let d=s.read('brand-duroflex');d.data={...d.data,prompt:'नमस्ते “home”',audience:'Families',style:'Evening',productId:'sku-a',featureId:8,formatChosen:true};const saved=s.save('brand-duroflex',d);assert.deepEqual(M.composerStorage(raw).read('brand-duroflex'),saved);assert.equal(s.read('brand-sleepyhead').data.prompt,'');assert.throws(()=>s.save('brand-duroflex',d),/another tab/i);raw.setItem('creative-ai-home:brand-sleepyhead','broken');assert.throws(()=>s.read('brand-sleepyhead'),/saved Home/i);assert.throws(()=>s.save('brand-sleepyhead',{revision:0,data:d.data}),/saved Home/i);assert.equal(raw.getItem('creative-ai-home:brand-sleepyhead'),'broken');});
test('Continue working prioritises actionable work without mutating project order',()=>{const p=[{id:'ready',status:'finished',results:[{ready:true,imageUrl:'/creative-ai/api/jobs/a/files/x.png'}],updatedAt:'2026-10-22'},{id:'review',status:'finished',results:[{ready:false,imageUrl:'/creative-ai/api/jobs/a/files/x.png'}],updatedAt:'2026-10-20'},{id:'draft',local:true,status:'draft',updatedAt:'2026-10-19'},{id:'failed',status:'failed',updatedAt:'2026-10-18'}],before=JSON.stringify(p);assert.deepEqual(M.activeWork(p).map(p=>p.id),['failed','review']);assert.equal(JSON.stringify(p),before);});
test('Historical failures cannot crowd all visual work off Home',()=>{const failures=Array.from({length:8},(_,i)=>({id:'failed'+i,status:'failed',updatedAt:'2026-10-22'})),reviews=Array.from({length:3},(_,i)=>({id:'review'+i,status:'finished',results:[{ready:false,imageUrl:'/creative-ai/api/jobs/a/files/x.png'}],updatedAt:'2026-10-20'}));const rows=M.activeWork([...failures,...reviews]);assert.equal(rows.filter(p=>p.status==='failed').length,1);assert.equal(rows.length,4);assert.equal(rows.filter(p=>p.id.startsWith('review')).length,3);});

test('selected-product drafts remain actionable while blank briefs stay in Drafts',()=>{const a={id:'selected',local:true,status:'draft',productId:'sku-a'},b={id:'blank',local:true,status:'draft'};assert.deepEqual(M.activeWork([a,b]).map(x=>x.id),['selected']);});


test('Continue working keeps all eligible projects beyond three or four cards',()=>{
 const projects=Array.from({length:12},(_,i)=>({id:'review-'+i,status:'finished',updatedAt:'2026-10-23',results:[{ready:false,imageUrl:'/creative-ai/api/jobs/a/files/x.png'}]}));
 const before=JSON.stringify(projects),rows=M.activeWork(projects);
 assert.equal(rows.length,12);assert.equal(new Set(rows.map(p=>p.id)).size,12);assert.equal(JSON.stringify(projects),before);
});
