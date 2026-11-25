'use strict';
// Regression (25 Nov 2026, local variety batch: the Sleepyhead Napster sofa-cum-bed Instagram post, creative-d35a51e2, failed
// planning). The planner wrote the backdrop "… a warm peach wall … Keep large background surfaces free of light blue and light
// green." The client colour check treated "free of light blue" as a light blue backdrop and refused the plan, and the repair
// kept the same sentence. Negated mentions ("free of", "clear of", "except", "other than", "do not" …) now do not count;
// a real light blue or green backdrop still fails, and the error asks the planner to leave avoided colours out. Both brands;
// fails before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cd=require('../../lib/creative-ai/lean/creative-direction');
const {fixture,square}=require('./lean-marketing-fixture');
const root=path.resolve(__dirname,'../..');
const IDS={Duroflex:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',Sleepyhead:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'};
const raw=brand=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS[brand],'creative-direction.json'),'utf8'));
const pinned=brand=>brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:{...raw(brand),brandId},range:null,at:'2026-11-25T00:00:00.000Z'});
const LIVE='A newly composed, bright lived-in room with a warm peach wall and natural warm wood floor. Keep large background surfaces free of light blue and light green.';
const room=(backdrop,n)=>(input,p)=>({scene:{type:'room',backdrop,elements:['an orange floor lamp','a framed abstract print','a chunky rug','a potted plant','a stack of books','a ceramic vase'].slice(0,n)}});

for(const brand of ['Duroflex','Sleepyhead']){
 const words=raw(brand).avoidColours.words;
 test(brand+': negated mentions of an avoided colour are not that colour',()=>{
  for(const t of [LIVE,'Warm sand wall, clear of light blue.','Terracotta plaster, nothing other than warm tones, no mint.','Ochre wall; do not use light green.','A cream wall except for any pale blue.'])assert.equal(cd.avoidedColour(t,words),null,t);
  for(const [t,w] of [['A pale blue wall with oak shelves.','pale blue'],['A sage wall rather than ivory.','sage'],['Use light green, not white.','light green']])assert.equal(cd.avoidedColour(t,words),w,t);
 });
 test(brand+': the live Napster backdrop plans; a real light blue backdrop still fails and says how to fix it',async t=>{
  const n=raw(brand).props.min;
  const ok=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand),pageExtra:room(LIVE,n)});assert.equal(ok.planError,null);
  const blue=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand),pageExtra:room('A powder blue wall with a warm oak floor.',n)});
  assert.match(String(blue.planError?.message),/the backdrop may not be powder blue \(client colour rule\); choose another colour, and describe only the colours the backdrop has/);
 });
}
