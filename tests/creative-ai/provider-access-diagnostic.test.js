'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
for(const brand of ['duroflex','sleepyhead'])test(brand+': failed access lookup retains HTTP evidence without blaming credentials or starting paid work',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'access-diagnostic-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const runtime=new CreativeRuntime({root,provider:{checkAccess:async()=>({configured:false,status:503,reason:'private upstream body must not be copied'}),reason(){throw Error('No paid calls');},generate(){throw Error('No paid calls');}}});
 const job=await runtime.store.create({brandId:'brand-'+brand},runtime.config,[]);
 await assert.rejects(runtime.run(job.id),e=>e.code==='PROVIDER_ACCESS_CHECK_FAILED'&&/HTTP 503/.test(e.message)&&!/API_KEY/.test(e.message));
 const saved=JSON.parse(await fs.readFile(path.join(runtime.store.dir(job.id),'provider-access.json')));
 assert.equal(saved.status,503);assert.equal(saved.configured,false);assert(!JSON.stringify(saved).includes('private upstream'));
 const after=await runtime.store.read(job.id);assert.equal(after.budget.reasoningCalls,0);assert.equal(after.budget.imageCalls,0);
});
