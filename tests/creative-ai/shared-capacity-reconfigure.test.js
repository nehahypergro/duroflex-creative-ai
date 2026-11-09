'use strict';
// Regression (8 Nov 2026): raising CREATIVE_AI_MAX_REASONING_CALLS / _MAX_IMAGE_CALLS in .env
// failed all 10 test jobs before dispatch with "Shared capacity configuration differs between
// workers", because the saved policy.json is never updated. The Studio now aligns an idle
// capacity policy with its configuration at startup; mismatches while running still refuse.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const capacity=require('../../lib/creative-ai/runtime/shared-capacity');
const maintenance=require('../../lib/creative-ai/runtime/background-maintenance');
const policy=async(root,kind)=>JSON.parse(await fs.readFile(path.join(root,kind,'policy.json'),'utf8'));

test('an idle capacity policy is updated to the new limit',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'capacity-reconfigure-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await capacity.run(root,'image',2,async()=>{});
 assert.deepEqual(await capacity.reconfigure(root,'image',4),{changed:true,from:2,to:4});
 assert.equal((await policy(root,'image')).limit,4);
 let ran=false;await capacity.run(root,'image',4,async()=>{ran=true;});assert.equal(ran,true);
 assert.deepEqual(await capacity.reconfigure(root,'image',4),{changed:false,from:4,to:4});
});

test('a policy in use is not changed and a different limit still refuses',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'capacity-busy-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 let release,started;const held=new Promise(r=>release=r),running=new Promise(r=>started=r);
 const owner=capacity.run(root,'reasoning',4,async()=>{started();await held;});await running;
 assert.deepEqual(await capacity.reconfigure(root,'reasoning',6),{changed:false,busy:true,from:4,to:6});
 assert.equal((await policy(root,'reasoning')).limit,4);
 await assert.rejects(()=>capacity.run(root,'reasoning',6,()=>assert.fail('must not dispatch')),/differs between workers/);
 release();await owner;
});

test('Studio startup aligns job and research capacity with the configured limits',async t=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'capacity-startup-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const jobs=path.join(base,'jobs'),research=path.join(base,'research-sessions');
 await capacity.run(path.join(jobs,'.provider-capacity'),'reasoning',4,async()=>{});
 await capacity.run(path.join(jobs,'.provider-capacity'),'image',2,async()=>{});
 await capacity.run(path.join(research,'.provider-capacity'),'reasoning',4,async()=>{});
 const runtime={store:{root:jobs},researchSessions:{store:{root:research}},config:{maxConcurrentReasoningCalls:6,maxConcurrentImageCalls:4}};
 const report=await maintenance.alignCapacity(runtime);
 assert.equal((await policy(path.join(jobs,'.provider-capacity'),'reasoning')).limit,6);
 assert.equal((await policy(path.join(jobs,'.provider-capacity'),'image')).limit,4);
 assert.equal((await policy(path.join(research,'.provider-capacity'),'reasoning')).limit,6);
 assert.equal(report.filter(r=>r.changed).length,3);
 const source=await fs.readFile(require.resolve('../../lib/creative-ai/runtime/background-maintenance'),'utf8');
 assert.match(source.slice(source.indexOf('function startupPass')),/alignCapacity\(runtime/,'startupPass aligns capacity before serving');
});
