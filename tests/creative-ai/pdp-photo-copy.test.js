'use strict';
// Live run, 10 Nov 2026 (Duroflex Wave Kinect, Product Page Images, job creative-3634d276): planning failed
// with "Empty copy" because the planner rightly left the four photo slots (Product hero, Alternate angle,
// Surface and edge detail, Product in context) without words, and the check demanded words on every slot.
// User decision ("evaluate if text is most needed"): product photos do not need on-image words, so those four
// slots may have no copy; every information slot still needs its words. Shared by both brands.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const planning=require('../../lib/creative-ai/lean/planning');
const dir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-3634d276-f689-4951-890b-1c76af307a7b');
const saved=fs.existsSync(dir)?{input:JSON.parse(fs.readFileSync(path.join(dir,'lean-input-1d7a05733d0b12f4e8d4.json'))),plan:JSON.parse(fs.readFileSync(path.join(dir,'invalid-55bd438b87afd6da5b3b90d5fb75882a03f6ef1b57ac265565004d2d414d4148.json'))).output}:null;
test('saved Wave Kinect PDP plan: photo slots may have no words; information slots still need them',{skip:!saved&&'saved run not available on this machine'},()=>{
 // The saved plan also skipped some placement-rule decisions (a separate slip the bounded repair reports);
 // fill those so this test checks only the photo-copy rule.
 const complete=p=>{const rules=[...saved.input.brand.mandatory,...saved.input.format.guidance.mandatory,...saved.input.brand.preferences];for(const r of rules)if(!p.guidanceDecisions.some(d=>d.id===r.id))p.guidanceDecisions.push({id:r.id,decision:'apply',reason:'Applied as specified.'});return p;};
 const plan=complete(structuredClone(saved.plan));
 assert.doesNotThrow(()=>planning.validatePlan(plan,saved.input));
 const missing=complete(structuredClone(saved.plan));missing.pages.find(p=>p.id.endsWith('slot-05')).copy=[];
 assert.throws(()=>planning.validatePlan(missing,saved.input),/Empty copy/,'the firmness slot still needs its words');
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': only the four PDP photo roles are copy-optional',()=>{
 assert.deepEqual([...planning.photoCopyOptional].sort(),['alternate-angle','detail','hero','lifestyle']);
});
// Marketplace set (10 Nov 2026): pages whose text policy is "optional" (lifestyle, surface detail) may carry
// no words; their image brief then asks for no added text, and the review expects none.
test('an optional-text page may have no copy, and is then briefed and reviewed as image-only',{skip:!saved&&'saved run not available on this machine'},()=>{
 const input=structuredClone(saved.input),plan=structuredClone(saved.plan);
 const complete=p=>{const rules=[...input.brand.mandatory,...input.format.guidance.mandatory,...input.brand.preferences];for(const r of rules)if(!p.guidanceDecisions.some(d=>d.id===r.id))p.guidanceDecisions.push({id:r.id,decision:'apply',reason:'Applied as specified.'});return p;};complete(plan);
 const page=plan.pages.find(p=>p.id.endsWith('slot-05'));page.copy=[];input.format.pages.find(p=>p.id===page.id).text='optional';
 assert.doesNotThrow(()=>planning.validatePlan(plan,input));
 assert.match(planning.imagePrompt(plan,input,page),/No added campaign text/);
 const contract=require('../../lib/creative-ai/lean/visual-review').contract(input,plan,page.id);assert.match(contract.requirements.find(r=>r.id==='campaign-copy').expected,/^No added campaign lettering/);
});
// Live runs, 10 Nov 2026: plans failed after the bounded repair only because the planner skipped the written
// "decision" for a Studio process rule (Sleepyhead blog preview creative-05389699: client-brief-source-authority;
// Duroflex Wave Kinect PDP: placement canvas/file/layout/readability/logo-policy rules). Process rules and
// placement rules are always applied (the review still checks the placement rules), so a missing decision for
// them is filled as "apply" and marked automatic. Brand requirements, preferences and the objective playbook
// still need the planner's own decision.
const blogDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-05389699-6b52-4f2b-8a11-7e2bc1627e22');
const blog=fs.existsSync(blogDir)?(()=>{const files=fs.readdirSync(blogDir);return {input:JSON.parse(fs.readFileSync(path.join(blogDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(blogDir,files.find(f=>f.startsWith('invalid-'))))).output};})():null;
test('Sleepyhead: a skipped process-rule decision is filled, a skipped brand-rule decision still fails',{skip:!blog&&'saved run not available'},()=>{
 const plan=structuredClone(blog.plan);assert.doesNotThrow(()=>planning.validatePlan(plan,blog.input));
 const filled=plan.guidanceDecisions.find(d=>d.id==='client-brief-source-authority');assert.equal(filled.decision,'apply');assert.match(filled.reason,/^Applied automatically/);assert.deepEqual(Object.keys(filled).sort(),['decision','id','reason'],'only schema fields (10 Nov live run: an extra field failed the plan schema)');
 const brand=structuredClone(blog.plan);brand.guidanceDecisions=brand.guidanceDecisions.filter(d=>d.id!=='req-logo-integrity');assert.throws(()=>planning.validatePlan(brand,blog.input),/req-logo-integrity/);
});
test('Duroflex: the saved Wave Kinect PDP plan passes without hand-filled placement decisions',{skip:!saved&&'saved run not available on this machine'},()=>{
 assert.doesNotThrow(()=>planning.validatePlan(structuredClone(saved.plan),saved.input));
});
// Live rerun, 10 Nov 2026 (Duroflex Wave Kinect PDP, creative-af91fe41): the planner chose "adapt" for
// pdp-original-website-technology, which that rule itself allows ("when unavailable, choose a supported exterior
// product view ... instead"), and the plan failed with "Mandatory rule cannot be omitted". Adapt is allowed for
// that rule; "not-applicable" for any mandatory rule still fails.
const kinectDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-af91fe41-e30e-4329-b286-a4126881a616');
const kinect=fs.existsSync(kinectDir)?(()=>{const files=fs.readdirSync(kinectDir);return {input:JSON.parse(fs.readFileSync(path.join(kinectDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(kinectDir,files.find(f=>f.startsWith('invalid-'))))).output};})():null;
test('Duroflex: a PDP plan may adapt the optional original-technology rule, never drop it',{skip:!kinect&&'saved run not available'},()=>{
 assert.doesNotThrow(()=>planning.validatePlan(structuredClone(kinect.plan),kinect.input));
 const dropped=structuredClone(kinect.plan);dropped.guidanceDecisions.find(d=>d.id==='pdp-original-website-technology').decision='not-applicable';
 assert.throws(()=>planning.validatePlan(dropped,kinect.input),/Mandatory rule cannot be omitted: pdp-original-website-technology/);
});
// Live rerun, 10 Nov 2026 (Duroflex Wave Kinect PDP, creative-33e0fc39): the planner skipped another format
// rule's decision (pdp-evidence-fit), a different one each run. Every format-guidance rule is always applied, so
// a missing decision for any of them is filled; brand requirements and preferences still need the planner.
const evidenceDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-33e0fc39-1ab8-421c-8994-dc58c342eadd');
const evidence=fs.existsSync(evidenceDir)?(()=>{const files=fs.readdirSync(evidenceDir);return {input:JSON.parse(fs.readFileSync(path.join(evidenceDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(evidenceDir,files.filter(f=>f.startsWith('invalid-')).sort().at(-1)))).output};})():null;
test('Duroflex: any skipped format-rule decision is filled; brand rules are not',{skip:!evidence&&'saved run not available'},()=>{
 const plan=structuredClone(evidence.plan);assert.doesNotThrow(()=>planning.validatePlan(plan,evidence.input));
 assert.match(plan.guidanceDecisions.find(d=>d.id==='pdp-evidence-fit').reason,/^Applied automatically/);
 const brandRule=evidence.input.brand.mandatory.find(r=>!['req-source-precedence','current-source-acceptance'].includes(r.id));
 if(brandRule){const missing=structuredClone(evidence.plan);missing.guidanceDecisions=missing.guidanceDecisions.filter(d=>d.id!==brandRule.id);assert.throws(()=>planning.validatePlan(missing,evidence.input),new RegExp(brandRule.id));}
});
