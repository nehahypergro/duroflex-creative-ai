'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
test('new jobs pin one canonical authored brief across entry points and keep treatment selection separate',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'canonical-brief-'));
 try{const base={brandId:'brand-sleepyhead',brandUrl:'https://mysleepyhead.com',brief:'Introduce “हैलो” & <literal>. Keep the exact qualifier.',objective:'awareness',language:'English',audience:'New home owners',productName:'Fixture',productVariantId:'queen',productPageUrl:'https://mysleepyhead.com/products/fixture',desiredAction:'Explore'},config={maxReasoningCalls:10,jobTimeoutMs:1000},store=new JobStore(path.join(root,"output/creative-ai/jobs")),contracts=[];
 for(let i=0;i<10;i++){const job=await store.create({...base,sourceStudioDraftId:i%2?'campaign':'quick',placementIds:['format-'+i],briefContract:{brief:'Forged'}},config,[]);assert.equal(job.briefContract?.content.brief,base.brief);contracts.push(job.briefContract);}
 assert.equal(new Set(contracts.map(c=>c.contentHash)).size,1);assert.ok(contracts.every(c=>c.content.productVariantId==='queen'));
 const input=require('../../lib/creative-ai/runtime/campaign-input'),assignment=input.assignment(base);assert.equal(assignment.goal,base.brief);assert.equal(assignment.brief,base.brief);assert.equal(assignment.desiredAction,base.desiredAction);
 const changed=await store.create({...base,brandId:'brand-duroflex'},config,[]);assert.notEqual(changed.briefContract.contentHash,contracts[0].contentHash);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
