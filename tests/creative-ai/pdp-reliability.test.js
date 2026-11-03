'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('../../lib/creative-ai/creative-reviewer/examples/synthetic');
const reviewer=require('../../lib/creative-ai/creative-reviewer');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': uncertain emotional appeal alone does not block otherwise verified artwork',async()=>{
 const input=await fixture.inputExample();input.evidence.quality.find(q=>q.criterion==='emotionalAudienceFit').confidence=.61;
 const report=reviewer.evaluate(await reviewer.assembleContext(input));assert.equal(report.decision,'ready');assert.equal(report.qualityScores.find(q=>q.criterion==='emotionalAudienceFit').usedInScore,false);
});
test('missing correction image preserves the original instead of asserting a nonexistent wording revision',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');const {inputExample}=fixture;const input=await inputExample();let pending=false;
 const runtime={beginTask:async()=>{},pendingReview:async()=>{pending=true;return {report:{},ocr:{}};},store:{read:async()=>({wordingAgreementVersion:1}),save:async()=>{}},reviews:{},artifact:async()=>{},finishTask:async()=>{},log:async()=>{}};
 await CreativeRuntime.prototype.inspect.call(runtime,'job',input.package,{imageData:'missing'}, {}, {route:'continuity',placementId:'p'},1);assert.equal(pending,true);
});
test('uncertain required wording stays unverified and confirmed wrong wording still requires correction',async()=>{
 const input=await fixture.inputExample();input.evidence.quality.find(q=>q.criterion==='emotionalAudienceFit').confidence=.1;
 const identity=input.evidence.critical.find(c=>c.criterion==='exact-required-copy');identity.status='unknown';identity.confidence=.4;
 assert.equal(reviewer.evaluate(await reviewer.assembleContext(input)).decision,'unable-to-verify');
 identity.status='fail';identity.confidence=.95;
 assert.equal(reviewer.evaluate(await reviewer.assembleContext(input)).decision,'revise');
});
test('actual pixels cannot bypass a missing wording agreement',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),input=await fixture.inputExample();let pending=false;
 const runtime={store:{read:async()=>({wordingAgreementVersion:1}),dir:()=>'/nonexistent-wording-fixture'},pendingReview:async()=>{pending=true;}};
 await assert.rejects(CreativeRuntime.prototype.inspect.call(runtime,'job',input.package,{imageData:input.artifact.imageData},{},{route:'continuity',placementId:'p'},1),/wording|ENOENT/i);assert.equal(pending,false);
});
test('reasoning image staging preserves bytes/labels, avoids base64 in wire and leaves input unchanged',async()=>{
 const m=require('../../lib/creative-ai/runtime/reasoning-media');const data='data:image/png;base64,'+Buffer.from('original').toString('base64'),body={input:[{role:'user',content:[{type:'input_text',text:'Fact'},{type:'input_image',image_url:data,detail:'high'}]}]};
 const before=structuredClone(body);const wire=await m.prepare(body,{},async rasters=>{assert.equal(rasters[0].bytes.toString(),'original');return [{url:'https://cdn2.gro.care/verified.png'}];});assert.deepEqual(body,before);assert.equal(wire.input[0].content[1].image_url,'https://cdn2.gro.care/verified.png');assert.equal(wire.input[0].content[1].detail,'high');
});
test('only proven connection-before-send failures retry; broken sockets never redispatch',async()=>{
 const send=require('../../lib/creative-ai/runtime/connect-retry');let calls=0;const r=await send(async()=>{if(++calls===1)throw Object.assign(Error('DNS'),{cause:{code:'EAI_AGAIN'}});return 'ok';},{sleep:async()=>{}});assert.equal(r,'ok');assert.equal(calls,2);
 calls=0;await assert.rejects(send(async()=>{calls++;throw Object.assign(Error('socket'),{cause:{code:'UND_ERR_SOCKET',socket:{bytesWritten:400,bytesRead:0}}});},{sleep:async()=>{}}));assert.equal(calls,1);
});
