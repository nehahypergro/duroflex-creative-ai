'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parse}=require('../../lib/creative-ai/runtime/strict-json'),deterministic=require('../../lib/creative-ai/runtime/deterministic-output'),{check}=require('../../lib/creative-ai/marketing-strategist/schema-validator');
test('JSON boundary rejects duplicate and escaped-equivalent keys rather than losing the first value',()=>{
 for(const raw of ['{"status":"blocked","status":"ready"}','{"x":[{"id":1,"\\u0069d":2}]}','{"text":"first","text":"second"}'])assert.throws(()=>parse(raw),/Duplicate JSON field/);
 for(const value of [{text:'नया “LiveIn” — × ²',json:'{"a":1,"a":2}',rows:[{id:1},{id:2}]},[],null,3,'hello'])assert.deepEqual(parse(JSON.stringify(value)),value);
 assert.throws(()=>parse('{"text":'),SyntaxError);assert.throws(()=>parse('['.repeat(202)+'0'+']'.repeat(202)),/nesting/);
});
test('schema boundary treats prototype-named properties as ordinary unknown fields',()=>{
 const schema={type:'object',properties:{name:{type:'string'}},required:['name'],additionalProperties:false};
 for(const key of ['__proto__','constructor','toString'])assert.ok(check(schema,JSON.parse('{"name":"ok","'+key+'":"unexpected"}')).some(e=>e.includes('unexpected field')));
 assert.ok(check(schema,Object.create({name:'inherited'})).some(e=>e.includes('required')));
 assert.deepEqual(check({type:'array'},[]),[]);
});
test('supplied conflicting code constants are rejected; omitted ones are assembled locally',()=>{
 const schema={type:'object',properties:{version:{const:1},width:{const:1080},status:{enum:['not-run']}},additionalProperties:false};
 assert.deepEqual(deterministic.restore({},schema),{version:1,width:1080,status:'not-run'});
 for(const value of [{version:2},{width:1920},{status:'ready'}])assert.throws(()=>deterministic.restore(value,schema),/code-owned constant/);
});
test('unit and evidence bindings are frozen and duplicate bindings fail before paid work',()=>{
 const schema={type:'object',properties:{rows:{type:'array',items:{type:'object',properties:{id:{type:'string'},text:{type:'string'}},required:['id','text'],additionalProperties:false}}},required:['rows'],additionalProperties:false};
 const bindings=[{id:'first'},{id:'second'}],wire=require('../../lib/creative-ai/runtime/unit-wire').wire({schema,input:{},instructions:''},'rows',bindings);bindings[0].id='changed';
 assert.equal(wire.decode({rows:{unit0:{text:'A'},unit1:{text:'B'}}}).rows[0].id,'first');
 assert.throws(()=>require('../../lib/creative-ai/runtime/unit-wire').wire({schema,input:{},instructions:''},'rows',[{id:'same'},{id:'same'}]),/unique/);
 assert.throws(()=>require('../../lib/creative-ai/runtime/complete-review').contract(schema,{rows:{key:'id',ids:['same','same']}}),/Duplicate/);
 const review=require('../../lib/creative-ai/runtime/complete-review').contract(schema,{rows:{key:'id',ids:['first']}});
 assert.throws(()=>review.decode({rows:{first:{id:'first',text:'A',unexpected:'cannot discard'}}}),/unexpected field/);
});
async function providerCase(texts,callback){
 const old=global.fetch,requests=[],receipts=[];let reservations=0;
 global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'offline-'+requests.length,status:'completed',output:[{content:[{type:'output_text',text:texts[requests.length-1]}]}]})};};
 try{return await callback(new(require('./offline-provider.cjs').OpenAIProvider)({reasoningModel:'fixture',reasoningTimeoutMs:1000}),{reserve:async()=>reservations++,receipt:async r=>receipts.push(r)},{requests,receipts,reservations:()=>reservations});}finally{global.fetch=old;}
}
test('provider validates schema even without a custom validation callback',()=>providerCase(['{"ok":"wrong"}','{"ok":true}'],async(provider,budget,state)=>{
 const out=await provider.reason({instructions:'Fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget);
 assert.deepEqual(out,{ok:true});assert.equal(state.requests.length,2);assert.match(state.requests[1].input[0].content[0].text,/expected boolean/);
}));
test('final schema validation follows code-owned assembly without a predictable repair',()=>providerCase(['{"text":"Exact"}'],async(provider,budget,state)=>{
 const out=await provider.reason({instructions:'Fixture',input:{},schema:{type:'object',properties:{text:{type:'string'},binding:{type:'string'}},required:['text','binding'],additionalProperties:false},wire:{schema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},input:{},decode:o=>o},validate:o=>{o.binding='code-owned';}},budget);
 assert.deepEqual(out,{text:'Exact',binding:'code-owned'});assert.equal(state.requests.length,1);
}));
test('provider never accepts double-encoded objects or duplicate keys as a valid response',async()=>{
 for(const invalid of ['"{\\"ok\\":true}"','{"ok":false,"ok":true}','{"ok":true,"toString":"extra"}'])await providerCase([invalid,invalid],async(provider,budget,state)=>{
  await assert.rejects(()=>provider.reason({instructions:'Fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget));assert.equal(state.requests.length,2);
 });
});
test('excess reference images fail before reservation instead of being silently dropped',()=>providerCase([],async(provider,budget,state)=>{
 await assert.rejects(()=>provider.reason({instructions:'Fixture',input:{},schema:{type:'object'},images:Array.from({length:9},(_,i)=>({id:'ref-'+i,imageData:'fixture'}))},budget),/8 selected images/);
 assert.equal(state.requests.length,0);assert.equal(state.reservations(),0);
}));
test('digital inventory expands into distinct units with valid raster dimensions',()=>{
 const cases=require('../../scripts/creative-ai/qa-digital-matrix').cases(),resolve=require('../../lib/creative-ai/runtime/placements').resolve;
 assert.ok(cases.length>=76);let count=0;
 for(const row of cases){const {selections}=resolve({brandUrl:'https://example.com',placementIds:[row.id],carouselSlideCount:4,customProfiles:row.customProfiles});assert.equal(new Set(selections.map(s=>s.id)).size,selections.length);for(const s of selections){const {width,height}=s.description.dimensions;assert.ok(Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&width>0&&height>0);count++;}}
 assert.ok(count>=82);
});
