'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model');
function memory(){const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}
test('UI scope: all 42 features map to shared groups and real conditional fields',()=>{
 assert.deepEqual(M.features.map(f=>f.id),Array.from({length:42},(_,i)=>i+1));
 for(const f of M.features){assert.ok(M.groups.some(g=>g.id===f.group));for(const field of f.fields)assert.ok(M.fields[field]||field==='slides');assert.equal(M.output(f.id).featureId,f.id);}
 assert.equal(M.groups.length,6);
});
test('UI creative defaults preserve brief-led people lighting and setting',()=>{
 const d=M.newDraft('A');for(const k of ['people','lighting','setting'])assert.equal(d[k],'Decide from the brief');assert.equal(d.audience,'');
});
test('UI multiple drafts, Unicode and unknown draft metadata survive without cross-brand leakage',()=>{
 const s=M.storage(memory()),d=M.newDraft('A');d.name='दिवाली & "home" <test>';d.extra={future:'retained'};d.outputs=[M.output(8)];const a=s.save(d),b=s.save(M.newDraft('A')),c=s.save(M.newDraft('B'));
 assert.notEqual(a.id,b.id);assert.equal(s.list('A').drafts.length,2);assert.equal(s.list('B').drafts.length,1);assert.equal(s.read('B',a.id),null);assert.deepEqual(s.read('A',a.id).extra,d.extra);assert.equal(s.read('A',a.id).name,d.name);assert.equal(c.brandId,'B');
});
test('UI stale-tab saves reject without overwriting newer content',()=>{
 const s=M.storage(memory()),d=s.save(M.newDraft('A')),stale=M.clone(d);d.name='Newer';s.save(d);stale.name='Older';assert.throws(()=>s.save(stale),/another tab/);assert.equal(s.read('A',d.id).name,'Newer');
});
test('UI storage errors and corrupt drafts are explicit and do not delete records',()=>{
 const m=memory(),s=M.storage(m),d=M.newDraft('A');m.setItem(s.key('A',d.id),'{corrupt');assert.equal(s.list('A').errors.length,1);assert.equal(m.getItem(s.key('A',d.id)),'{corrupt');const blocked=M.storage({...memory(),setItem(){throw Error('Quota exceeded');}});assert.throws(()=>blocked.save(M.newDraft('A')),/Quota/);
});
test('UI validation catches invalid dimensions, counts, dates and empty deliverables',()=>{
 const d=M.newDraft('A');assert.ok(M.validate(d).outputs);d.name='Test';d.brief='A brand story';d.focus='brand';d.outputs=[M.output(9)];assert.deepEqual(M.validate(d),{});
 for(const bad of [0,-1,NaN,Infinity,1.2,9000]){d.outputs[0].width=bad;assert.ok(M.validate(d)['output-'+d.outputs[0].id]);}d.outputs[0].width=1080;d.outputs[0].slides=13;assert.ok(M.validate(d)['output-'+d.outputs[0].id]);d.outputs[0].slides=5;d.details={offerStart:'2026-10-20',offerEnd:'2026-10-19'};assert.ok(M.validate(d).offerEnd);
});
test('UI output field selection is driven by feature contracts rather than every possible input',()=>{
 const d=M.newDraft('A');d.outputs=[M.output(8)];assert.deepEqual(M.requiredDetails(d),[]);d.outputs.push(M.output(3),M.output(22));assert.deepEqual(M.requiredDetails(d),['offer','store','audio']);
});
test('UI saved-job mapping retains review uncertainty and validates brand and image references',()=>{
 const j={id:'J',brandId:'A',status:'finished',concepts:[{route:'continuity',name:'Diwali at home'}],results:[{imageUrl:'/creative-ai/api/jobs/J/files/static-a.png',ready:false}]};const p=M.normalizeJob(j,'A');assert.equal(p.name,'Diwali at home');assert.equal(M.status(p).label,'Check before using · 1 of 1 flagged');assert.equal(M.status(p).tone,'amber');assert.equal(p.results[0].ready,false);// 9 Nov 2026: Ready needs every design readyassert.throws(()=>M.normalizeJob(j,'B'),/different brand/);for(const url of ['javascript:alert(1)','//evil.test/a','/creative-ai/api/jobs/../secrets','https://evil.test/a'])assert.equal(M.safeAsset(url),'');
});
test('UI theme primary and state text colours meet normal-text AA contrast',()=>{
 function lum(hex){const v=hex.match(/\w\w/g).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];}
 for(const [fg,bg] of [['4d38f5','ffffff'],['626b85','f7f9fd'],['87510a','fff0d7'],['216540','e4f3e9'],['245d9f','e7effc'],['a4253c','fce8ec']]){const a=lum(fg),b=lum(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg);}
});

test('Journey catalogue covers named recovery states and has unique, complete user stories',()=>{
 assert.equal(new Set(M.journeys.map(j=>j.id)).size,M.journeys.length);assert.ok(M.journeys.length>=40);
 for(const j of M.journeys){for(const key of ['id','group','title','screen','state','message','story'])assert.ok(j[key],j.id+' '+key);}
 assert.ok(M.journeys.every(j=>!['versions','video','writing','handoff'].includes(j.screen)));
 for(const id of ['draft-conflict','editor-asset-missing','download-failed','wrong-brand','usage-unavailable'])assert.ok(M.journeys.some(j=>j.id===id));
});
test('Review scores require eligible evidence; missing data never becomes a rating',()=>{
 const score={criterion:'communication',score:86,usedInScore:true,evidence:{method:'vision',observation:'Headline readable.'}};
 assert.equal(M.reviewSummary({review:{qualityScores:[score]}}).scores[0].score,4.3);
 for(const patch of [{usedInScore:false},{score:101},{evidence:{observation:'No method'}},{evidence:{method:'synthetic-simulation',observation:'Fixture'}},{evidence:{method:'unavailable',observation:'Unknown'}}])assert.equal(M.reviewSummary({review:{qualityScores:[{...score,...patch}]}}).scores[0].score,null);
 assert.ok(M.reviewSummary().scores.every(s=>s.score===null));assert.ok(M.reviewSummary().decisions.every(d=>!d.recorded));
});
test('Review notes belong to the exact artwork option and revision',()=>{
 const p={id:'job'},item={id:'square'},r={route:'continuity',imageUrl:'/one.png'};const key=M.feedbackKey(p,item,r);
 for(const patch of [{route:'exploration'},{versionId:'v2'},{imageUrl:'/two.png'},{imageHash:'different'}])assert.notEqual(M.feedbackKey(p,item,{...r,...patch}),key);
});

test('Organisation: scoped favourites, metadata, recoverable trash and stale-write safety',()=>{
 const disk=memory(),o=M.organization(disk);let a=o.read('duroflex'),b=o.read('sleepyhead');a=o.update(a,'project:one',{favourite:true,name:'Diwali <A&B>',campaign:'Festive',tags:['sofa','sofa',' नमस्ते ']});assert.deepEqual(a.entries['project:one'].tags,['sofa','नमस्ते']);assert.deepEqual(b.entries,{});
 const stale=M.clone(a);a=o.update(a,'project:one',{trashedAt:'2026-10-20T12:00:00Z'});a=o.update(a,'creative:one',{trashedAt:'2026-10-20T12:00:00Z'});a=o.update(a,'project:one',{trashedAt:null});assert.ok(a.entries['creative:one'].trashedAt,'Restoring parent does not restore explicitly deleted child');assert.equal(a.entries['project:one'].favourite,true);assert.throws(()=>o.update(stale,'project:one',{name:'Overwrite'}),/another tab/);assert.equal(o.read('duroflex').entries['project:one'].name,'Diwali <A&B>');assert.throws(()=>o.update(a,'project:one',{approval:true}),/Unsupported/);assert.throws(()=>o.update(a,'project:one',{name:''}),/Enter a name/);
 const raw=disk.getItem(o.key('duroflex'));disk.setItem(o.key('sleepyhead'),raw);assert.throws(()=>o.read('sleepyhead'),/recovery/);assert.equal(disk.getItem(o.key('sleepyhead')),raw);
});
test('Organisation: copies preserve artwork identity and flags without copied billing or generation',()=>{
 const disk=memory(),o=M.organization(disk),v=o.read('duroflex'),r={route:'continuity',placementId:'square',versionId:'v2',imageHash:'hash',imageUrl:'/creative-ai/api/jobs/original/files/a.png',ready:false,unresolved:[{note:'Check logo'}]};const p={id:'original',brandId:'duroflex',name:'Original',results:[r],placements:[{id:'square'}],costs:{actualInr:100},status:'finished'};
 const {value,copy}=o.duplicate(v,p,r);assert.equal(copy.sourceJobId,p.id);assert.deepEqual(copy.results,[r]);assert.equal(copy.costs,undefined);assert.notEqual(copy.id,p.id);assert.equal(copy.results[0].ready,false);copy.results[0].ready=true;assert.equal(p.results[0].ready,false);assert.equal(o.read('duroflex').copies[0].results[0].ready,false);assert.throws(()=>o.duplicate(o.read('sleepyhead'),p),/different brand/);assert.throws(()=>o.duplicate(value,p,{...r,imageUrl:'/unrelated.png'}),/not part/);
 const failing=M.organization({getItem:disk.getItem,setItem(){throw Error('Storage full');}});assert.throws(()=>failing.update(value,'project:original',{favourite:true}),/Storage full/);assert.equal(o.read('duroflex').entries['project:original'],undefined);
});
test('Search: Unicode, brand, campaign, SKU, filename, tags and status are matched as literal text',()=>{
 const values=['Duroflex','Diwali 2026','COC-42','offer_final.png',['sofa','नमस्ते'],'Review before sharing'];for(const q of ['duroflex','diwali coc-42','offer_final.png','नमस्ते','review sharing'])assert.equal(M.searchMatch(q,...values),true,q);assert.equal(M.searchMatch('sleepyhead',...values),false);assert.equal(M.searchMatch('[.*]',...values),false);
});

test('Campaign plan: seven deliverables remain seven, routes and studios are explicit',()=>{
 const d=M.startDraft('duroflex','campaign');d.planning.strategy.proposition='A launch worth remembering';d.planning.concepts=[{id:'a',name:'Natural radiance',idea:'Show the benefit'},{id:'b',name:'Clinical results',idea:'Show supported proof'}];d.outputs=[1,1,1,9,24,24,7].map(id=>({...M.output(id),conceptId:id===24?'b':'a'}));
 assert.equal(M.assetPlan(d).length,7);assert.equal(M.units(d),11);assert.equal(M.assetPlan(d).filter(a=>a.workspace==='static').length,5);assert.equal(M.assetPlan(d).filter(a=>a.workspace==='video').length,2);assert.deepEqual(M.planIssues(d),[]);
 d.planning.concepts=d.planning.concepts.filter(c=>c.id!=='b');assert.ok(M.planIssues(d).some(x=>/Assign every/.test(x)));assert.equal(d.outputs.length,7,'Removing a route never deletes its deliverables');assert.equal(M.assetPlan(d).filter(a=>!a.conceptId).length,2);
 assert.equal(M.workspaceFor('adapt'),'adaptation');assert.equal(M.workspaceFor('document'),'copy');assert.equal(M.assetPlan(d).every(a=>a.status==='Planned'),true);
});
test('Creation paths: quick recipe is single, brand scoped and saved without rewriting legacy drafts',()=>{
 for(const brand of ['duroflex','sleepyhead']){const d=M.startDraft(brand,'quick',10);assert.equal(d.outputs.length,1);assert.equal(d.creationMode,'quick');assert.equal(d.brandId,brand);assert.equal(d.name,'GMB / store post');d.outputs.push(M.output(1));assert.match(M.validate(d).outputs,/exactly one/);}
 assert.throws(()=>M.startDraft('duroflex','quick',24),/static/);assert.throws(()=>M.startDraft('duroflex','other'),/Choose/);
 const legacy=M.newDraft('duroflex');assert.equal(legacy.creationMode,undefined);
 const store=M.storage(memory()),d=M.startDraft('duroflex','campaign');d.planning.team='Neha';d.planning.deadline='2026-11-01';const saved=store.save(d);assert.deepEqual(store.read('duroflex',d.id).planning,d.planning);assert.equal(store.read('sleepyhead',d.id),null);assert.equal(saved.revision,1);
});

test('Static contracts: all 42 classified; each static recipe has a specific journey and handoff',()=>{
 assert.equal(M.featureCoverage.length,42);assert.equal(M.featureCoverage.filter(x=>x.scope==='static').length,15);
 for(const f of M.features.filter(f=>f.kind==='image')){const c=M.staticRecipe(f.id);assert.ok(c.story);assert.ok(c.checks.length);assert.ok(c.handoff);assert.ok(c.fields.length);assert.equal(M.featureCoverage.find(x=>x.id===f.id).scope,'static');}
});
test('Static regression: exact saved variant and collection validation cannot be bypassed by asset plan',()=>{
 const d=M.startDraft('A','quick',8);d.brief='An image';d.productId='p';d.variant='removed';const ctx={brand:{brandUrl:'https://brand.test'},products:[{id:'p',variants:[{id:'one'},{id:'two'}]}]};assert.ok(M.validateBrief(d,ctx).variant);d.variant='one';assert.deepEqual(M.validateBrief(d,ctx),{});d.productId='not-in-library';assert.ok(M.validateBrief(d,ctx).productId);
 d.focus='collection';d.productIds=[];assert.ok(M.validateBrief(d,ctx).productIds);d.productIds=['p'];d.collectionVariants={p:'two'};assert.deepEqual(M.validateBrief(d,ctx),{});d.collectionVariants.p='deleted';assert.ok(M.validateBrief(d,ctx).productIds);
});
test('Static regression: per-deliverable inputs and ordered parts survive resizing and are not shared',()=>{
 const a=M.output(9),b=M.output(9);assert.equal(M.staticParts(a).length,5);const original=M.staticParts(a);a.staticParts=original.map((x,i)=>({...x,copy:'Slide '+i}));a.slides=2;assert.equal(M.staticParts(a).length,2);a.slides=5;assert.equal(M.staticParts(a)[4].copy,'Slide 4');assert.equal(M.staticParts(b)[4].copy,'');
 for(const id of [5,6])assert.ok(M.staticParts(M.output(id)).length>1);
});

test('Static regression: carousel and product-set parts follow parent size while marketplace modules keep their own',()=>{
 for(const id of [5,9]){const o=M.output(id);o.staticParts=M.staticParts(o);o.staticParts[0].copy='Retain wording';o.width=1200;o.height=1500;assert.equal(M.staticParts(o)[0].width,1200);assert.equal(M.staticParts(o)[0].height,1500);assert.equal(M.staticParts(o)[0].copy,'Retain wording');}
 const module=M.output(6);module.staticParts=M.staticParts(module);module.staticParts[0].width=970;module.staticParts[0].height=300;module.width=1200;assert.equal(M.staticParts(module)[0].width,970);assert.equal(M.staticParts(module)[0].height,300);
});

test('Static validation: module dimensions and print specs recover without losing inputs',()=>{
 for(const brand of ['duroflex','sleepyhead']){
  const d=M.startDraft(brand,'quick',6);d.focus='brand';d.brief='Module size';const o=d.outputs[0];o.staticParts=M.staticParts(o);o.staticParts[0].copy='Retained copy';
  for(const width of [0,-1,8193,100.5]){o.staticParts[0].width=width;assert.match(M.validateBrief(d)['output-'+o.id],/whole pixels/);}o.staticParts[0].width=970;assert.deepEqual(M.validateBrief(d),{});assert.equal(o.staticParts[0].copy,'Retained copy');
  d.outputs=[M.output(11)];const print=d.outputs[0];print.staticValues={physicalWidth:'-1',physicalHeight:'210',unit:'mm'};assert.match(M.validateBrief(d)['output-'+print.id],/positive/);print.staticValues.physicalWidth='297';assert.deepEqual(M.validateBrief(d),{});assert.equal(print.staticValues.unit,'mm');
 }
});

test('Rationale separates intent from observations and prioritises unresolved checks despite high scores',()=>{
 const unit={plannedArt:{composition:'Plan generous headline space. Keep the logo top left.',lighting:'Cool evening lighting.'},review:{criticalChecks:[{criterion:'logo-identity',status:'unknown',evidence:{observation:'Logo symbol is not clear.'}},{criterion:'required-text-legibility',status:'fail',evidence:{observation:'Supporting copy is too small.'}},{criterion:'product-identity',status:'pass',evidence:{observation:'Correct product.'}}],qualityScores:[{criterion:'communication',score:98,usedInScore:true,evidence:{method:'vision',observation:'Headline reads clearly.'}}]}};
 const r=M.reviewSummary(unit,{ready:true,conceptExplanation:{takeaway:'Lead with comfort.'},unresolved:[{criterion:'required-text-legibility',note:'Supporting copy is too small.'}]});assert.equal(r.decisions.length,4);assert.deepEqual(r.decisions.map(d=>d.title),['Message','Layout','Logo','Scene']);assert.ok(r.decisions.every(d=>d.basis==='intent'));assert.equal(r.concerns.length,2);assert.equal(r.concerns[0].criterion,'required-text-legibility');assert.equal(r.scores[0].score,4.9);assert.ok(r.concerns[0].action);assert.equal(r.reviewAvailable,true);assert.equal(M.reviewSummary().reviewAvailable,false);assert.ok(!r.decisions.some(d=>d.text.includes('too small')));
});
test('Rationale includes saved defects and verification gaps without inventing execution or clearing edited work',()=>{
 const data=M.reviewSummary({review:{criticalChecks:[],findings:[{criterion:'visualCraft',severity:'critical',defect:'Product is obscured.',correction:'Move the caption away from the product.'},{criterion:'style',severity:'advisory',defect:'Try another colour.'}],verificationDependencies:[{criterion:'format',request:'Verify crop in platform preview.'}]}},{unresolved:[{criterion:'visualCraft',status:'critical',note:'Product is obscured.'}],latestEdit:{revision:3}});assert.equal(data.concerns.length,2);assert.equal(data.concerns[0].status,'fail');assert.equal(data.concerns[0].nextStep,'Move the caption away from the product.');assert.ok(data.decisions.every(d=>!d.recorded));assert.ok(data.scores.every(s=>s.score===null));assert.equal(M.reviewSummary(null,{ready:true}).reviewAvailable,false);
});
test('Rationale groups repeated missing-review checks and keeps logo excerpts relevant',()=>{
 const checks=['logo-identity','product-identity','supported-claims'].map(criterion=>({criterion,status:'unknown',evidence:{method:'unavailable',observation:'No qualified evaluator evidence available.'}})),deps=checks.map(c=>({criterion:c.criterion,request:'Focused evidence verification for '+c.criterion}));const data=M.reviewSummary({plannedArt:{composition:'Keep the product central; place headline on the left; keep the logo in the top-right corner.'},review:{criticalChecks:checks,verificationDependencies:deps}},{unresolved:[...checks.map(c=>({criterion:c.criterion,status:'unknown',note:c.evidence.observation})),...deps]});assert.equal(data.concerns.length,1);assert.match(data.concerns[0].observation,/Logo.*Product accuracy.*Claims/);assert.match(data.decisions[2].text,/logo in the top-right/);assert.ok(!data.decisions[2].text.includes('product central'));
});

test('Rationale uses plain display copy while preserving the saved plan',()=>{
 const original='The exact Cocoon sofa is the hero; the adults’ natural shared moment contextualizes the sourced extra-deep seating.';
 const data=M.reviewSummary(null,{conceptExplanation:{takeaway:original}});
 assert.equal(data.decisions[0].text,original);
 assert.equal(data.decisions[0].displayText,'Cocoon sofa is the focus; a relaxed moment together shows the extra-deep seating.');
 assert.equal(data.decisions[0].basis,'intent');assert.equal(data.reviewAvailable,false);
});
