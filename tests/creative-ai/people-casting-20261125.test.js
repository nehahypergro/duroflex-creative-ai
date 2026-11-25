'use strict';
// Regression (25 Nov 2026, Neha: "the models (people) need to be indian. not any other ethnicity", after the local sofa sale
// banners: the Sleepyhead Sofa Kiki banner, creative-1135f0ff, was Ready with a woman who does not clearly read as Indian).
// Before, nothing in the planner input, the image brief or the check said who the people are, so casting was left to the
// image model. Each brand's own creative-direction.json now has a "cast" line; new jobs pin it with the rest of the
// direction (an earlier snapshot has none and keeps its contract). The planner is told to cast every person that way, the
// image brief's PEOPLE line carries it, and the check asks "People cast as briefed" (people-casting), a layout finding, so a
// clear miss gets the page's one redraw. "Did it deliver?" shows it under Brand look. Both brands; fails before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cd=require('../../lib/creative-ai/lean/creative-direction');
const {fixture,square}=require('./lean-marketing-fixture');
const root=path.resolve(__dirname,'../..');
const IDS={Duroflex:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',Sleepyhead:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'};
const raw=brand=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS[brand],'creative-direction.json'),'utf8'));
const pinned=(brand,edit=d=>d)=>brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:edit({...raw(brand),brandId}),range:null,at:'2026-11-25T00:00:00.000Z'});
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),reviews=f=>f.calls.filter(c=>c.kind==='lean-review'),images=f=>f.calls.filter(c=>c.kind==='image');
const casting=c=>(c.input.requirements||[]).find(r=>r.id==='people-casting');
const MISS='The woman on the sofa clearly does not look Indian; her features read as clearly East African.';

test('each brand\'s own direction file casts every person as Indian, in its own words',async()=>{
 const d=raw('Duroflex'),s=raw('Sleepyhead');
 for(const x of [d,s]){assert.match(x.cast,/Every person is Indian/);assert.match(x.cast,/Never people of another ethnicity/);}
 assert.notEqual(d.cast,s.cast,'each brand keeps its own wording');assert.match(s.cast,/young Indian women and men/);
 for(const [brand,id] of Object.entries(IDS)){const l=await cd.load(root,id);assert.equal(l.direction.cast,raw(brand).cast);}
 assert.throws(()=>cd.validateFile({...d,cast:'x'.repeat(401)},IDS.Duroflex),/cast is one line/);
});
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': the planner, the image brief and the check all carry the brand\'s cast line',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand)});assert.equal(f.planError,null);await f.run();
  const input=planning(f).input.creativeDirection,cast=raw(brand).cast;
  assert.equal(input.brief.cast,cast);assert.match(input.rule,/brief\.cast \(every person, every page\)/);
  assert.ok(images(f)[0].prompt.includes('PEOPLE (only if the plan shows people): '+cast),'the image brief\'s PEOPLE line starts with the cast');
  const check=casting(reviews(f)[0]);assert.ok(check,'the check asks People cast as briefed');assert.ok(check.expected.startsWith(cast));
  assert.match(check.expected,/No person in the image: no_mismatch/);assert.match(check.expected,/unable_to_verify/);
 });
 test(brand+': a person clearly cast otherwise gets the one redraw with the finding described',async t=>{
  const flag=out=>{const c=out.checks.find(x=>x.id==='people-casting');if(c&&!flag.done){flag.done=true;c.result='clear_mismatch';c.evidence=MISS;}};
  const f=await fixture(t,{brand,direction:pinned(brand),reviewEdit:flag});await f.run();
  assert.equal(images(f).length,2,'the original and one redraw');assert.ok(images(f)[1].prompt.includes(MISS));
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'a person is not sent to a local repaint');
  assert.equal((await f.read()).results[0].correction.action,'redraw');
 });
 test(brand+': a direction pinned before the cast line keeps its planner input and check',async t=>{
  const f=await fixture(t,{brand,direction:pinned(brand,d=>{delete d.cast;return d;})});await f.run();
  assert.equal(planning(f).input.creativeDirection.brief.cast,undefined);assert.equal(casting(reviews(f)[0]),undefined);
  assert.doesNotMatch(images(f)[0].prompt,/Every person is Indian/);
 });
}
test('"Did it deliver?" shows casting under Brand look',()=>{
 const M=require('../../public/creative-ai/studio-model');
 const rows=M.deliveryRows([{id:'background-colour',result:'no_mismatch'},{id:'scene-type',result:'no_mismatch'},{id:'people-casting',result:'clear_mismatch',evidence:MISS}]);
 assert.deepEqual(rows.map(r=>[r.name,r.state]),[['Brand look','check']]);
});
