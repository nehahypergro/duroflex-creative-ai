'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const web=require('../../lib/creative-ai/experiments/web-commerce');
test('catalogue covers every Web & commerce entry and complete chosen sets',()=>{
 const slots=web.slots();assert.equal(slots.length,18);assert.equal(new Set(slots.map(s=>s.key)).size,18);assert.deepEqual(Object.fromEntries([...new Set(slots.map(s=>s.group))].map(g=>[g,slots.filter(s=>s.group===g).length])),{banner:1,gallery:5,marketplace:3,feature:1,lifestyle:1,story:4,premium:2,tile:1});
 for(const slot of slots){assert.ok(slot.width>0&&slot.height>0);const id='custom:raw-web-'+slot.key;const resolved=require('../../lib/creative-ai/runtime/placements').resolve({placementIds:[id],customProfiles:[{id,name:slot.label,platform:slot.groupLabel,publisher:'studio',placement:'image',assetType:'static',canvas:{width:slot.width,height:slot.height,unit:'px'},exportContract:{formats:['png']},displayContext:slot.direction}]});assert.equal(resolved.selections.length,1);assert.equal(resolved.selections[0].description.dimensions.width,slot.width);}
});
test('format prompts have one clear text policy and do not inherit banner coordinates',()=>{
 const source={record:{productReference:{sku:'EXACT'},exactCopy:{fields:[{id:'headline',delivery:'embedded',text:'Saved headline'}]}}};
 for(const slot of web.slots()){const prompt=web.buildPrompt(source,slot);assert.match(prompt,/EXACT/);assert.ok(prompt.length<10000);if(slot.text==='none'){assert.match(prompt,/IMAGE ONLY/);assert.doesNotMatch(prompt,/Render precisely/);}else assert.match(prompt,/Render precisely/);assert.doesNotMatch(prompt,/composed-type-guide|editable reconstruction|x=94/);}
});
test('five rolling slots refill immediately and failures do not stop remaining work',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'raw-web-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));let running=0,peak=0;const starts=[],ends=[];
 const batch={id:'raw-web-'+'a'.repeat(24),status:'running',items:web.slots().slice(0,8).map(slot=>({slot,status:'queued'})),errors:[]};
 const runtime={root,store:{read:async id=>({id,intake:{rawArtworkExperimentVersion:1},status:'finished',results:[{imageUrl:'/files/raw-artwork.png',ready:false,qualityVerified:false}]})}};
 await web.execute(runtime,batch,{prepareItem:async(_,__,slot)=>({id:slot.key}),runItem:async(_,id)=>{starts.push(id);running++;peak=Math.max(peak,running);try{await new Promise(r=>setTimeout(r,id==='banner-banner'?80:5));if(id==='gallery-front')throw Error('Fixture image failure');}finally{running--;ends.push(id);}}});
 assert.equal(peak,5);assert.equal(starts.length,8);assert.ok(starts.indexOf('gallery-lifestyle')>=5);assert.ok(ends.indexOf('gallery-lifestyle')<ends.indexOf('banner-banner'));assert.equal(batch.items.filter(i=>i.status==='finished').length,7);assert.equal(batch.errors.length,1);assert.equal(batch.status,'partial');
 const disk=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/raw-artwork-batches',batch.id+'.json')));assert.equal(disk.items.length,8);assert.equal(disk.items.filter(i=>i.result).length,7);
});
test('batch status marks worker interruption without resubmitting paid requests',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'raw-web-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const id='raw-web-'+'b'.repeat(24),dir=path.join(root,'output/creative-ai/raw-artwork-batches');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({id,status:'running',source:{sourceId:'saved'},items:[]}));const result=await web.status({root,store:{read:async()=>({})}},id);assert.equal(result.status,'interrupted');assert.match(result.notice,/reconciliation/);await assert.rejects(web.status({root},'../../secret'),/Invalid/);
});
test('only known zero-dispatch capacity failures qualify for one recovery',()=>{
 const j={intake:{rawArtworkExperimentVersion:1},status:'failed',error:'Shared capacity configuration differs between workers; drain and reconfigure the capacity directory before changing limits.',budget:{imageCalls:0,reasoningCalls:0,receipts:[],imageReservations:[],estimatedSpend:{reservations:[],reservedUsd:0}}};
 assert.equal(web.undispatched(j),true);
 for(const change of [{budget:{...j.budget,imageCalls:1}},{budget:{...j.budget,requestStates:{x:{}}}},{budget:{...j.budget,imageReservations:['x']}},{rawWebRecovery:{}},{error:'Network timeout'},{imageWaits:{x:{}}},{results:[{}]}])assert.equal(Boolean(web.undispatched({...j,...change})),false);
});
test('recovery reuses finished outputs and dispatches only zero-history eligible jobs',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'raw-web-resume-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const jobs={safe:{id:'safe',intake:{rawArtworkExperimentVersion:1},status:'failed',error:'Shared capacity configuration differs between workers; drain and reconfigure the capacity directory before changing limits.',budget:{imageCalls:0,reasoningCalls:0,receipts:[],imageReservations:[],estimatedSpend:{reservations:[],reservedUsd:0}}},uncertain:{id:'uncertain',intake:{rawArtworkExperimentVersion:1},status:'failed',error:'Network timeout',budget:{imageCalls:1}},done:{id:'done',status:'finished'}};
 const originalDone=structuredClone(jobs.done),calls=[];
 const batch={id:'raw-web-'+'c'.repeat(24),items:[{slot:{key:'done'},jobId:'done',status:'finished'},{slot:{key:'safe'},jobId:'safe',status:'failed',resumeUndispatched:true},{slot:{key:'uncertain'},jobId:'uncertain',status:'failed',resumeUndispatched:true}],errors:[{message:'original evidence'}]};
 const runtime={root,config:{jobTimeoutMs:5000},store:{read:async id=>jobs[id],update:async(id,fn)=>jobs[id]=fn(jobs[id])}};
 await web.execute(runtime,batch,{prepareItem:async(_,__,slot)=>({id:slot.key,reused:true}),runItem:async(_,id)=>{calls.push(id);jobs[id].status='finished';jobs[id].results=[{imageUrl:'/raw-artwork.png'}];}});
 assert.deepEqual(calls,['safe']);assert.deepEqual(jobs.done,originalDone);assert.equal(jobs.safe.rawWebRecovery.previousError.includes('capacity'),true);assert.equal(batch.items[1].status,'finished');assert.equal(batch.items[2].status,'failed');assert.equal(batch.errors[0].message,'original evidence');assert.equal(batch.status,'partial');
});
