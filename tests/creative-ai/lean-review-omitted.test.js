'use strict';
// Regression (live A+ Premium run, 9 Nov 2026, job creative-aa4adc3f…): mobile pages premium-06 and
// premium-10 ended with "Agent output failed validated contract after bounded recovery: Reviewer
// omitted required checks". The saved replies returned every check except the long placement ID
// "placement-placement-logo-<page id>", whose wording repeats the "logo-omitted" check. The reply
// schema let the ID be any string, and the repair message did not say which ID was missing, so the one
// repair returned the same incomplete list and the whole page failed.
// Fix: new records (reviewCheckVersion 1) give the reviewer a schema listing the exact IDs, one item
// each; the repair names the missing IDs; a check still missing after recovery is recorded as
// unable_to_verify ("reviewer did not return this check"), never as passed. Offline only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const flow=require('../../lib/creative-ai/runtime/lean-workflow'),visual=require('../../lib/creative-ai/lean/visual-review'),policy=require('../../lib/creative-ai/runtime/lean-policy');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),{OpenAIProvider}=require('./offline-provider.cjs');
const base={apiKey:'offline',reasoningModel:'gpt-6-luna',imageModel:'gpt-image-2',maxOutputTokens:16000,maxRecoveryOutputTokens:32000,reasoningTimeoutMs:5000,maxReasoningCalls:20,jobTimeoutMs:60000};

const pageId='custom_recipe-marketplace-module-amazon-aplus-premium-06';
const requirements=[{id:'copy-0',name:'headline',expected:'3-zoned pocket spring layer'},{id:'product',name:'Product identity',expected:'Exact SKU'},{id:'campaign-copy',name:'Additional campaign wording',expected:'Only saved copy'},
 {id:'logo-omitted',name:'No added campaign logo',expected:'Omit added campaign logos; preserve authentic physical product markings.'},
 {id:'placement-placement-logo-'+pageId,name:'Placement requirement',expected:pageId+': Retain the existing brand-logo requirement. Omit every added campaign logo and reserve no logo box.'},
 {id:'layout',name:'Readable and intact content',expected:'Nothing clipped'},{id:'structure',name:'Format structure',expected:'Mobile page'}];
const check=(id,result='no_mismatch')=>({id,result,evidence:'Observed in the artwork.',location:'Whole image'});
const omitted={checks:requirements.filter(r=>!r.id.startsWith('placement-')).map(r=>check(r.id))};

async function fixture(t,brand,{pinned=true,replies}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-review-omitted-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),config=policy.configure(base,{leanWorkflowVersion:1});
 const job=await store.create({brandId:'brand-'+brand.toLowerCase(),leanWorkflowVersion:1},pinned?config:(({reviewCheckVersion,...rest})=>rest)(config),[]);
 const p=new OpenAIProvider(base),bodies=[];
 p.sendReasoning=async body=>{bodies.push(body);const out=replies[Math.min(bodies.length-1,replies.length-1)];return {ok:true,json:async()=>({id:'resp_'+bodies.length,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}],usage:{output_tokens:50}})};};
 const runtime={store,provider:p,eventQueues:new Map()};runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:['continuity'],concepts:[{id:'concept-continuity',route:'continuity'}],placements:[{id:pageId,label:'Benefit 1 mobile'}]}}});
 const record={conceptId:'concept-continuity',route:'continuity',placementId:pageId,attachments:[],reviewContract:{version:1,pageId,requirements},reviewInstructions:visual.mainInstructions,
  reviewSchema:pinned?visual.schemaFor(requirements):visual.schema,...(pinned?{reviewCheckVersion:visual.CHECK_VERSION}:{})};
 const image=await sharp({create:{width:60,height:45,channels:3,background:'#ddeeff'}}).png().toBuffer();
 return {store,job,runtime,record,image,bodies,budget:store.budget(job.id)};
}

test('the reply check names the omitted requirement ID and keeps the returned checks for an honest fallback',()=>{
 assert.throws(()=>visual.validateReport(omitted,requirements),e=>e.message.includes('placement-placement-logo-'+pageId)&&/omitted required checks/.test(e.message)&&e.reviewOmitted.missing.length===1);
 // Unknown or contradictory duplicates are never filled in.
 assert.throws(()=>visual.validateReport({checks:[...omitted.checks,check('invented')]},requirements),e=>!e.reviewOmitted);
 const filled=visual.completeOmitted(omitted,requirements);
 assert.deepEqual(filled.checks.map(c=>c.id),requirements.map(r=>r.id));
 const gap=filled.checks.find(c=>c.id.startsWith('placement-'));assert.equal(gap.result,'unable_to_verify');assert.equal(gap.reviewerOmitted,true);assert.match(gap.evidence,/did not return this check/);
 assert.equal(visual.validateReport(filled,requirements).conclusion,'unable_to_verify','never certified');
 // A duplicate with conflicting results keeps the more cautious result.
 const dup=visual.completeOmitted({checks:[...omitted.checks,{...check('layout','clear_mismatch'),evidence:'Headline clipped at right edge.'}]},requirements);
 assert.equal(dup.checks.find(c=>c.id==='layout').result,'clear_mismatch');
});

for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': new records send one check per exact requirement ID; a check still missing after recovery is unable_to_verify, not a failed page',async t=>{
  const f=await fixture(t,brand,{replies:[omitted]});
  assert.equal((await f.store.read(f.job.id)).runtimeConfig.reviewCheckVersion,1,'pinned for new lean jobs');
  const review=await flow.inspect(f.runtime,f.job.id,f.record,f.image,'lean-review-test.json',f.budget);
  assert.equal(review.status,'completed');
  const gap=review.report.checks.find(c=>c.id==='placement-placement-logo-'+pageId);
  assert.equal(gap.result,'unable_to_verify');assert.equal(gap.reviewerOmitted,true);assert.match(gap.evidence,/did not return this check/);
  assert.equal(review.report.conclusion,'unable_to_verify');assert.equal(review.report.counts.no_mismatch,requirements.length-1);
  // The schema lists the exact IDs and fixes the item count.
  const sent=f.bodies[0].text.format.schema,items=sent.properties.checks;
  assert.deepEqual([...items.items.properties.id.enum].sort(),requirements.map(r=>r.id).sort());assert.equal(items.minItems,requirements.length);assert.equal(items.maxItems,requirements.length);
  // The single repair names the missing ID.
  assert.ok(f.bodies.length>=2);assert.match(JSON.stringify(f.bodies[1].input),/placement-placement-logo-custom_recipe/);
  // Saved stage output is the honest report, so resume reuses it without another request.
  const before=f.bodies.length;await flow.inspect(f.runtime,f.job.id,f.record,f.image,'lean-review-test.json',f.budget);assert.equal(f.bodies.length,before);
 });
 test(brand+': a repair that returns the missing check is used as is; older records keep their saved schema',async t=>{
  const complete={checks:requirements.map(r=>check(r.id))};
  const f=await fixture(t,brand,{replies:[omitted,complete]});
  const review=await flow.inspect(f.runtime,f.job.id,f.record,f.image,'lean-review-test.json',f.budget);
  assert.equal(review.report.conclusion,'no_mismatch');assert.ok(review.report.checks.every(c=>!c.reviewerOmitted));
  const old=await fixture(t,brand,{pinned:false,replies:[omitted]});
  const r=await flow.inspect(old.runtime,old.job.id,old.record,old.image,'lean-review-test.json',old.budget);
  const sent=old.bodies[0].text.format.schema.properties.checks;assert.equal(sent.minItems,undefined);assert.equal(sent.items.properties.id.enum,undefined);
  assert.equal(r.report.checks.find(c=>c.id.startsWith('placement-')).result,'unable_to_verify','older records also record the gap honestly');
 });
}
