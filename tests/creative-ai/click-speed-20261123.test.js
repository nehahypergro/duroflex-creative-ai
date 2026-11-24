'use strict';
// Live speed check (23 Nov 2026, Neha: "fix 1 and 3"). On the hosted Studio, opening a project made 3 requests (the
// project, its design details, its saved edits) and opening a design 4, every time, even right after the list had
// loaded that project; the design details are shown nowhere. Switching brand made 7 requests, 3 of them re-reading
// the brand just left. Both brands; every test here fails before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.join(__dirname,'../..');
const BRANDS=[['Duroflex','brand-1923d633-e03e-44cc-84b2-bbfb5c152710'],['Sleepyhead','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de']];

function page(){
 const M=require('../../public/creative-ai/studio-model.js'),calls=[],clock={now:Date.parse('2026-11-23T18:00:00Z')},status=new Map();
 const id=(brandId,n)=>'creative-'+brandId.slice(6,14)+'-0000-4000-8000-00000000000'+n;
 const view=(brandId,x)=>({id:x,brandId,status:status.get(x)||'finished',createdAt:'2026-11-01T00:00:00Z',placements:[{id:'square'}],results:[{route:'continuity',placementId:'square',imageUrl:'/a.png'}]});
 const edits=[{route:'continuity',placementId:'square',revision:2,updatedAt:'2026-11-05T00:00:00Z'}];
 const fetch=async url=>{const u=new URL(url,'http://local'),p=u.pathname.replace('/creative-ai/api/','');calls.push(p+(u.searchParams.get('include')?'?include':''));
  let body;const brandId=u.searchParams.get('brandId')||(/brands\/([^/]+)/.exec(p)||[])[1]||BRANDS.find(b=>p.includes(b[1].slice(6,14)))?.[1];
  if(p==='jobs'&&!u.searchParams.get('include'))body=[1,2,3].map(n=>({id:id(brandId,n),brandId,status:status.get(id(brandId,n))||'finished',createdAt:'2026-11-0'+n+'T00:00:00Z',updatedAt:'2026-11-0'+n+'T00:00:00Z',freshness:'x'}));
  else if(p==='jobs')body={version:1,brandId,projects:u.searchParams.get('ids').split(',').map(x=>({...view(brandId,x),edits}))};
  else if(/^jobs\/[^/]+\/edits$/.test(p))body=edits;
  else if(/^jobs\/[^/]+\/details$/.test(p))body={units:[]};
  else if(/^jobs\/[^/]+$/.test(p))body=view(brandId,p.split('/')[1]);
  else if(/products/.test(p))body=[{id:'product-1',brandId,name:'Mattress'}];
  else if(/assets/.test(p))body={assets:[]};
  return {ok:true,status:200,json:async()=>body};};
 const storage={length:0,key:()=>null,getItem:()=>null,setItem(){},removeItem(){}};
 const window={sessionStorage:storage,localStorage:storage,dispatchEvent(){}};
 class FakeDate extends Date{static now(){return clock.now;}}
 const ctx=vm.createContext({window,StudioModel:M,fetch,AbortController,setTimeout,clearTimeout,console,URL,indexedDB:undefined,structuredClone,Date:FakeDate,CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail;}}});
 vm.runInContext(fs.readFileSync(path.join(repo,'public/creative-ai/studio-data.js'),'utf8'),ctx);
 return {D:window.StudioData,calls,clock,status,id};
}

for(const [brand,brandId] of BRANDS)test(brand+': opening a project the list just loaded makes no request; later only the project and its edits',async()=>{
 const {D,calls,clock,status,id}=page();status.set(id(brandId,3),'running');
 await D.projects(brandId,false);assert.deepEqual(calls,['jobs','jobs?include']);
 calls.length=0;const seen=await D.progress(id(brandId,1),brandId);
 assert.deepEqual(calls,[],'opened right after the list: nothing is read again');assert.equal(seen.results[0].latestEdit.revision,2,'the saved edit is still shown');
 calls.length=0;await D.progress(id(brandId,3),brandId);assert.deepEqual(calls,['jobs/'+id(brandId,3)],'a project being made is always read again');
 clock.now+=61000;calls.length=0;await D.progress(id(brandId,1),brandId);
 assert.deepEqual(calls,['jobs/'+id(brandId,1),'jobs/'+id(brandId,1)+'/edits'],'after a minute: the project and its edits, never the unused design details');
 calls.length=0;await D.progress(id(brandId,1),brandId);assert.deepEqual(calls,[],'its own read counts as confirmed too');
 calls.length=0;await D.progress(id(brandId,1),brandId,undefined,{force:true});assert.deepEqual(calls,['jobs/'+id(brandId,1),'jobs/'+id(brandId,1)+'/edits'],'a tab return or Check status always reads the server');
 await D.leanRecheck(id(brandId,1),{brandId});calls.length=0;await D.progress(id(brandId,1),brandId);await D.progress(id(brandId,1),brandId);assert.equal(calls.length,4,'for a minute after a change sent from this page, every open reads again');
 clock.now+=61000;await D.projects(brandId,true);calls.length=0;await D.progress(id(brandId,1),brandId);assert.deepEqual(calls,[],'then the shortcut applies again');
 D.clear();calls.length=0;await D.project(id(brandId,1),brandId,true);assert.deepEqual(calls,['jobs/'+id(brandId,1),'jobs/'+id(brandId,1)+'/edits'],'a fresh read after a save: no design details');
 D.clear();calls.length=0;await D.progress(id(brandId,2),brandId);assert.equal(calls.length,2,'after a clear, nothing counts as confirmed');
});

for(const [brand,brandId] of BRANDS)test(brand+': the progress poller forces a read on tab return, focus and retries, not on opening a page',async()=>{
 const M=require('../../public/creative-ai/studio-model.js'),seen=[],timers=[];let fail=false;
 const poller=M.createProgressPoller({read:async(t,signal,opts)=>{seen.push(t.id+':'+!!opts?.force);if(fail)throw Error('offline');return {};},apply(){},error(){},setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer(){}});
 const flush=async()=>{while(timers.length){timers.shift()();await new Promise(r=>setImmediate(r));}};
 const target=view=>({key:brandId+':job:'+view,id:'job',brandId,repeat:false});
 poller.watch(target('project'));await flush();assert.deepEqual(seen,['job:false'],'opening the project page');
 poller.watch(target('review'));await flush();assert.deepEqual(seen.slice(1),['job:false'],'opening a design');
 poller.watch(target('review'),{immediate:true});await flush();assert.deepEqual(seen.slice(2),['job:true'],'focus or Check status on the same page');
 poller.watch(null);poller.watch(target('review'),{immediate:true});await flush();assert.deepEqual(seen.slice(3),['job:true'],'returning to a hidden tab');
 fail=true;poller.watch(target('project'));timers.shift()();await new Promise(r=>setImmediate(r));fail=false;await flush();assert.deepEqual(seen.slice(4),['job:false','job:true'],'the retry after a failed read reaches the server');
});

for(const [brand,brandId] of BRANDS)test(brand+': switching brand does not re-read the brand just left',async()=>{
 const {D,calls}=page(),other=BRANDS.find(b=>b[1]!==brandId)[1];
 await D.workspace(brandId);calls.length=0;
 assert.equal(await D.warmWorkspace(brandId),null);assert.deepEqual(calls,[],'the brand this tab already holds is not read again');
 await D.warmWorkspace(other);assert.ok(calls.some(c=>c==='jobs')&&calls.some(c=>/products/.test(c)),'a brand this tab has never loaded is still warmed');
 assert.match(fs.readFileSync(path.join(repo,'public/creative-ai/studio.js'),'utf8'),/if\(other\)D\.warmWorkspace\(other\.id\)/,'the page warms through warmWorkspace');
});
