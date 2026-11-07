'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {finishRun}=require('../../lib/creative-ai/experiments/lean-planner/finishing');
async function fixture(t,policy=1){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lean-finish-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const id='lean-test',dir=path.join(root,'output/imagegen/lean-planner',id);await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'run.json'),JSON.stringify({id,version:2,status:'completed',correctionPolicy:policy}));
 return {root,id,dir};
}
test('a resumed conformance check continues into the authorized correction flow',async t=>{
 const f=await fixture(t),order=[];
 const out=await finishRun(f.root,f.id,{review:async()=>{order.push('review');return [{status:'completed'}];},correct:async()=>{order.push('correct');return [{status:'selected'}];}});
 assert.deepEqual(order,['review','correct']);assert.equal(out.corrections[0].status,'selected');
 assert.equal(JSON.parse(await fs.readFile(path.join(f.dir,'finishing.json'))).status,'completed');
});
test('a review-only historical run never silently gains correction authorization',async t=>{
 const f=await fixture(t,undefined);const run=JSON.parse(await fs.readFile(path.join(f.dir,'run.json')));delete run.correctionPolicy;await fs.writeFile(path.join(f.dir,'run.json'),JSON.stringify(run));
 let corrections=0;await finishRun(f.root,f.id,{review:async()=>[],correct:async()=>{corrections++;}});assert.equal(corrections,0);
});
test('duplicate finishing actions share one review/correction workflow',async t=>{
 const f=await fixture(t);let reviews=0,corrections=0;const options={review:async()=>{reviews++;return [];},correct:async()=>{corrections++;return [];}};
 await Promise.all([finishRun(f.root,f.id,options),finishRun(f.root,f.id,options)]);assert.equal(reviews,1);assert.equal(corrections,1);
});
test('an interrupted reviewer does not prevent correction of other saved confirmed defects',async t=>{
 const f=await fixture(t);let corrections=0;const out=await finishRun(f.root,f.id,{review:async()=>{throw Error('Review interrupted');},correct:async()=>{corrections++;return [{status:'selected'}];}});
 assert.equal(corrections,1);assert.equal(out.errors[0].stage,'review');assert.equal(out.status,'partial');
});
test('a later successful resume clears the current error but preserves the failed attempt',async t=>{
 const f=await fixture(t);await finishRun(f.root,f.id,{review:async()=>{throw Error('Offline');},correct:async()=>[]});
 const first=JSON.parse(await fs.readFile(path.join(f.dir,'finishing.json')));
 await finishRun(f.root,f.id,{review:async()=>[],correct:async()=>[]});
 const next=JSON.parse(await fs.readFile(path.join(f.dir,'finishing.json')));assert.equal(next.errors.length,0);assert.notEqual(first.attemptId,next.attemptId);
 assert.equal(JSON.parse(await fs.readFile(path.join(f.dir,first.attemptId+'.json'))).errors[0].message,'Offline');
});
test('generation-in-progress and legacy v1 runs cannot enter finishing',async t=>{
 for(const change of [{status:'generating'},{version:1}]){const f=await fixture(t);const file=path.join(f.dir,'run.json'),run=JSON.parse(await fs.readFile(file));await fs.writeFile(file,JSON.stringify({...run,...change}));let calls=0;await assert.rejects(finishRun(f.root,f.id,{review:async()=>{calls++;}}),/finished v2/i);assert.equal(calls,0);}
});
