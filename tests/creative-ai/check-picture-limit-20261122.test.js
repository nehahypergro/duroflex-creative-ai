'use strict';
// Regression (22 Nov 2026, paid local brochure test, Neha: "with all these new things ... lets run a brochure for
// duroflex and sleepyhead mattress"). The Duroflex Back Magic Pro Plus A4 bi-fold drew both faces, then each face's
// check stopped with "Too many distinct references; select references explicitly before dispatch.": with SKU
// evidence v1 a check sends the artwork, 4 product views, the logo, the construction picture and the label close-ups
// (and the original after a correction), over the fixed 8 pictures per request. Nothing was checked and the job ended
// partial. Pinned records' checks and correction diagnosis now allow 12; everything else keeps 8. No paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const preflight=require('../../lib/creative-ai/runtime/deterministic-preflight');
const {fixture,square}=require('./lean-marketing-fixture');
async function providerCase(callback){
 const old=global.fetch,requests=[];let reservations=0;
 global.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'offline-'+requests.length,status:'completed',output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]})};};
 try{return await callback(new(require('./offline-provider.cjs').OpenAIProvider)({reasoningModel:'fixture',reasoningTimeoutMs:1000}),{reserve:async()=>reservations++,receipt:async()=>{}},{requests,reservations:()=>reservations});}finally{global.fetch=old;}
}
const ask=(n,extra={})=>({instructions:'Fixture',input:{},schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},images:Array.from({length:n},(_,i)=>({id:'ref-'+i,imageData:'fixture'})),...extra});
test('a request may ask for up to 12 pictures; the default stays 8 and nothing passes 12',()=>providerCase(async(provider,budget,state)=>{
 const out=await provider.reason(ask(10,{imageLimit:12}),budget);assert.deepEqual(out,{ok:true});assert.equal(state.requests.length,1,'the brochure check\'s 10 pictures are sent');
 await assert.rejects(()=>provider.reason(ask(9),budget),{code:'REFERENCE_CAPACITY'},'other requests keep 8');
 await assert.rejects(()=>provider.reason(ask(13,{imageLimit:40}),budget),{code:'REFERENCE_CAPACITY'},'never more than 12');
 assert.equal(preflight.imageLimit(4),8,'a request cannot lower the default');assert.equal(preflight.imageLimit('12'),8);
 assert.equal(state.requests.length,1);
}));
const BASE={Duroflex:'https://duroflex.test/cdn/shop/files/',Sleepyhead:'https://sleepyhead.test/cdn/shop/files/'};
const gallery=base=>[
 {id:'sku-product-image-1',label:'Mattress on a bed, angled view',url:base+'M_1.jpg'},
 {id:'sku-product-image-2',label:'Mattress front view',url:base+'M_2.jpg'},
 {id:'sku-product-image-3',label:'Mattress corner close-up',url:base+'M_3.jpg'},
 {id:'sku-product-image-4',label:'Fabric close-up',url:base+'M_4.jpg'},
 {id:'sku-product-image-5',label:'Exploded product cutaway with labelled construction layers',url:base+'M_5.jpg'}];
// Watch every reasoning call the way the real provider admits it (same picture limit), and keep its picture count.
function watch(f){const seen=[],reason=f.runtime.provider.reason;f.runtime.provider.reason=async(request,budget)=>{
 seen.push({kind:request.contextKind,count:(request.images||[]).length,limit:request.imageLimit});
 await preflight.images(request.images||[],{limit:preflight.imageLimit(request.imageLimit)});return reason(request,budget);};return seen;}
const wording=out=>{const c=out.checks.find(x=>x.id==='copy-0');if(c){c.result='clear_mismatch';c.evidence='Headline reads "Suport" instead of "Support"';}};
for(const brand of Object.keys(BASE)){
 test(brand+': a pinned design\'s check and correction diagnosis may send its 4 views, construction picture and close-ups',async t=>{
  let n=0;const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BASE[brand]),identityUrl:BASE[brand]+'M_1.jpg',reviewEdit:out=>{if(++n===1)wording(out);}});
  assert.equal(f.planError,null);const seen=watch(f);await f.run();
  const review=seen.find(s=>s.kind==='lean-review'),diagnosis=seen.find(s=>s.kind==='lean-correction');
  assert.equal(review.limit,12,'the check asks for the larger limit');assert.equal(diagnosis.limit,12,'so does the correction diagnosis');
  assert.ok(review.count>=7,'artwork, 4 views, logo and construction picture: '+review.count);
 });
 test(brand+': designs admitted before SKU evidence keep 8 pictures per check',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BASE[brand]),pinned:false,unpin:['skuEvidenceVersion']});
  const seen=watch(f);await f.run();assert.equal(seen.find(s=>s.kind==='lean-review').limit,undefined);
 });
}
