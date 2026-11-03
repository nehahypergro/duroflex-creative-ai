'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),path=require('path'),os=require('os');
const {fingerprint}=require('../../lib/creative-ai/art-director');
test('both brands: persisted production scope preserves old conflicts, rejects changed evidence and never waives product facts',async()=>{
 const scope=require('../../lib/creative-ai/runtime/production-scope');
 for(const brandId of ['brand-duroflex','brand-sleepyhead']){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'production-scope-'));try{
 const fact={id:'draft-identity',kind:'brand',text:'Proposed identity adoption is unconfirmed.',status:'conflicted',essential:true,sourceIds:['draft']},research={facts:[fact],dossier:{sources:[{id:'draft',kind:'guidelines',status:'available'}]}},logo={sha256:'approved-bytes'},brand={id:brandId},product={id:'product-exact'};
 const runtime={brands:{dir:id=>{assert.equal(id,brandId);return dir;}}},policy={version:1,brandId,productIds:[product.id],logoSha256:logo.sha256,authorization:{sourceJobId:'creative-authorized',note:'User approved current logo and exact product identity.'},clarification:{version:1,text:'Use the approved logo and exact product name; do not adopt draft identities or proposed range names.',createdAt:'2026-10-21T00:00:00Z',nonEssentialFactIds:[fact.id]},factBindings:{[fact.id]:fingerprint(fact)}};
 await assert.rejects(()=>scope.prepare(runtime,brand,product,research,logo),/production.*unresolved/i);
 await fs.writeFile(path.join(dir,'production-scope.json'),JSON.stringify(policy));const before=JSON.stringify(research);const c=await scope.prepare(runtime,brand,product,research,logo);assert.deepEqual(c.nonEssentialFactIds,[fact.id]);assert.equal(JSON.stringify(research),before);
 await assert.rejects(()=>scope.prepare(runtime,brand,product,research,{sha256:'changed'}),/logo/i);
 await assert.rejects(()=>scope.prepare(runtime,brand,{id:'other'},research,logo),/product/i);
 await assert.rejects(()=>scope.prepare(runtime,brand,product,{...research,facts:[{...fact,text:'Changed conflict'}]},logo),/changed/i);
 const newConflict={...fact,id:'new-product-proof',kind:'product'};await assert.rejects(()=>scope.validatePolicy({...policy,clarification:{...policy.clarification,nonEssentialFactIds:[newConflict.id]},factBindings:{[newConflict.id]:fingerprint(newConflict)}},brand,product,{...research,facts:[newConflict]},logo),/product|brand.*conflict/i);
 await assert.rejects(()=>scope.validatePolicy({...policy,brandId:'other'},brand,product,research,logo),/brand/i);
 }finally{await fs.rm(dir,{recursive:true,force:true});}}
});
test('recorded research-required response with no alternative uses code-owned none without promoting readiness',async()=>{
 const f=require('../../lib/creative-ai/runtime/artifact-fs'),root=path.resolve(__dirname,'../..'),file=path.join(root,'output/creative-ai/jobs/creative-ad132906-405c-45ab-89e0-fde4b1d64259/invalid-0888fdf94ac65240d5eedeb9f6e75fde9363c6aa1f0c295054137a949a752c84.json');
 const out=JSON.parse(await f.readFile(file,'utf8')).output,before=structuredClone(out);require('../../lib/creative-ai/runtime/decision-wire').bindUnselectedDirection(out);assert.equal(out.selection.directionId,'none');assert.equal(out.status,'research_required');assert.deepEqual(out.researchRequests,before.researchRequests);assert.deepEqual(out.alternatives,[]);
 const ready={status:'ready',alternatives:[],selection:{directionId:'bad'}};require('../../lib/creative-ai/runtime/decision-wire').bindUnselectedDirection(ready);assert.equal(ready.selection.directionId,'bad');
});
test('new SKU authorization is product-specific and cannot inherit another product’s clarification',async()=>{const scope=require('../../lib/creative-ai/runtime/production-scope'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'scope-new-sku-'));try{const brand={id:'brand-one'},product={id:'product-12345678901234567890'},runtime={brands:{dir:()=>dir}},research={facts:[],dossier:{sources:[]}},logo={sha256:'same-logo'},policy={version:1,brandId:brand.id,productIds:[product.id],logoSha256:logo.sha256,authorization:{sourceJobId:'saved-brand-choice',note:'New SKU requested by user'},clarification:{version:1,text:'Use exact new SKU identity, never old sofa identity.',createdAt:'2026-10-22T00:00:00Z',nonEssentialFactIds:[]},factBindings:{}};await fs.writeFile(path.join(dir,'production-scope.json'),JSON.stringify({...policy,productIds:['old-product']}));await fs.mkdir(path.join(dir,'production-scopes'));await fs.writeFile(path.join(dir,'production-scopes',product.id+'.json'),JSON.stringify(policy));assert.match((await scope.prepare(runtime,brand,product,research,logo)).text,/exact new SKU/);await assert.rejects(()=>scope.prepare(runtime,brand,{id:'product-99999999999999999999'},research,logo),/does not cover/);}finally{await fs.rm(dir,{recursive:true,force:true})}});
test('brand defaults require official same-brand sources and preserve exact SKU, logo and fact guards',async()=>{
 const scope=require('../../lib/creative-ai/runtime/production-scope'),root=await fs.mkdtemp(path.join(os.tmpdir(),'scope-default-'));
 try{
  const dir=path.join(root,'brand'),brand={id:'brand-one',brandUrl:'https://example.test'},product={id:'product-12345678901234567890',brandId:brand.id,pageUrl:'https://example.test/products/new'},logo={sha256:'current-logo'},fact={id:'draft-identity',kind:'brand',text:'Draft identity conflict',status:'conflicted',essential:true,sourceIds:['draft']},research={facts:[fact],dossier:{sources:[{id:'draft',kind:'guidelines',status:'available'}]}},runtime={root,brands:{dir:()=>dir}};
  const policy={version:1,scope:'official-product-library',brandId:brand.id,logoSha256:logo.sha256,authorization:{sourceJobId:'saved-choice',note:'Use current official brand identity.'},clarification:{version:1,text:'Use this brand identity and the selected exact product.',createdAt:'2026-10-31T00:00:00Z',nonEssentialFactIds:[fact.id]},factBindings:{[fact.id]:fingerprint(fact)}};
  const approval={version:2,scope:'explicit-product-website-statements',status:'client-approved',brandId:brand.id,basis:'User accepts official product statements',approvedAt:'2026-10-24T00:00:00Z',officialHost:'example.test'};
  await fs.mkdir(path.join(root,'config'));await fs.mkdir(path.join(dir,'production-scopes'),{recursive:true});
  await fs.writeFile(path.join(root,'config/production-scope-defaults.json'),JSON.stringify({version:1,brands:[policy]}));
  const approvalsFile=path.join(root,'config/website-certification-approvals.json');await fs.writeFile(approvalsFile,JSON.stringify({version:1,approvals:[approval]}));
  await fs.writeFile(path.join(dir,'production-scope.json'),JSON.stringify({...policy,productIds:['old-product'],clarification:{...policy.clarification,text:'Old campaign must not be inherited'}}));
  const before=JSON.stringify(research);assert.match((await scope.prepare(runtime,brand,product,research,logo)).text,/selected exact product/);assert.equal(JSON.stringify(research),before);
  await assert.rejects(()=>scope.prepare(runtime,brand,{...product,brandId:'other-brand'},research,logo),/selected brand/);
  await assert.rejects(()=>scope.prepare(runtime,brand,{...product,pageUrl:'https://other.test/products/new'},research,logo),/selected brand/);
  await assert.rejects(()=>scope.prepare(runtime,brand,product,research,{sha256:'changed-logo'}),/logo changed/);
  await assert.rejects(()=>scope.prepare(runtime,brand,product,{...research,facts:[{...fact,text:'Changed conflict'}]},logo),/conflict changed/);
  await fs.writeFile(approvalsFile,JSON.stringify({version:1,approvals:[{...approval,status:'revoked'}]}));await assert.rejects(()=>scope.prepare(runtime,brand,product,research,logo),/approval/);
  await fs.writeFile(approvalsFile,JSON.stringify({version:1,approvals:[approval]}));
  await fs.writeFile(path.join(dir,'production-scopes',product.id+'.json'),JSON.stringify({...policy,productIds:[product.id],logoSha256:'stale-logo'}));await assert.rejects(()=>scope.prepare(runtime,brand,product,research,logo),/logo changed/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
