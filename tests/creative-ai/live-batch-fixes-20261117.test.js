'use strict';
// Regressions from the live Duroflex test batch (17 Nov 2026). Failing before; no paid calls.
//  1. Airboost 6.8: the saved product reading said "white DUROFLEX lettering" while the official photos show red, so
//     every Airboost design was flagged although the checker saw the photos disagree.
//  2. Tatva homepage hero: planning failed after every repair with "Product identity citation does not support copy:
//     supporting line", an error that never said which words were unsupported.
//  3. Prana landing page modules: REFERENCE_SOURCE_CHANGED when a saved, hash-named staging copy was damaged.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');

test('new lean jobs pin feature evidence v1 and the snapshot keeps it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.featureEvidenceVersion,1);assert.equal(pc.snapshot(c).featureEvidenceVersion,1);assert.equal(pc.snapshot({}).featureEvidenceVersion,undefined);
});
for(const brand of brands){
 test(brand+': the image check is told the official photos win over a saved product reading',async t=>{
  const f=await fixture(t,{brand});assert.equal(f.planError,null);assert.match(f.records[0].reviewInstructions,/the photos win/);
 });
 test(brand+': jobs admitted before the pin keep their saved check instructions',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['featureEvidenceVersion']});assert.equal(f.planError,null);assert.doesNotMatch(f.records[0].reviewInstructions,/the photos win/);
 });
}

test('an unsupported product line names the words the planner must fix',()=>{
 const planning=require('../../lib/creative-ai/lean/planning');
 const product={id:'p1',name:'Tatva Natural Latex and Coir Mattress',variant:{id:'v1',name:'Queen'},facts:[{id:'f1',text:'Natural latex and coir layers'}]};
 assert.throws(()=>planning.validateCitations([{role:'supporting line',text:'Tatva natural latex for cooler nights',factIds:['p1','f1']}],product),e=>/does not support copy: supporting line/.test(e.message)&&/for, cooler, nights/.test(e.message));
 assert.doesNotThrow(()=>planning.validateCitations([{role:'supporting line',text:'Tatva natural latex and coir layers',factIds:['p1','f1']}],product));
});

test('a damaged hash-named staging copy is replaced with the correct bytes instead of failing',async t=>{
 const cdn=require('../../lib/creative-ai/runtime/cdn-media'),{stage}=require('../../lib/creative-ai/runtime/image-reference-stage');
 const bytes=crypto.randomBytes(4096),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 const server=http.createServer((req,res)=>res.end(bytes));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reference-damaged-'));await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId:'brand-duroflex'}}));
 const saved={scope:cdn.scope,config:cdn.config,publish:cdn.publish,safeUrl:cdn.safeUrl};let published=null;
 Object.assign(cdn,{scope:()=>({root:dir}),config:async()=>({enabled:true}),safeUrl:()=>true,publish:async file=>{published=await fs.readFile(file);return {brandId:'brand-duroflex',sha256:sha,bytes:bytes.length,url:'http://127.0.0.1:'+server.address().port+'/ref'};}});
 t.after(async()=>{Object.assign(cdn,saved);server.close();await fs.rm(dir,{recursive:true,force:true});});
 const file=path.join(dir,'generation-references',sha+'.png');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes.subarray(0,1000)); // damaged, partly written copy
 const budget={brandContext:async()=>({intake:{brandId:'brand-duroflex'},dir}),remainingMs:async()=>600000};
 const refs=await stage([{assetId:'ref-1',type:'png',bytes}],budget);
 assert.equal(refs.length,1);assert.deepEqual(await fs.readFile(file),bytes);assert.deepEqual(published,bytes);
});
