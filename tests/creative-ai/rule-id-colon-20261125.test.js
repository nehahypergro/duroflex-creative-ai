'use strict';
// Regression (25 Nov 2026, paid local Duroflex A3 sale poster, job creative-9e7f90a7…): a print page's ID is written with an
// underscore ("custom_studio-print-poster-a3-page-01") while its automatic canvas, file and layout rules keep a colon
// ("custom:studio-print-poster-a3-page-01-canvas"). The planner wrote those three decisions with the page's underscore, its one
// repair did the same, and planning failed with "Invalid guidance decision IDs; not rule IDs: custom_studio-print-poster-a3-
// page-01-canvas, …" before any picture. A decision that matches exactly one rule ID once ":" and "_" are treated alike is now
// filed under the rule's own ID; other unknown IDs still fail. Both brands; fails before the fix; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./lean-marketing-fixture');
const PAGE='custom_studio-print-poster-a3-page-01';
const page={id:PAGE,description:{name:'Poster / Flyer · A3',formatId:'custom:studio-print-poster-a3',dimensions:{width:1687,height:2372}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}};
const rules=['canvas','file','layout'].map(k=>({id:'custom:studio-print-poster-a3-page-01-'+k,tier:'mandatory',text:'Poster '+k+' requirement.'}));
const treatment={placements:[{placementId:PAGE,rules,treatmentIds:[]}],packs:[],limits:null};
const underscore=out=>{for(const d of out.guidanceDecisions)if(d.id.startsWith('custom:'))d.id=d.id.replace(':','_');};
const decisions=f=>JSON.parse(require('node:fs').readFileSync(require('node:path').join(f.dir,require('node:fs').readdirSync(f.dir).find(n=>/^lean-plan-.*\.json$/.test(n))),'utf8')).guidanceDecisions.map(d=>d.id);

for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': rule decisions written with the page\'s underscore are filed under the rule\'s own ID',async t=>{
  const f=await fixture(t,{brand,selection:[page],treatment,planEdit:underscore});
  assert.equal(f.planError,null,'the plan is accepted');
  const ids=decisions(f);for(const r of rules)assert.ok(ids.includes(r.id),r.id+' is recorded under its own ID');
  assert.ok(!ids.some(id=>id.startsWith('custom_studio-print-poster-a3-page-01-')),'no underscore copy is kept');
 });
 test(brand+': both spellings of one rule keep the exact one; an unknown ID still fails',async t=>{
  const both=await fixture(t,{brand,selection:[page],treatment,planEdit:out=>out.guidanceDecisions.push({id:rules[0].id.replace(':','_'),decision:'apply',reason:'Duplicate'})});
  assert.equal(both.planError,null);assert.equal(decisions(both).filter(id=>id===rules[0].id).length,1);
  const unknown=await fixture(t,{brand,selection:[page],treatment,planEdit:out=>out.guidanceDecisions.push({id:'custom_studio-print-poster-a3-page-01-bleed',decision:'apply',reason:'Invented'})});
  assert.match(String(unknown.planError?.message),/Invalid guidance decision IDs; not rule IDs: custom_studio-print-poster-a3-page-01-bleed/);
 });
}
