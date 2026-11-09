'use strict';
// Design-page AI edits (user request, 8 Nov 2026): "the AI editor chat here, which can edit the
// image, and it can store versions also". Before this change a simplified (lean) design had no
// edit path at all (Refinements.createRequest rejects lean jobs). Offline only: the provider is a
// fake that records calls and receipts; no paid request is ever sent.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),sharp=require('sharp');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),{fingerprint}=require('../../lib/creative-ai/art-director');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const {fixture}=require('./helpers/lean-ai-edit-fixture.cjs');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': one Send makes one paid edit saved as a new exact-size version; the original is untouched and selection is guarded',async t=>{
 const f=await fixture(t,brand),parentBefore=await fs.readFile(path.join(f.runtime.store.dir(f.job.id),'job.json')),q='?route=continuity&placementId=square&brandId='+f.own.b.id;
 let list=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits'+q);assert.equal(list.status,200,JSON.stringify(list.body));assert.equal(list.body.versions.length,1);assert.equal(list.body.activeVersionId,'original');assert.equal(list.body.estimate.currency,'INR');
 const send={...f.unit,instruction:'Make the background light blue',requestKey:'edit-request-0001',sourceVersionId:'original',expectedVersionId:'original'};
 const created=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send);assert.equal(created.status,202,JSON.stringify(created.body));
 const saved=await f.done(created.body.id);assert.equal(saved.status,'finished',saved.error);
 assert.equal(f.calls.length,1,'exactly one image request');const call=f.calls[0];
 assert.equal(call.model,'gpt-image-2');assert.equal(call.quality,'high');assert.equal(call.mask,undefined,'no marks: a whole-image edit with no mask');assert.doesNotMatch(call.prompt,/MARKED AREAS/);assert.equal(call.attachments[0].assetId,'creative-edit-anchor');assert.equal(call.attachments[0].sha256,sha(f.original));
 assert.match(call.prompt,/BRAND BOUNDARY: /,'brand boundary from the scoped provider');assert.match(call.prompt,/Make the background light blue/);assert.match(call.prompt,/Sleep better tonight/);assert.match(call.prompt,/Never add claims/);
 assert.ok(!call.prompt.includes(f.other.b.name+' ('),'no other brand in the prompt');
 // Exact canvas: the 1024×1280 provider image is fitted to 1080×1350 without stretching.
 const versionFile=path.join(f.runtime.refinements.store(f.job.id).dir(saved.id),saved.result.imageUrl.split('/').pop()),meta=await sharp(versionFile).metadata();
 assert.deepEqual([meta.width,meta.height],[1080,1350]);assert.equal(saved.result.check,'not-checked');assert.equal(saved.result.ready,false,'an edited version never inherits Ready');
 // Receipts are on the child job inside refinements/, which the cost ledger scans.
 assert.ok(saved.costs.estimatedTotal>0&&saved.costs.currency==='INR','real INR cost estimate after the edit');assert.match(saved.costs.basis,/estimate/);assert.ok(list.body.estimate.perEdit>0,'cost estimate shown before Send');
 const child=await f.runtime.refinements.store(f.job.id).read(saved.id);assert.equal(child.budget.receipts.length,1);assert.equal(child.intake.brandId,f.own.b.id);
 const ledger=await new (require('../../lib/cost-tracker').CostTracker)(f.root,{brands:[{id:f.own.b.id,name:brand}]}).snapshot(),row=JSON.stringify(ledger);assert.ok(row.includes(child.budget.receipts[0].requestKey)||row.includes(saved.id),'the edit receipt is in the cost ledger');
 // The same Send again (retry/double click) returns the same version and buys nothing.
 const again=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send);assert.equal(again.body.id,saved.id);assert.equal(f.calls.length,1);
 assert.deepEqual(await fs.readFile(path.join(f.runtime.store.dir(f.job.id),f.name)),f.original,'original artwork untouched');
 assert.deepEqual(await fs.readFile(path.join(f.runtime.store.dir(f.job.id),'job.json')),parentBefore,'parent record untouched by the edit');
 list=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits'+q);assert.equal(list.body.versions.length,2);assert.equal(list.body.versions[1].instruction,'Make the background light blue');
 // Selection: wrong hash and stale expected version are rejected; the exact version is accepted.
 const choose=x=>f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits/selected',{...f.unit,versionId:saved.id,expectedVersionId:'original',expectedSha256:saved.result.sha256,...x});
 assert.match((await choose({expectedSha256:'0'.repeat(64)})).body.error,/changed since you looked/);
 assert.match((await choose({expectedVersionId:saved.id})).body.error,/another window/);
 {const ok=await choose({});assert.equal(ok.status,200,JSON.stringify(ok.body));}
 const view=await f.runtime.view(f.job.id);assert.equal(view.results[0].versionId,saved.id);assert.equal(view.results[0].imageUrl,saved.result.imageUrl);assert.equal(view.results[0].ready,false);
 const served=await fetch(f.origin+saved.result.imageUrl);assert.equal(served.status,200);assert.equal(sha(Buffer.from(await served.arrayBuffer())),saved.result.sha256);
 // Downloads and packs follow the selected version (existing effective()/bundle path).
 const zip=await require('../../lib/creative-ai/runtime/campaigns').bundle(f.runtime,f.job.id);assert.ok(zip.includes(Buffer.from(saved.result.imageUrl.split('/').pop())));
 // A second edit starts from the version in use, and a stale "edits start from" is rejected.
 assert.match((await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',{...send,requestKey:'edit-request-0002',instruction:'Bigger headline'})).body.error,/another window/);
 const second=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',{...send,requestKey:'edit-request-0003',instruction:'Bigger headline',sourceVersionId:saved.id,expectedVersionId:saved.id});assert.equal(second.status,202,JSON.stringify(second.body));
 const s2=await f.done(second.body.id);assert.equal(s2.status,'finished',s2.error);assert.equal(f.calls.at(-1).attachments[0].sha256,saved.result.sha256);
 // Restore the original.
 {const back=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits/selected',{...f.unit,versionId:'original',expectedVersionId:saved.id,expectedSha256:sha(f.original)});assert.equal(back.status,200,JSON.stringify(back.body));}
 assert.equal((await f.runtime.view(f.job.id)).results[0].versionId,'original');
});
test('wrong brand, foreign versions, wrong-brand research and empty instructions are rejected before any paid request',async t=>{
 const f=await fixture(t,'Duroflex'),base='/creative-ai/api/jobs/'+f.job.id+'/ai-edits',send={...f.unit,instruction:'Warmer light',requestKey:'edit-request-0101'};
 assert.match((await f.api(base,{...send,brandId:f.other.b.id})).body.error,/another brand/);
 assert.match((await f.api(base+'?route=continuity&placementId=square&brandId='+f.other.b.id)).body.error,/another brand/);
 assert.match((await f.api(base,{...send,instruction:'   '})).body.error,/Type the change/);
 assert.match((await f.api(base,{...send,instruction:'x'.repeat(1001)})).body.error,/under 1000/);
 assert.match((await f.api(base,{...send,sourceVersionId:'creative-00000000-0000-0000-0000-000000000000'})).body.error,/./);
 await f.runtime.researchSessions.store.update(f.own.research.id,j=>{j.intake.brandId=f.other.b.id;return j;});
 assert.match((await f.api(base,send)).body.error,/Current research/);
 assert.equal(f.calls.length,0,'no image request was sent');
 assert.equal((await f.runtime.refinements.store(f.job.id).list()).filter(j=>j.status!=='failed').length,0);
});
test('a provider failure keeps the design unchanged with a plain error; an interrupted edit is closed without re-sending',async t=>{
 const f=await fixture(t,'Sleepyhead');f.runtime.provider.provider.generate=async(req,budget)=>{f.calls.push(req);await budget.reserve('image',req.requestKey);throw Error('Job time budget reached before image admission');};
 const created=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',{...f.unit,instruction:'Remove the plant',requestKey:'edit-request-0201'});const r=await f.done(created.body.id);
 assert.equal(r.status,'failed');assert.match(r.error,/design is unchanged/);assert.equal(r.costs.estimatedTotal,null,'a reserved request with no receipt is unknown, never zero');assert.ok(r.costs.unknownReceipts>=1);
 assert.equal((await f.runtime.view(f.job.id)).results[0].versionId,undefined);
 // Simulate a Studio restart mid-edit: a running child not owned by this process is closed, not re-run.
 const store=f.runtime.refinements.store(f.job.id),stuck=(await store.list()).find(j=>j.id===r.id);await store.update(stuck.id,c=>{c.status='running';c.error=null;return c;});
 const calls=f.calls.length,list=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits?route=continuity&placementId=square&brandId='+f.own.b.id);
 assert.equal(list.body.versions[1].status,'failed');assert.match(list.body.versions[1].error,/restarted/);assert.equal(f.calls.length,calls);
});
test('legacy refinements still reject lean jobs and resume skips AI edit children',async t=>{
 const f=await fixture(t,'Duroflex');await assert.rejects(()=>f.runtime.refinements.createRequest(f.job.id,{action:'visual',route:'continuity',placementId:'square',instruction:'x',requestKey:'legacy-req-01'}),/simplified artwork workflow/);
 const created=await f.api('/creative-ai/api/jobs/'+f.job.id+'/ai-edits',{...f.unit,instruction:'Brighter',requestKey:'edit-request-0301'});await f.done(created.body.id);
 const scheduled=[];f.runtime.refinements.schedule=(p,id)=>scheduled.push(id);await f.runtime.refinements.resume();assert.equal(scheduled.length,0);
});
