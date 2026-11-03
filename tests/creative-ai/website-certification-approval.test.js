'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {factStatus}=require('../../lib/creative-ai/runtime/product-research');
const approval={version:1,brandId:'brand-duroflex-test',officialHost:'www.duroflexworld.com',status:'client-approved',scope:'explicit-product-certifications',approvedAt:'2026-10-23T00:00:00.000Z',basis:'User accepts the official product website as final source for certification claims.'};
const intake={brandId:approval.brandId,brandUrl:'https://www.duroflexworld.com'},passage={id:'p',sourceId:'official',text:'This mattress is certified by Example Institute for the stated category.'},fact={text:passage.text,status:'supported',passageId:'p',sourceId:'official'};
const context={approval,intake,sourceUrl:'https://www.duroflexworld.com/products/fixture',passage};
test('explicit official certification remains supported under pinned client approval',()=>{assert.equal(factStatus(fact,context),'supported');assert.equal(factStatus(fact),'unverified');});
test('approval cannot cross brands, domains, passages or resolve missing evidence',()=>{
 for(const change of [{intake:{...intake,brandId:'sleepyhead'}},{sourceUrl:'https://other.example/products/fixture'},{passage:{...passage,sourceId:'other'}},{passage:{...passage,text:'A comfortable mattress.'}},{approval:{...approval,status:'pending'}}])assert.equal(factStatus(fact,{...context,...change}),'unverified');
 assert.equal(factStatus({...fact,status:'unverified'},context),'unverified');assert.equal(factStatus({...fact,text:fact.text.replace('Example Institute','Invented Institute')},context),'unverified');
 for(const text of ['Certified to cure back pain','Certified for 30% more deep sleep','3X more support'])assert.equal(factStatus({...fact,text},context),'unverified');
});
test('registry pins only the approved brand and changed approval invalidates the reusable audit key',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),policy=require('../../lib/creative-ai/runtime/website-certification-approval'),cache=require('../../lib/creative-ai/runtime/sku-audit-cache'),root=await fs.mkdtemp(path.join(os.tmpdir(),'source-approval-'));
 try{await fs.mkdir(path.join(root,'config'));await fs.writeFile(path.join(root,'config/website-certification-approvals.json'),JSON.stringify({version:1,approvals:[approval]}));const pinned=await policy.load(root,intake);assert.deepEqual(pinned,approval);assert.equal(await policy.load(root,{brandId:'sleepyhead',brandUrl:'https://mysleepyhead.com'}),null);await assert.rejects(()=>policy.load(root,{...intake,brandUrl:'https://other.example'}),/selected brand/);
 const request={instructions:'Source audit',schema:{},input:{},images:[]},before=cache.hash(cache.binding({intake,profile:{id:'test'},request}));request.instructions+=policy.guidance(pinned,intake,context.sourceUrl);assert.notEqual(cache.hash(cache.binding({intake,profile:{id:'test'},request})),before);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('incoming request cannot supply its own approval or rewrite the previous job',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),root=await fs.mkdtemp(path.join(os.tmpdir(),'approval-intake-'));
 try{const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid calls');},generate(){assert.fail('No paid calls');}}});runtime.schedule=()=>{};const id=await runtime.create({brandUrl:'https://example.com',brief:'Synthetic source test',placementIds:['custom:studio-social-square'],websiteCertificationApproval:approval});const job=await runtime.store.read(id);assert.equal(job.intake.websiteCertificationApproval,undefined);assert.equal(job.budget.reasoningCalls,0);assert.equal(job.budget.imageCalls,0);}finally{await fs.rm(root,{recursive:true,force:true});}
});

test('reviewed policy approves each brand separately without cross-brand inheritance',async()=>{
 const policy=require('../../lib/creative-ai/runtime/website-certification-approval'),path=require('node:path'),root=path.resolve(__dirname,'../..');
 const brands=[{brandId:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',brandUrl:'https://www.duroflexworld.com/'},{brandId:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de',brandUrl:'https://mysleepyhead.com/'}];
 for(const intake of brands){const saved=await policy.load(root,intake);assert.equal(saved?.brandId,intake.brandId);assert.equal(saved.independentVerification,false);assert.equal(policy.matches(saved,brands.find(b=>b!==intake),intake.brandUrl),false);}
});
