'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {format}=require('../../lib/creative-ai/experiments/lean-planner/formats');
const rules=require('../../lib/creative-ai/experiments/lean-planner/requirements');
for(const id of ['banner','push','carousel','flyer','bifold','trifold','standee','infographic'])test('Resolved logo policy: '+id,()=>{
 const f=format(id),input={format:f,requirements:rules.resolve(f)};
 const expected=id==='carousel'?[true,false,false,false,true]:f.pages.map(()=>!['banner','push'].includes(id));
 assert.deepEqual(f.pages.map(p=>rules.logoRequired(input,p.id)),expected);
 f.pages.forEach((p,i)=>assert.equal(rules.references(input,p.id,[{role:'product'},{role:'logo'}]).length,expected[i]?2:1));
 assert.ok(input.requirements.pages.every(p=>p.logo.preserveProductMarkings));
});
test('spatial fields are required only on newly pinned planning packets',()=>{
 const planning=require('../../lib/creative-ai/experiments/lean-planner/planning');
 const old=planning.schemaFor({}),current=planning.schemaFor({spatialPlanningVersion:1});
 assert(!old.properties.pages.items.required.includes('spatial'));
 assert(current.properties.pages.items.required.includes('spatial'));
 assert.equal(current.properties.pages.items.properties.spatial.required.length,9);
});
test('new comparisons pin Astra medium without changing image models',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const flow=require('../../lib/creative-ai/experiments/lean-planner');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-astra-'));
 try{const r=await flow.create(root,'Test banner','astra-settings-test','banner');assert.deepEqual(r.plannerSettings,{model:'gpt-6-astra',reasoningEffort:'medium'});assert.deepEqual(r.models.map(m=>m.quality),['high','high']);}finally{await fs.rm(root,{recursive:true,force:true});}
});
