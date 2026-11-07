'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Readable}=require('node:stream');
const {normalize}=require('../../lib/creative-ai/runtime/campaign-input'),{readJsonBody}=require('../../server');
const samples=require('../../scripts/creative-ai/qa-language-samples');
for(const [language,brief]of Object.entries(samples))test('UTF-8 request and campaign text preserve '+language,async()=>{
 const input={brief:brief+'\n"Sleepyhead" \\ literal &amp; <tag>\t78 × 60',language,audience:'Young adults',market:'India'},bytes=Buffer.from(JSON.stringify(input));
 // Split inside every multibyte sequence as a streamed HTTP body can do.
 const parsed=await readJsonBody(Readable.from([...bytes].map(b=>Buffer.from([b]))),bytes.length);
 assert.deepEqual(parsed,input);assert.deepEqual(normalize(parsed),{...input,objective:'consideration',conceptRoutes:['continuity']});
});
test('request boundary rejects duplicate fields, nested escaped duplicates and double encoding',async()=>{
 for(const body of ['{"language":"Hindi","language":"English"}','{"nested":{"a":1,"\\u0061":2}}','"{\\"brief\\":\\"test\\"}"','[]','null'])await assert.rejects(()=>readJsonBody(Readable.from([Buffer.from(body)]),1000));
});
test('invalid UTF-8 and oversized multibyte bodies reject without replacement characters',async()=>{
 await assert.rejects(()=>readJsonBody(Readable.from([Buffer.from([123,34,97,34,58,34,0xc3,0x28,34,125])]),100),/encoded data/);
 const bytes=Buffer.from('{"brief":"हिन्दी"}');await assert.rejects(()=>readJsonBody(Readable.from([bytes]),bytes.length-1),/too large/);
});
test('invalid brief metadata rejects before loading research, creating jobs or paid dispatch',async()=>{
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');let entered=0;
 const runtime={researchSessions:{prepare:async()=>{entered++;throw Error('Too late');}}};
 for(const change of [{language:{}},{language:'x'.repeat(161)},{language:'  '},{language:null},{audience:[]},{audience:'x'.repeat(2001)},{objective:'sales'},{objective:4},{market:'x'.repeat(161)},{brief:'bad\u0000text'},{brief:'bad\ud800text'},{brief:'x'.repeat(5001)}])await assert.rejects(()=>CreativeRuntime.prototype.createRequest.call(runtime,{brief:'Sleepyhead test',...change}),/campaign input|Brief/);
 assert.equal(entered,0);
 assert.equal(normalize({brief:' '}).language,'English');assert.equal(normalize({brief:'x'.repeat(5000)}).brief.length,5000);
});
test('script-aware numeric checks preserve values, repetition and reject new hidden digits',()=>{
 const {numericTokens:n}=require('../../lib/creative-ai/runtime/text-boundary');
 for(const text of ['७८ × ६० × ६','٧٨ × ٦٠ × ٦','৭৮ × ৬০ × ৬','௭௮ × ௬௦ × ௬','۷۸ × ۶۰ × ۶','７８ × ６０ × ６'])assert.deepEqual(n(text),n('78 × 60 × 6'));
 assert.deepEqual(n('١٢٫٥'),n('12.5'));assert.notDeepEqual(n('१२३'),n(''));assert.notDeepEqual(n('६ × ६'),n('6'));assert.notDeepEqual(n('७८ × ६० × ८'),n('78 × 60 × 6'));
});
test('translation plan accepts equivalent script digits but rejects invented numbers and changed dimensions',()=>{
 const {validatePlan}=require('../../lib/creative-ai/runtime/refinements'),visual={scene:'Room',composition:'Bed',imageTreatment:'Photo',camera:'Eye level',lighting:'Evening'};
 const record={exactCopy:{fields:[{id:'h',text:'78 × 60 × 6 inches'}]},artDirection:visual},plan={accepted:true,reason:'Fixture',fields:[{id:'h',text:'७८ × ६० × ६ इंच'}],visual,explanation:'Fixture'};
 validatePlan(plan,{action:'translate'},record);
 plan.fields[0].text='७८ × ६० × ८ इंच';assert.throws(()=>validatePlan(plan,{action:'translate'},record),/numeric/);
 record.exactCopy.fields[0].text='Explore Original';plan.fields[0].text='Original देखें — १००';assert.throws(()=>validatePlan(plan,{action:'translate'},record),/numeric/);
});
test('oversized output cannot be accepted then crash the saved-raster decoder after generation',async()=>{
 const p=require('../../lib/creative-ai/runtime/placements'),pk=require('../../lib/creative-ai/placement-knowledge'),{exportWholeStatic}=require('../../lib/creative-ai/runtime/export');
 const profile={id:'custom:large-qa',name:'Large fixture',platform:'Test',publisher:'Test',placement:'Banner',assetType:'static',canvas:{width:10000,height:10000,unit:'px'},exportContract:{formats:['png']}};
 const {selections}=p.resolve({brandUrl:'https://mysleepyhead.com/',placementIds:[profile.id],customProfiles:[profile]});assert.equal(selections[0].description.supported,false);
 await assert.rejects(()=>exportWholeStatic('not even decoded',{canvas:{width:10000,height:10000}}),/40 million/);
 for(const [w,h]of [[0,100],[1.5,100],[NaN,100],[Infinity,100],[100,0]])assert.throws(()=>p.generationSize(w,h),/integer/);
 for(const [w,h]of [[20,1],[1,20],[1080,1920],[1200,628]]){const g=p.generationSize(w,h);assert.ok(g.crop.x>=0&&g.crop.y>=0);assert.ok(Math.abs(g.crop.width/g.crop.height-w/h)<1e-9);}
 assert.throws(()=>p.generationSize(2001,100),/ratio/);assert.throws(()=>p.generationSize(100,2001),/ratio/);
});
test('custom format and multi-format errors reject deterministically before generation',()=>{
 const f=require('../../lib/creative-ai/runtime/output-formats'),base={placementIds:['custom:studio-social-story']};assert.equal(f.validate({placementIds:['custom:studio-carousel-square','custom:studio-social-story'],carouselSlideCount:6}).units,7);
 for(const value of [{placementIds:[...base.placementIds,...base.placementIds]},{placementIds:['custom:studio-carousel-square'],carouselSlideCount:7},{...base,customProfiles:[{id:'custom:studio-social-story'}]},{...base,placementViewing:{foreign:{displayWidthCss:360}}}])assert.throws(()=>f.validate(value));
});
module.exports={samples};
test('market and other-objective details reach strategy unchanged instead of disappearing',()=>{
 const {strategyFields}=require('../../lib/creative-ai/runtime/campaign-input');
 const input=normalize({brief:'Sleepyhead fixture',language:'Arabic',objective:'other',objectiveDetail:'Introduce an existing range',market:'UAE',desiredAction:'Explore Original'});
 assert.deepEqual(strategyFields(input),{market:'UAE',objectiveDetail:'Introduce an existing range',desiredAction:'Explore Original'});
});
test('agent schema rejects unpaired surrogates but retains complete emoji and script joining characters',()=>{
 const {check}=require('../../lib/creative-ai/marketing-strategist/schema-validator'),schema={type:'string',maxLength:200};
 for(const value of ['bad\ud800','bad\udfff'])assert.ok(check(schema,value).some(e=>e.includes('Unicode')));
 for(const value of ['👩🏽‍💻','👨‍👩‍👧‍👦','क्‍ष','cafe\u0301','اكتشف Original'])assert.deepEqual(check(schema,value),[]);
});
test('long briefs split into bounded campaign rules without losing Unicode, newlines or exact instructions',()=>{
 const {campaignGuide}=require('../../lib/creative-ai/runtime/brand-guide-cache'),prefix='Current campaign instructions; not substantiation of product claims: ';
 const cap=2000-prefix.length;
 for(const brief of ['x'.repeat(5000),'x'.repeat(cap-1)+'👩🏽‍💻\nSleepyhead &amp; "Original"','हिन्दी '.repeat(650)+'\nNo invented offers','اكتشف Original\n'.repeat(200)]){
  const input=normalize({brief}),guide=campaignGuide({requirements:[]},input.brief);
  assert.equal(guide.requirements.map(r=>r.text.slice(prefix.length)).join(''),input.brief);
  assert.ok(guide.requirements.every(r=>r.text.length<=2000&&r.text.isWellFormed()));
  assert.equal(new Set(guide.requirements.map(r=>r.id)).size,guide.requirements.length);
 }
});
test('campaign objectives retain exact multilingual brief and user audience without importing defaults',()=>{
 for(const objective of ['awareness','consideration','action','retention','other']){
  const input={brief:'Sleepyhead: रात का कमरा; decide people and lighting from this brief.',objective,language:'Hinglish',audience:'People setting up their first home',market:'India',...(objective==='other'?{objectiveDetail:'Explore a campaign direction'}:{})};
  assert.deepEqual(normalize(input),{...input,conceptRoutes:['continuity']});
 }
});
