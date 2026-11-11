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
// Live batch, 10 Nov 2026 (Sleepyhead Sofa Drip Pro brochure, creative-6cfc75af): after the bounded repair the plan
// had all 28 other decisions but no written note for objective-playbook, and the whole job failed. The playbook is
// planning-only guidance the planner already had; nothing downstream reads the note. A missing note is filled as
// "apply" with an honest reason; brand requirements and preferences still need the planner's own decision.
const brochureDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-6cfc75af-c61a-4831-aa15-ed565113fad7');
const brochure=fs.existsSync(brochureDir)?(()=>{const files=fs.readdirSync(brochureDir);return {input:JSON.parse(fs.readFileSync(path.join(brochureDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(brochureDir,files.find(f=>f.startsWith('invalid-'))))).output};})():null;
test('Sleepyhead: the saved brochure plan with no objective-playbook note now passes, marked automatic',{skip:!brochure&&'saved run not available'},()=>{
 const plan=structuredClone(brochure.plan);assert.doesNotThrow(()=>planning.validatePlan(plan,brochure.input));
 const filled=plan.guidanceDecisions.find(d=>d.id==='objective-playbook');assert.equal(filled.decision,'apply');assert.match(filled.reason,/^Applied automatically: the planner did not write a note/);
});
test('Duroflex: a missing objective-playbook note is filled; a missing brand-rule decision still fails',{skip:!evidence&&'saved run not available'},()=>{
 assert.ok(evidence.input.format.guidance.mandatory.some(r=>r.id==='objective-playbook')||evidence.input.brand.mandatory.some(r=>r.id==='objective-playbook'),'the saved plan carries the playbook rule');
 const plan=structuredClone(evidence.plan);plan.guidanceDecisions=plan.guidanceDecisions.filter(d=>d.id!=='objective-playbook');assert.doesNotThrow(()=>planning.validatePlan(plan,evidence.input));
 assert.match(plan.guidanceDecisions.find(d=>d.id==='objective-playbook').reason,/^Applied automatically: the planner did not write a note/);
});
// Live batch, 10 Nov 2026 (Sleepyhead Sofa Drip Pro brochure retry, creative-ed731707): "Planner output is too
// verbose". The plan's words were ordinary (two pages, 12,629 characters), but the size check also counted the ~30
// rule decisions (IDs and one-word decisions, 5,967 characters) and the new set rules. The check now measures the
// planner's own writing; decisions are not counted and a set's shared rules get their own allowance.
const verboseDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-ed731707-ffc7-4ac6-95ec-33eb8c25bbe9');
const verbose=fs.existsSync(verboseDir)?(()=>{const files=fs.readdirSync(verboseDir);return {input:JSON.parse(fs.readFileSync(path.join(verboseDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(verboseDir,files.find(f=>f.startsWith('invalid-'))))).output};})():null;
test('Sleepyhead: the saved brochure plan is not rejected as too verbose; a truly long plan still is',{skip:!verbose&&'saved run not available'},()=>{
 assert.doesNotThrow(()=>planning.validatePlan(structuredClone(verbose.plan),verbose.input));
 const long=structuredClone(verbose.plan);long.pages[0].artDirection='x '.repeat(9000);assert.throws(()=>planning.validatePlan(long,verbose.input),/too verbose/);
});
test('Duroflex: a long list of rule decisions alone never makes a plan too verbose',{skip:!evidence&&'saved run not available'},()=>{
 const plan=structuredClone(evidence.plan),input=structuredClone(evidence.input);
 for(let i=0;i<1000;i++){const id='custom:extra-'+i+'-layout';input.format.guidance.mandatory.push({id,tier:'contract',text:'Extra placement rule '+i,sourceIds:[]});plan.guidanceDecisions.push({id,decision:'apply',reason:'Applies'});}
 assert.doesNotThrow(()=>planning.validatePlan(plan,input));
});
// Live batch, 10 Nov 2026 (Sleepyhead Sofa Drip Pro LinkedIn square, creative-abfe8859): the planner chose "adapt" for
// the brand typeface rule ("use the supplied Source Sans Pro files; do not claim Migrena Grotesque") and the whole job
// failed as "Mandatory rule cannot be omitted". Adapting is not omitting: brand and format rules still reach the image
// brief and the check whatever the decision says. Any mandatory rule may be adapted with a written reason;
// "not-applicable" still fails.
const typeDir=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-abfe8859-d28a-4c19-ab71-992c6e9252ee');
const typeRun=fs.existsSync(typeDir)?(()=>{const files=fs.readdirSync(typeDir);return {input:JSON.parse(fs.readFileSync(path.join(typeDir,files.find(f=>f.startsWith('lean-input-'))))),plan:JSON.parse(fs.readFileSync(path.join(typeDir,files.filter(f=>f.startsWith('invalid-')).sort().at(-1)))).output};})():null;
test('Sleepyhead: an adapted brand typeface rule is recorded as apply with the planner\'s note, still reaches the brief and the check; not-applicable fails',{skip:!typeRun&&'saved run not available'},()=>{
 const plan=structuredClone(typeRun.plan);assert.doesNotThrow(()=>planning.validatePlan(plan,typeRun.input));
 const d=plan.guidanceDecisions.find(x=>x.id==='req-typeface');assert.equal(d.decision,'apply','never downgraded');assert.match(d.reason,/^Adapted by the planner: Use supplied Source Sans Pro/);
 const page=plan.pages[0],rule=typeRun.input.brand.mandatory.find(r=>r.id==='req-typeface');
 assert.ok(planning.imagePrompt(plan,typeRun.input,page).includes(rule.text),'the rule still reaches the image brief');
 assert.ok(require('../../lib/creative-ai/lean/visual-review').contract(typeRun.input,plan,page.id).requirements.some(r=>r.id==='brand-req-typeface'),'and the check');
 const dropped=structuredClone(typeRun.plan);dropped.guidanceDecisions.find(d=>d.id==='req-typeface').decision='not-applicable';assert.throws(()=>planning.validatePlan(dropped,typeRun.input),/Mandatory rule cannot be omitted: req-typeface/);
});
test('Duroflex: a mandatory brand rule adapted with a reason is recorded as apply; without a reason it fails',{skip:!evidence&&'saved run not available'},()=>{
 const rule=evidence.input.brand.mandatory.find(r=>!['req-source-precedence','current-source-acceptance'].includes(r.id));
 const plan=structuredClone(evidence.plan);plan.guidanceDecisions.find(d=>d.id===rule.id).decision='adapt';assert.doesNotThrow(()=>planning.validatePlan(plan,evidence.input));assert.equal(plan.guidanceDecisions.find(d=>d.id===rule.id).decision,'apply');
 const blank=structuredClone(evidence.plan);Object.assign(blank.guidanceDecisions.find(d=>d.id===rule.id),{decision:'adapt',reason:' '});assert.throws(()=>planning.validatePlan(blank,evidence.input));
});
