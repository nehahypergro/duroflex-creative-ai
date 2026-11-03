'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),K=require('../../lib/creative-ai/treatment-knowledge'),P=require('../../lib/creative-ai/runtime/placements'),M=require('../../public/creative-ai/studio-model');
function setup(brand='Duroflex',destination='Android'){
 const draft=M.startDraft(brand,'quick',14);M.applyPushPreset(draft.outputs[0],destination,'Landscape image · 2:1');
 const resolved=P.resolve(M.generationProfile(draft)),snapshot=K.capture(resolved);
 return {...resolved,snapshot,job:{selection:resolved.selections,treatmentKnowledgeVersion:1,treatmentKnowledge:snapshot}};
}
for(const brand of ['Duroflex','Sleepyhead'])for(const destination of ['Android','iPhone / iOS','Web'])test(brand+' '+destination+': push strategy excludes source-diagram labels before dispatch',async()=>{
 const s=setup(brand,destination),input=structuredClone(require('../../lib/creative-ai/marketing-strategist/examples/input.json'));
 input.assignment.productName=brand+' isolated product';input.assignment.formats=s.selections.map(p=>({id:p.id,label:p.description.name,channel:p.description.platform,specificationStatus:'supplied',constraints:[]}));
 const applied=K.apply(input,s.snapshot,s.selections);assert.deepEqual(applied.facts,input.facts);assert.deepEqual(applied.research,input.research);
 await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(applied,{reason:async req=>{
  const text=JSON.stringify(req.wire.input.assignment.assignment.formats);
  assert.match(text,/one visual idea/);assert.match(text,/Do not reproduce exploded-layer diagrams/);assert.match(text,/Physical product markings/);
  throw Error('Captured without paid dispatch');
 }},{}),/Captured without paid dispatch/);
});
test('pinned push treatment reaches composed-image generation; other formats and historical packs stay unchanged',()=>{
 const s=setup(),T=require('../../lib/creative-ai/runtime/push-image-treatment'),record={placementId:s.selections[0].id,artDirection:{logo:{assetIds:[]},composition:'Product plus original labelled cutaway'},attachmentManifest:[]},doc={canvas:{width:1024,height:512},objects:[],fonts:[]};
 const context=T.forJob(s.job,record.placementId),prompt=require('../../lib/creative-ai/runtime/composed-text').prompt(record,doc,0,context);
 assert.match(prompt,/Do not reproduce exploded-layer diagrams/);assert.match(prompt,/Physical product markings/);
 assert.equal(T.forJob({},record.placementId),null);
 const other=P.resolve({placementIds:['merchant-primary']}),otherJob={selection:other.selections,treatmentKnowledge:K.capture(other)};
 assert.equal(T.forJob(otherJob,other.selections[0].id),null);
 const old=structuredClone(s.snapshot);old.packs.find(p=>p.id==='push').version=2;const {hash,...data}=old;old.hash=require('node:crypto').createHash('sha256').update(JSON.stringify(data)).digest('hex');
 assert.equal(T.forJob({...s.job,treatmentKnowledge:old},record.placementId),null);
});
test('assembled-image review receives push reference distinction even with zero editable text',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'push-review-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const s=setup();let captured;const runtime={store:{dir:()=>dir,read:async()=>s.job,save:async()=>{}},provider:{reason:async req=>{captured=req;throw Error('Offline capture');}}};
 await require('../../lib/creative-ai/runtime/editable-quality').reviewOnce(runtime,'fixture','unit',{canvas:{width:1024,height:512},objects:[],assets:[],compositionPolicy:{version:1,reviewChecksVersion:2}},{data:'fixture',measurements:[],issues:[]},{placementId:s.selections[0].id,artDirection:{},exactCopy:{fields:[]},attachmentManifest:[],placementContext:{}},{});
 assert(captured);assert.match(captured.instructions,/Physical product markings/);assert.match(captured.instructions,/zero editable text/);assert.match(JSON.stringify(captured.input.pushImageTreatment),/Do not reproduce exploded-layer diagrams/);
 assert(!captured.schema.properties.observations.items.properties.check.enum.includes('copy-fit'));
});
