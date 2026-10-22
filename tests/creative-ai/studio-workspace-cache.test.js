'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
 let now=0;const calls=[];
 const context={window:{},Date:{now:()=>now},AbortController,setTimeout,clearTimeout,StudioModel:{normalizeJob:(j,b)=>{if(j.brandId!==b)throw Error('Wrong brand');return j;}},fetch:async url=>{calls.push(url);if(url.endsWith('/jobs'))return {ok:true,json:async()=>['a','b'].map(brandId=>({id:brandId,brandId}))};if(url.endsWith('/edits'))return {ok:true,json:async()=>[]};if(/\/jobs\/[ab]$/.test(url))return {ok:true,json:async()=>({id:url.at(-1),brandId:url.at(-1),results:[]})};return {ok:true,json:async()=>[]};}};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../public/creative-ai/studio-data.js'),'utf8'),context);
 return {D:context.window.StudioData,calls,context,tick:ms=>now+=ms};
}
test('Workspace cache: brand isolation, concurrent load deduplication, expiry and fresh job reads',async()=>{
 const {D,calls,tick}=fixture();const [a,same]=await Promise.all([D.workspace('a'),D.workspace('a')]);assert.equal(a,same);assert.equal(a[0].value.projects[0].brandId,'a');assert.equal(calls.filter(x=>x.endsWith('/jobs/a')).length,1);
 const count=calls.length;assert.equal(await D.workspace('a'),a);assert.equal(calls.length,count);assert.equal(D.peekWorkspace('b'),undefined);
 const b=await D.workspace('b');assert.equal(b[0].value.projects[0].brandId,'b');assert.equal(D.peekWorkspace('a'),a);
 tick(30001);assert.notEqual(await D.workspace('a'),a);assert.equal(calls.filter(x=>x.endsWith('/jobs/a')).length,2);
 D.clear();assert.equal(D.peekWorkspace('a'),undefined);assert.equal(D.peekWorkspace('b'),undefined);
});
test('Workspace cache: failures retry and invalidation prevents stale pending responses repopulating caches',async()=>{
 const f=fixture(),{D,context,calls}=f;const fetch=context.fetch;
 context.fetch=async url=>url.endsWith('/products')?{ok:false}:fetch(url);
 const failed=await D.workspace('a');assert.equal(failed[1].status,'rejected');assert.equal(D.peekWorkspace('a'),undefined);
 context.fetch=fetch;await D.workspace('a');assert.ok(D.peekWorkspace('a'));D.clear();
 let release;const gate=new Promise(r=>release=r);context.fetch=async url=>{if(url.endsWith('/jobs/a'))await gate;return fetch(url);};
 const pending=D.workspace('a');await new Promise(r=>setImmediate(r));D.clear();release();await pending;assert.equal(D.peekWorkspace('a'),undefined);
 const count=calls.filter(x=>x.endsWith('/jobs/a')).length;await D.workspace('a');assert.equal(calls.filter(x=>x.endsWith('/jobs/a')).length,count+1);
});
test('Workspace cache: explicit project refresh updates the cached gallery',async()=>{
 const {D,context}=fixture();await D.workspace('a');const fetch=context.fetch;context.fetch=async url=>url.endsWith('/jobs/a')?{ok:true,json:async()=>({id:'a',brandId:'a',status:'finished',results:[{imageUrl:'/fresh.png'}]})}:fetch(url);
 await D.projects('a',true);assert.equal(D.peekWorkspace('a')[0].value.projects[0].results[0].imageUrl,'/fresh.png');
});

test('Finished creative loads design details before project/progress resolves and does not manufacture missing evidence',async()=>{
 const {D,context}=fixture(),fetch=context.fetch;let fail=false,reads=0;
 context.fetch=async url=>{
  if(url.endsWith('/jobs/a'))return {ok:true,json:async()=>({id:'a',brandId:'a',status:'finished',results:[{route:'continuity',placementId:'square',imageUrl:'/art.png'}]})};
  if(url.endsWith('/details')){reads++;return {ok:!fail,json:async()=>({units:[{route:'continuity',placementId:'square',plannedArt:{composition:'Recorded composition'},review:null}]})};}
  return fetch(url);
 };
 const initial=await D.project('a','a');assert.equal(initial.designDetails.units[0].plannedArt.composition,'Recorded composition');assert.equal(initial.designDetails.units[0].review,null);
 const completed=await D.progress('a','a');assert.ok(completed.designDetails);assert.equal(reads,2);
 fail=true;const failed=await D.project('a','a',true);assert.equal(failed.designDetails,undefined);assert.match(failed.designDetailsError,/could not load/);assert.equal(failed.results[0].imageUrl,'/art.png');
});

test('Workspace snapshots survive reload, remain brand-scoped and revalidate',async()=>{
 const f=fixture(),disk=new Map();f.context.sessionStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k),key:i=>[...disk.keys()][i],get length(){return disk.size;}};
 f.tick(100000);await f.D.workspace('a');assert.equal(disk.size,1);
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../public/creative-ai/studio-data.js'),'utf8'),f.context);
 const next=f.context.window.StudioData;assert.equal(next.peekWorkspace('a')[0].value.projects[0].brandId,'a');assert.equal(next.peekWorkspace('b'),undefined);
 const count=f.calls.length;await next.workspace('a');assert.ok(f.calls.length>count);next.invalidateWorkspace('a');assert.equal(disk.size,0);
});
