'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{OpenAIProvider}=require('./offline-provider.cjs');
const schema={type:'object',properties:{ok:{type:'boolean'},preserved:{type:'string'}},required:['ok','preserved'],additionalProperties:false};
const reply=(value,cut=false)=>({id:'resp_fixture',status:cut?'incomplete':'completed',...(cut?{incomplete_details:{reason:'max_output_tokens'}}:{}),output:[{content:[{type:'output_text',text:typeof value==='string'?value:JSON.stringify(value)}]}],usage:{output_tokens:90}});
async function harness(sequence,fn){let sends=0;const bodies=[],receipts=[],saved=new Map(),p=new OpenAIProvider({reasoningModel:'fixture',maxOutputTokens:100,maxRecoveryOutputTokens:400,reasoningTimeoutMs:1000});p.sendReasoning=async body=>{bodies.push(body);assert(sends<sequence.length,'Unexpected extra paid dispatch');return {ok:true,json:async()=>({...sequence[sends++],id:'resp_'+sends})};};const budget={reserve:async()=>{},receipt:async r=>receipts.push(r),loadResponse:async(_,k)=>saved.get(k),saveResponse:async(_,k,v)=>saved.set(k,v)};await fn({p,budget,bodies,receipts,sends:()=>sends});}
const request={instructions:'Use supplied facts.',input:{brandId:'brand-duroflex'},schema};
for(const brand of ['duroflex','sleepyhead'])test(brand+': length recovery leaves one schema repair and replay makes no new calls',()=>harness([reply('{',true),reply({ok:'wrong-type',preserved:'Exact saved copy'}),reply({ok:true})],async({p,budget,bodies,receipts,sends})=>{
 const req={...request,input:{brandId:'brand-'+brand}};
 assert.deepEqual(await p.reason(req,budget),{ok:true,preserved:'Exact saved copy'});assert.equal(sends(),3);assert.deepEqual(receipts.map(r=>r.requestIntent.reason),[null,'output-limit','invalid-contract']);assert.deepEqual(Object.keys(bodies[2].text.format.schema.properties),['ok']);assert.deepEqual(await p.reason(req,budget),{ok:true,preserved:'Exact saved copy'});assert.equal(sends(),3);
}));
test('schema repair can recover once from truncation while retaining its patch contract',()=>harness([reply({ok:'invalid',preserved:'Retain this'}),reply('{',true),reply({ok:true})],async({p,budget,bodies,receipts})=>{
 assert.deepEqual(await p.reason(request,budget),{ok:true,preserved:'Retain this'});assert.deepEqual(receipts.map(r=>r.requestIntent.reason),[null,'invalid-contract','output-limit']);assert.deepEqual(Object.keys(bodies[1].text.format.schema.properties),['ok']);assert.deepEqual(Object.keys(bodies[2].text.format.schema.properties),['ok']);assert(bodies[2].max_output_tokens>bodies[1].max_output_tokens);
}));
test('full contract repair near output ceiling receives headroom before dispatch',()=>harness([reply({ok:false,preserved:'Retain'}),reply({ok:true,preserved:'Retain'})],async({p,budget,bodies})=>{
 await p.reason({...request,validate:o=>{if(!o.ok)throw Error('Semantic inconsistency');}},budget);assert(bodies[1].max_output_tokens>bodies[0].max_output_tokens);assert(bodies[1].max_output_tokens<=400);
}));
test('explicit request cap reports the last cause and actual recovery history',()=>harness([reply('{',true),reply({ok:'invalid',preserved:'Retain'})],async({p,budget,sends})=>{
 await assert.rejects(p.reason({...request,maxProviderRequests:2},budget),e=>e.code==='REASONING_CONTRACT_INVALID'&&e.recovery.providerRequests===2&&e.recovery.history.map(h=>h.reason).join(',')==='output-limit,invalid-contract'&&e.recovery.limitReason==='provider-request-limit');assert.equal(sends(),2);
}));
test('repeating malformed JSON stops after its one repair without inventing a length retry',()=>harness([reply('{'),reply('{')],async({p,budget,sends})=>{
 await assert.rejects(p.reason(request,budget),e=>e.code==='INVALID_AGENT_JSON'&&e.recovery.history.length===2&&e.recovery.limitReason==='repair-limit');assert.equal(sends(),2);
}));
test('targeted repair cannot change preserved fields',()=>harness([reply({ok:'invalid',preserved:'Retain'}),reply({ok:true,preserved:'Changed'})],async({p,budget})=>{
 await assert.rejects(p.reason(request,budget),e=>e.code==='REASONING_CONTRACT_INVALID');
}));
test('HTTP recovery consumes the same three-request ceiling and restart cannot replenish it',async()=>{
 let sends=0,reserved=0;const saved=new Map(),p=new OpenAIProvider({reasoningModel:'fixture',maxOutputTokens:100,maxRecoveryOutputTokens:400,reasoningTimeoutMs:5000});
 p.sendReasoning=async()=>{sends++;if(sends===1)return {ok:false,status:503,json:async()=>({error:{message:'Busy',type:'server_error'}})};assert(sends<=3);return {ok:true,json:async()=>({...reply(sends===2?'{':{ok:'invalid',preserved:'Retain'},sends===2),id:'resp_'+sends})};};
 const budget={reserve:async()=>reserved++,receipt:async()=>{},loadResponse:async(_,key)=>saved.get(key),saveResponse:async(_,key,v)=>saved.set(key,v)};
 for(let i=0;i<2;i++)await assert.rejects(p.reason(request,budget),e=>e.code==='REASONING_CONTRACT_INVALID'&&e.recovery.providerRequests===3&&e.recovery.limitReason==='provider-request-limit');
 assert.equal(sends,3);assert.equal(reserved,3);
});
test('full-contract repair cannot increase the configured output ceiling',()=>harness([reply({ok:false,preserved:'Retain'}),reply({ok:true,preserved:'Retain'})],async({p,budget,bodies})=>{
 p.config.maxRecoveryOutputTokens=100;await p.reason({...request,validate:o=>{if(!o.ok)throw Error('Semantic inconsistency');}},budget);
 assert.deepEqual(bodies.map(b=>b.max_output_tokens),[100,100]);
}));
