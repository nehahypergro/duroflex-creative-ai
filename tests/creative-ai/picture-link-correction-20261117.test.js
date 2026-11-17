'use strict';
// Regression from the live Sleepyhead batch (17 Nov 2026): the homepage hero (Sofa Bubbles 2 Seater) failed with
// "Reasoning provider request failed (400) at url" and failed again within seconds on Continue. The inline resend for
// a refused picture link was skipped once the call had used its one extra try, and on Continue the replayed failure
// was judged "already inline" before any link was prepared. The same project made a design locally. Failing before;
// no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const transport=require('../../lib/creative-ai/runtime/reasoning-transport'),fields=require('../../lib/creative-ai/runtime/provider-error-fields');
const refused=(message='Timeout while downloading https://cdn.example/ref.png.')=>({ok:false,status:400,headers:{get:()=>null},json:async()=>({error:{code:'invalid_value',param:'url',message}})});
const ok=()=>({ok:true,json:async()=>({status:'completed',output:[]})});
const store=()=>{const saved=new Map(),keys=[];return {saved,keys,budget:{reserve:async(k,key)=>keys.push(key),loadResponse:async(k,key)=>saved.get(key),saveResponse:async(k,key,v)=>saved.set(key,v)}};};

test('a refused picture link is resent inline even when the call has no retry allowance left',async()=>{
 const s=store();let sends=0,corrected=0;
 const out=await transport({key:'a'.repeat(64),operation:'plan',attempt:0,budget:s.budget,maxHttpRetries:0,prepare:async()=>{},send:async()=>++sends===1?refused():ok(),correctInvalid:async()=>{corrected++;return true;}});
 assert.equal(out.json.status,'completed');assert.equal(sends,2);assert.equal(corrected,1);assert.notEqual(s.keys[0],s.keys[1]);
});
test('after another recovery the correction uses its own request key',async()=>{
 const s=store();let sends=0;
 const out=await transport({key:'b'.repeat(64),operation:'plan',attempt:0,budget:s.budget,maxHttpRetries:1,sleep:async()=>{},prepare:async()=>{},send:async()=>{sends++;if(sends===1)return {ok:false,status:500,headers:{get:()=>null},json:async()=>({error:{code:'server_error'}})};if(sends===2)return refused();return ok();},correctInvalid:async()=>true});
 assert.equal(out.json.status,'completed');assert.equal(sends,3);assert.equal(new Set(s.keys).size,3,'three distinct request identities');
});
test('Continue replays the saved refusal and then resends inline once, without resending the refused request',async()=>{
 const s=store(),key='c'.repeat(64);s.saved.set(key,{version:1,operation:'plan',attempt:0,httpFailure:{status:400,parameter:'url',problem:'url-download-failed',chargeStatus:'unknown',retryNotBefore:0}});let sends=0;
 const out=await transport({key,operation:'plan',attempt:0,budget:s.budget,maxHttpRetries:0,prepare:async()=>{},send:async()=>{sends++;return ok();},correctInvalid:async f=>f.parameter==='url'});
 assert.equal(out.json.status,'completed');assert.equal(sends,1);assert.ok(!s.keys.includes(key),'the refused request is not sent again');
});
test('the correction happens once; a second refusal fails with a plain reason and no provider message',async()=>{
 const s=store();let sends=0;
 await assert.rejects(transport({key:'d'.repeat(64),operation:'plan',attempt:0,budget:s.budget,maxHttpRetries:1,prepare:async()=>{},send:async()=>{sends++;return refused('Timeout while downloading https://cdn.example/secret-path.png');},correctInvalid:async()=>true}),e=>/\(400\) at url \(a picture link timed out\)/.test(e.message)&&!/cdn\.example/.test(e.message));
 assert.equal(sends,2);
 for(const v of s.saved.values())assert.doesNotMatch(JSON.stringify(v),/cdn\.example|secret-path/,'the provider message is never saved');
});
test('refusals are classified into fixed categories only',()=>{
 assert.equal(fields.fields({error:{param:'url',message:'Timeout while downloading https://x/y.png'}}).problem,'url-download-timeout');
 assert.equal(fields.fields({error:{param:'url',message:'Error while downloading https://x/y.png'}}).problem,'url-download-failed');
 assert.equal(fields.fields({error:{param:'input[0].content[3].image_url',message:'Invalid image data'}}).problem,'invalid-image');
 assert.equal(fields.fields({error:{param:'model',message:'anything else'}}).problem,undefined);
});
test('the provider resends inline by its transport, keeps a backup model, and only once',()=>{
 const src=fs.readFileSync(require.resolve('../../lib/creative-ai/runtime/provider'),'utf8');
 assert.match(src,/inlineResent\|\|config\.reasoningInputTransport!=='cdn-url'/);assert.doesNotMatch(src,/JSON\.stringify\(body\)===JSON\.stringify\(originalInlineBody\)/);
 assert.match(src,/for\(const k of \['model','reasoning','store'\]\)if\(k in current\)body\[k\]=current\[k\];/);
});
