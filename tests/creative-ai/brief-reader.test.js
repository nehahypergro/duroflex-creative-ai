'use strict';
// Home-page brief box (8 Nov 2026): one small paid reasoning call reads a free-text brief
// and suggests Studio choices. These checks keep it honest: only this brand's products and
// listed asset cards, exact wording copied word for word, unclear product/variant and
// missing offer details always become questions, one request per request key, and the
// call is counted by the shared cost ledger.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const mod=require('../../lib/creative-ai/runtime/brief-reader');
const products=[{id:'product-aaaaaaaaaaaaaaaaaaaa',name:'Sofa Bubbles',sku:'SB-3',category:'Sofas',variants:[{id:'101',name:'3 Seater / Teal Blue'},{id:'102',name:'3 Seater / Grey'}]},{id:'product-bbbbbbbbbbbbbbbbbbbb',name:'Napster Mini Pillow',sku:'NP-1',category:'Pillows',variants:[{id:'201',name:'Default Title'}]}];
const brief='Diwali offer on Sofa Bubbles in Teal Blue for young couples. Flat 30% off till 15 Nov. Stories for Insta and FB. Keep it fun, Hinglish.';
const good=(o={})=>({ask:'Get young couples to buy Sofa Bubbles this Diwali using the flat 30% off.',product:{productId:products[0].id,candidateIds:[],variantId:'101',briefName:'Sofa Bubbles',evidence:'Sofa Bubbles in Teal Blue'},assets:[{cardId:'instagram-story',source:'brief',reason:'Stories for Insta'},{cardId:'facebook-story',source:'brief',reason:'Stories for FB'}],messageType:{value:'Offer / price / EMI',source:'brief'},objective:{value:'Purchase',source:'suggested',reason:'An offer with an end date'},language:{value:'Hinglish',source:'brief'},audience:{value:'Young couples',source:'brief'},tone:{value:'Fun',source:'brief'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'Flat 30% off',terms:'',startDate:'',endDate:'2026-11-15'},exactWording:[{text:'Flat 30% off',kind:'offer'}],occasion:{value:'Diwali',source:'brief'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:['Objective: Purchase'],questions:[],...o});
async function fixture(respond){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brief-reader-'));
 const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine'),base=new CreativeRuntime({root,provider:{}});
 const calls=[];const provider={reason:async(req,budget)=>{calls.push(req);await budget.reserve('reasoning','brief-read-'+calls.length);const out=await respond(req,calls.length);await req.validate(out);await budget.receipt({kind:'reasoning',model:'gpt-6-luna',requestId:'resp_'+calls.length,requestKey:'brief-read-'+calls.length,recordedAt:new Date().toISOString(),usage:{input_tokens:1200,output_tokens:400}});return out;}};
 const brand={id:'brand-11111111-1111-1111-1111-111111111111',name:'Sleepyhead',brandUrl:'https://example.com/'};
 const runtime={root,config:base.config,provider,brands:{read:async id=>{if(id!==brand.id)throw Object.assign(Error('missing'),{code:'ENOENT'});return brand;},products:{catalog:async()=>products}}};
 const reader=new mod.BriefReader(runtime);await reader.ready;
 return {root,runtime,reader,calls,brand,done:()=>fs.rm(root,{recursive:true,force:true})};
}
const ask=(f,extra={})=>f.reader.read(f.brand.id,{brandName:'Sleepyhead',brief,requestKey:'brief-key-0001',...extra});

test('a clear brief becomes a campaign suggestion with exact offer wording kept',async()=>{
 const f=await fixture(()=>good());try{
  const r=await ask(f);
  assert.equal(r.status,'finished');assert.equal(r.result.decision,'campaign');
  assert.deepEqual(r.result.assets.map(a=>a.cardId),['instagram-story','facebook-story']);
  assert.equal(r.result.product.variantId,'101');assert.deepEqual(r.result.questions.map(q=>q.field),['offerValidity'],'terms were not given, so we ask');
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].contextKind,'brief-reading');
  // Only this brand's products and listed cards reach the model.
  assert.deepEqual(f.calls[0].input.products.map(p=>p.id),products.map(p=>p.id));
  assert.ok(f.calls[0].input.assetCards.every(c=>c.id&&c.name));
 }finally{await f.done();}
});

test('a single asset is a design, not a campaign',async()=>{
 const f=await fixture(()=>good({assets:[{cardId:'instagram-story',source:'brief',reason:'Story'}]}));try{assert.equal((await ask(f)).result.decision,'design');}finally{await f.done();}
});

test('reworded or invented exact wording, unknown products and unknown cards are rejected',()=>{
 const ctx={products,brief,documents:[]};
 assert.doesNotThrow(()=>mod.validate(good(),ctx));
 assert.doesNotThrow(()=>mod.validate(good({exactWording:[{text:'flat  30% OFF',kind:'offer'}]}),ctx),'case and spacing may differ');
 assert.throws(()=>mod.validate(good({exactWording:[{text:'Flat 40% off',kind:'offer'}]}),ctx),/word for word/);
 assert.throws(()=>mod.validate(good({exactWording:[{text:'Free delivery',kind:'offer'}]}),ctx),/word for word/);
 assert.throws(()=>mod.validate(good({product:{productId:products[0].id,candidateIds:[],variantId:'101',briefName:'Sofa Bubbles Pro',evidence:''}}),ctx),/briefName/);
 assert.throws(()=>mod.validate(good({offer:{wording:'Flat 40% off',terms:'',startDate:'',endDate:''}}),ctx),/offer.wording/);
 assert.throws(()=>mod.validate(good({offer:{wording:'Flat 30% off',terms:'',startDate:'',endDate:'15 Nov'}}),ctx),/YYYY-MM-DD/);
 assert.throws(()=>mod.validate(good({product:{productId:'product-cccccccccccccccccccc',candidateIds:[],variantId:'',briefName:'',evidence:''}}),ctx),/listed product/);
 assert.throws(()=>mod.validate(good({product:{productId:products[0].id,candidateIds:[],variantId:'201',briefName:'',evidence:''}}),ctx),/variantId/);
 assert.throws(()=>mod.validate(good({assets:[{cardId:'youtube-thumbnail',source:'brief',reason:''}]}),ctx),/unlisted card/);
 assert.throws(()=>mod.validate(good({assets:[{cardId:'instagram-story',source:'brief',reason:''},{cardId:'instagram-story',source:'suggested',reason:''}]}),ctx),/twice/);
});

test('an unclear product or variant and missing offer details always become questions',()=>{
 const ctx={products};
 const noProduct=mod.finish(good({product:{productId:'',candidateIds:[products[0].id,products[1].id],variantId:'',briefName:'',evidence:''}}),ctx);
 assert.equal(noProduct.questions[0].field,'product');
 const noVariant=mod.finish(good({product:{productId:products[0].id,candidateIds:[],variantId:'',briefName:'',evidence:''}}),ctx);
 assert.ok(noVariant.questions.some(q=>q.field==='variant'));
 const single=mod.finish(good({product:{productId:products[1].id,candidateIds:[],variantId:'',briefName:'',evidence:''}}),ctx);
 assert.equal(single.product.variantId,'201');assert.ok(!single.questions.some(q=>q.field==='variant'));
 const offer=mod.finish(good({offer:{wording:'',terms:'',startDate:'',endDate:''}}),ctx);
 assert.ok(offer.questions.some(q=>q.field==='offerWording'));assert.ok(offer.questions.some(q=>q.field==='offerValidity'));
 const noTerms=mod.finish(good(),ctx);assert.match(noTerms.questions.find(q=>q.field==='offerValidity').question,/terms/,'an end date without terms still asks for terms');
 const complete=mod.finish(good({offer:{wording:'Flat 30% off',terms:'On selected sizes',startDate:'',endDate:'2026-11-15'}}),ctx);assert.ok(!complete.questions.length);
 const benefit=mod.finish(good({messageType:{value:'Benefit',source:'brief'},exactWording:[]}),ctx);
 assert.ok(!benefit.questions.some(q=>/offer/.test(q.field)));
});

test('the same request key never sends a second paid call, and a different brief cannot reuse it',async()=>{
 const f=await fixture(()=>good());try{
  const first=await ask(f),again=await ask(f);
  assert.equal(again.id,first.id);assert.equal(f.calls.length,1);
  await assert.rejects(()=>ask(f,{brief:'Something else entirely.'}),/cannot be reused/);
  assert.equal(f.calls.length,1);
 }finally{await f.done();}
});

test('wrong brand, empty brief and missing request key are refused before any paid call',async()=>{
 const f=await fixture(()=>good());try{
  await assert.rejects(()=>ask(f,{brandName:'Duroflex'}),/another brand/);
  await assert.rejects(()=>ask(f,{brief:'   '}),/Write a line/);
  await assert.rejects(()=>ask(f,{requestKey:'x'}),/request ID/);
  await assert.rejects(()=>ask(f,{brief:'x'.repeat(13000)}),/under/);
  assert.equal(f.calls.length,0);
 }finally{await f.done();}
});

test('a failed read is saved as failed, says nothing else started, and is not retried',async()=>{
 const f=await fixture(()=>{throw Error('provider down');});try{
  const r=await ask(f);assert.equal(r.status,'failed');assert.match(r.error,/Nothing was started/);assert.equal(f.calls.length,1);
 }finally{await f.done();}
});

test('brief reads are counted in the shared cost ledger',async()=>{
 const f=await fixture(()=>good());try{
  await ask(f);
  const {CostTracker}=require('../../lib/cost-tracker');
  const snap=await new CostTracker(f.root,{brands:[{id:f.brand.id,name:'Sleepyhead'}]}).snapshot();
  const rows=snap.entries.filter(e=>e.sourceFamily==='brief-reads');
  assert.equal(rows.length,1);assert.equal(rows[0].brandId,f.brand.id);
 }finally{await f.done();}
});

test('the real provider path sends the brief-reading schema and the low-effort model route',async()=>{
 const {OpenAIProvider}=require('./offline-provider.cjs');
 const f=await fixture(()=>good());try{
  const p=new OpenAIProvider({...f.runtime.config,apiKey:'offline',reasoningTimeoutMs:5000,reasoningBackground:false});let body;
  p.sendReasoning=async b=>(body=b,{ok:true,json:async()=>({id:'resp_real',status:'completed',usage:{input_tokens:900,output_tokens:300},output:[{content:[{type:'output_text',text:JSON.stringify(good())}]}]})});
  p.inputPreflight=async()=>({status:'passed',method:'offline-test',inputTokens:1500});// production counts tokens through the API
  f.runtime.provider=p;
  const r=await ask(f,{requestKey:'brief-key-real'});
  assert.equal(r.status,'finished',r.error||'');assert.equal(r.result.decision,'campaign');
  assert.equal(body.reasoning.effort,'low');assert.equal(body.model,f.runtime.config.reasoningModel);
  assert.equal(body.text.format.type,'json_schema');
  assert.ok(JSON.stringify(body.input).includes('Sofa Bubbles'));
 }finally{await f.done();}
});

test('a mattress brief does not ask for the size; the Queen default is used instead',()=>{
 const mattress={id:'product-mmmmmmmmmmmmmmmmmmmm',name:'Prana Mattress',sku:'',category:'Mattress',variants:[{id:'1',name:'Single / 72 x 30'},{id:'3',name:'Queen / 72 x 60'}]};
 const r=mod.finish(good({product:{productId:mattress.id,candidateIds:[],variantId:'',briefName:'',evidence:''},messageType:{value:'Benefit',source:'brief'}}),{products:[mattress]});
 assert.ok(!r.questions.some(q=>q.field==='variant'));
});
