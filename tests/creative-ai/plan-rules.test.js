'use strict';
// Error fixes 9, 11, 14 and 15 (user decision, 10 Nov 2026). Evidence:
//  - Duroflex A+ page (creative-3cc9b1fb): the technology panel and benefit 2 both used the headline
//    "3-zoned pocket spring layer" (11); the mobile technology diagram and benefit 1 ran off the edge (9).
//  - Sleepyhead LinkedIn carousel (creative-a12ec49d): the image AI added "01 / 05" (14).
//  - Duroflex Instagram carousel (creative-60078841): the swipe prompt fell outside the centred square (15).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const rules=require('../../lib/creative-ai/lean/plan-rules'),planning=require('../../lib/creative-ai/lean/planning');
const jobs=path.resolve(__dirname,'../../output/creative-ai/jobs');
function saved(job){const d=path.join(jobs,job);if(!fs.existsSync(d))return null;const f=fs.readdirSync(d).find(f=>f.startsWith('lean-input-'));const k=f.slice('lean-input-'.length);const plan=JSON.parse(fs.readFileSync(path.join(d,'lean-plan-'+k)));return {input:JSON.parse(fs.readFileSync(path.join(d,f))),plan:plan.plan||plan};}
const sel=(id,name,w,h,extra={})=>({id,description:{name,dimensions:{width:w,height:h},...extra}});
test('the composition rule names margins, no added counters, and the carousel square only for portrait carousels',()=>{
 const carousel=rules.section({},[1,2,3].map(n=>sel('c'+n,'Carousel · portrait',1080,1350,{carousel:{index:n}})));
 assert.match(carousel.rule.text,/clear margin/);assert.match(carousel.rule.text,/01 \/ 05/);assert.match(carousel.rule.text,/centred square/);assert.equal(carousel.planRules.distinctHeadlines,true);
 assert.equal(carousel.rule.id,'composition-layout','a layout rule: never sent to automatic correction');
 const single=rules.section({},[sel('p','Instagram post',1080,1080)]);assert.doesNotMatch(single.rule.text,/centred square|own headline/);assert.equal(single.planRules.distinctHeadlines,false);
 assert.equal(rules.section({displayBanners:{version:1}},[sel('a','300x250',300,250),sel('b','160x600',160,600)]).planRules.distinctHeadlines,false,'banner sizes repeat one message');
 assert.equal(rules.section({},[sel('custom:studio-pmax-landscape','PMax',1200,628),sel('custom:studio-pmax-square','PMax',1200,1200)]).planRules.distinctHeadlines,false,'PMax ratios repeat one message');
});
const aplus=saved('creative-3cc9b1fb-28eb-4eb8-a96e-481902fb3ed6');
test('Duroflex: the saved A+ plan repeating "3-zoned pocket spring layer" is caught; desktop/mobile pairs are fine',{skip:!aplus&&'saved run not available'},()=>{
 const input={...aplus.input,planRules:{version:1,distinctHeadlines:true}};
 assert.throws(()=>rules.validate(aplus.plan,input),/Repeated headline across pages: "3-zoned pocket spring layer"/);
 const fixed=structuredClone(aplus.plan);for(const id of ['07','08'])fixed.pages.find(p=>p.id.endsWith('-'+id)).copy.find(c=>c.role==='headline').text='Support that stays even';
 assert.doesNotThrow(()=>rules.validate(fixed,input),'each A+ unit reuses its own desktop words on mobile');
 assert.doesNotThrow(()=>rules.validate(aplus.plan,aplus.input),'earlier records without the pin are not checked');
});
const linkedin=saved('creative-a12ec49d-3d88-44f9-8eb6-fa732f858e2c');
test('Sleepyhead: a carousel with a repeated headline is caught; the saved carousel is otherwise fine',{skip:!linkedin&&'saved run not available'},()=>{
 const input={...linkedin.input,planRules:{version:1,distinctHeadlines:true}};
 assert.doesNotThrow(()=>rules.validate(linkedin.plan,input));
 const repeated=structuredClone(linkedin.plan),heads=repeated.pages.map(p=>p.copy.find(c=>/head|title/i.test(c.role)&&!/product|name/i.test(c.role))).filter(Boolean);
 heads[1].text=heads[0].text;assert.throws(()=>rules.validate(repeated,input),/Repeated headline/);
});
test('the planning check runs inside validatePlan for pinned plans',{skip:!aplus&&'saved run not available'},()=>{
 assert.throws(()=>planning.validatePlan(structuredClone(aplus.plan),{...aplus.input,planRules:{version:1,distinctHeadlines:true}}),/Repeated headline/);
});
// Live run, 10 Nov 2026 (Sleepyhead marketplace images, creative-787391e8): on an image that deliberately has
// no added logo, the brand rule "authentic Sleepyhead logo artwork" was flagged because no logo was visible.
// On no-logo pages a brand logo rule now judges only a logo that appears. Both brands' saved runs.
const visual=require('../../lib/creative-ai/lean/visual-review'),requirements=require('../../lib/creative-ai/lean/requirements');
for(const [brand,job] of [['Sleepyhead','creative-787391e8-41a6-4db0-839a-1df517052d85'],['Duroflex','creative-3cc9b1fb-28eb-4eb8-a96e-481902fb3ed6']]){
 const run=saved(job);
 test(brand+': brand logo rules on a no-logo page do not demand a logo',{skip:!run&&'saved run not available'},()=>{
  let checked=0;const input=structuredClone(run.input);input.brand.mandatory=[...(input.brand.mandatory||[]),{id:'req-logo-test',text:'Use authentic '+brand+' logo artwork only.',sourceIds:[]}];
  for(const page of run.plan.pages){const c=visual.contract(input,run.plan,page.id),logoRules=c.requirements.filter(r=>r.id.startsWith('brand-')&&/\blogo/i.test(r.expected));
   for(const r of logoRules){checked++;if(requirements.logoRequired(input,page.id))assert.doesNotMatch(r.expected,/deliberately has no added brand logo/);else assert.match(r.expected,/a missing added logo is not a mismatch/);}}
  assert.ok(checked>0,'the saved run has brand logo rules');
 });
}
// Live rerun, 10 Nov 2026 (Duroflex Wave Kinect 12-image PDP, creative-9fa5b18f): the plan passed but 10 pages
// stopped with "Visual-review contract is too large" because the layout-advisory note (~700 characters) was
// added to every placement rule, including rules with no size or position. The note now goes only on rules that
// state sizes or positions, and the contract has a little more headroom. Both brands' saved runs.
for(const [brand,job] of [['Duroflex','creative-9fa5b18f-2c9e-427a-bad3-8298622ad258'],['Sleepyhead','creative-e933d782-cdc6-4e42-9cf0-197e8ecbd59e']]){
 const run=saved(job);
 test(brand+': every page\'s review checklist fits with all new checks on',{skip:!run&&'saved run not available'},()=>{
  for(const p of run.plan.pages){const c=visual.contract(run.input,run.plan,p.id,{conformance:1,realism:true,layoutCheck:true,skuCheck:{productAngles:3,label:{status:'found'}}});
   assert.ok(JSON.stringify(c).length<=30000,p.id);
   for(const r of c.requirements.filter(r=>r.id.startsWith('placement-')))if(!/\d|%|position|size|margin|edge|crop|left|right|top|bottom|cent(re|er)|corner|safe|area|space|layout/i.test(r.expected.split(' Sizes, positions and percentages')[0]))assert.doesNotMatch(r.expected,/Sizes, positions and percentages stated here are approximate/,r.id);}
 });
}
