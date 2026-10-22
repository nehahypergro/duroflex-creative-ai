'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),{apply}=require('../../lib/creative-ai/runtime/strategy-clarification'),strategy=require('../../lib/creative-ai/marketing-strategist');
test('new campaign carries an explicit scoped clarification through to strategy without changing research',async()=>{
 const input=await fixture.inputExample();input.facts.push({id:'draft-identity',kind:'brand',status:'conflicted',essential:true,text:'Production identity adoption unresolved',sourceIds:['brief-source']});
 const prior=structuredClone(input),choice={version:1,text:'Use the current official website logo; omit draft identities and proposed range names.',nonEssentialFactIds:['draft-identity'],createdAt:'2026-10-13T18:00:00.000Z'};
 const {applyCampaign}=require('../../lib/creative-ai/runtime/strategy-clarification');
 const out=applyCampaign(input,{campaignClarification:choice});assert.equal(out.facts.at(-1).essential,false);assert.equal(out.facts.at(-1).status,'conflicted');assert.match(out.assignment.brief,/current official website logo/);assert.deepEqual(input,prior);
 assert.deepEqual(applyCampaign(input,{}),input);
 assert.throws(()=>applyCampaign(input,{campaignClarification:{...choice,nonEssentialFactIds:['capacity']}}),/cannot waive/);
 assert.throws(()=>applyCampaign(input,{campaignClarification:{...choice,text:''}}),/Invalid/);
});
test('explicit campaign scope leaves brand conflicts visible and historical research intact',async()=>{const input=await fixture.inputExample();input.facts.push({id:'proposed-range',kind:'brand',status:'conflicted',essential:true,text:'Range adoption remains unresolved',sourceIds:['brief-source']});const prior=structuredClone(input),choice={version:1,text:'Use the exact product name. Do not use proposed range names.',nonEssentialFactIds:['proposed-range'],createdAt:new Date().toISOString()},out=apply(input,choice);assert.deepEqual(input,prior);assert.equal(out.facts.at(-1).status,'conflicted');assert.equal(out.facts.at(-1).essential,false);assert.ok(strategy.analyzeInput(out).excludedFacts.some(f=>f.id==='proposed-range'));assert.equal(strategy.analyzeInput(out).readiness,'context_ready');assert.equal(strategy.validateInput(out).guardian.requirements.at(-1).text,choice.text);for(const id of ['capacity','positioning','unknown'])assert.throws(()=>apply(input,{...choice,nonEssentialFactIds:[id]}),/cannot waive/);});

test('strategy latency experiment is explicit and keeps the default reasoning effort',async()=>{
 const {strategist}=require('../../lib/creative-ai/runtime/agents'),input=await fixture.inputExample();
 for(const [options,effort] of [[undefined,'medium'],[{reasoningEffort:'low'},'low']]){let request;await strategist(input,{reason:async r=>{request=r;return {}; }},{},options);assert.equal(request.reasoningEffort,effort);assert.equal(request.contextKind,'strategy');}
 await assert.rejects(strategist(input,{reason:async()=>{throw Error('must not dispatch');}},{},{reasoningEffort:'invalid'}),/must be low or medium/);
});

test('invalid strategy effort is rejected before network or paid dispatch',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 await assert.rejects(CreativeRuntime.prototype.createRequest.call({}, {strategyReasoningEffort:'invalid'}),/must be low or medium/);
});
test('an inaccessible existing worker stays locked and cannot be marked failed by a second runner',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'creative-worker-lock-'));
 const file=path.join(dir,'.runner.lock'),prior=process.kill;await fs.writeFile(file,'12345');
 try{process.kill=()=>{const e=Error('permission denied');e.code='EPERM';throw e;};await CreativeRuntime.prototype.run.call({store:{dir:()=>dir}},'test');assert.equal(await fs.readFile(file,'utf8'),'12345');}
 finally{process.kill=prior;await fs.rm(dir,{recursive:true,force:true});}
});
