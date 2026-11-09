'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const M=require('../../public/creative-ai/studio-model');
const root=path.resolve(__dirname,'../..');
// Pin this suite's admission policy without depending on mutable local workspace settings.
let policyRoot;
test.before(async()=>{const fs=require('node:fs/promises'),od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare;policyRoot=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'studio-lean-policy-'));await fs.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));test.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));});
test.after(async()=>{test.mock.restoreAll();if(policyRoot)await require('node:fs/promises').rm(policyRoot,{recursive:true,force:true});});
const cases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']];
async function fixture(c){const {CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});await require('./helpers/pinned-research-fixture').pin(runtime,c[0]);const p=await runtime.brands.products.read(...c),d=M.startDraft(c[0],'quick',1);Object.assign(d,{name:'Square acceptance',brief:'Invite friends. Preserve "हैलो" & <literal> as text. No price or offer.',audience:'People furnishing their shared living room',productId:p.id,variant:p.variants[0].id});return {runtime,d,p};}
test('square readiness uses saved same-brand files and preserves brief without model calls',async()=>{const g=require('../../lib/creative-ai/runtime/studio-generation');for(const c of cases){const {runtime,d,p}=await fixture(c),a=await g.prepare(runtime,d),b=await g.prepare(runtime,d);assert.equal(a.token,b.token);assert.equal(a.request.productName,p.name);assert.equal(a.request.productVariantId,d.variant);assert.ok(a.request.brief.includes(d.brief));assert.equal(a.request.audience,d.audience);assert.equal(a.request.editableCanvas,false);assert.equal(a.request.editableTextVersion,undefined);assert.equal(a.request.composedTextVersion,undefined);assert.equal(a.request.leanWorkflowVersion,1);assert.equal(a.summary.options,2);assert.deepEqual(require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections[0].description.dimensions,{width:1080,height:1080,ratio:1});assert.ok(a.checks.every(c=>c.status==='passed'));}});
test('lean website readiness uses font metadata and omit-logo policy without editor asset files for both brands',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c),read=runtime.brands.read.bind(runtime.brands);
  runtime.brands.read=async id=>{const brand=await read(id);brand.canvasAssets.fonts=brand.canvasAssets.fonts.map(f=>({...f,filename:'not-an-installed-editor-font.ttf'}));brand.canvasAssets.logo.filename='unused-omitted-logo.png';return brand;};
  d.outputs=[M.output(7)];d.outputs[0].staticValues={brandedHost:'Yes'};const prepared=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);
  assert.equal(prepared.request.leanWorkflowVersion,1);assert.equal(prepared.summary.options,2);assert(prepared.checks.some(c=>c.label==='Added logo omitted for this publishing context'));assert(prepared.request.campaignClarification.text);
 }
});
test('unsupported size, cross-brand SKU and device-only references stop before dispatch',async()=>{const g=require('../../lib/creative-ai/runtime/studio-generation');for(const c of cases){const {runtime,d}=await fixture(c);await assert.rejects(()=>g.prepare(runtime,{...d,outputs:[{...d.outputs[0],width:1200}]}),/square/i);await assert.rejects(()=>g.prepare(runtime,{...d,productId:cases.find(x=>x[0]!==c[0])[1]}));await assert.rejects(()=>g.prepare(runtime,{...d,references:[{id:'device',kind:'device-file',name:'ref.png'}]}),/reference/i);await assert.rejects(()=>g.prepare(runtime,{...d,variant:'not-a-variant'}),/variant/i);}});
test('retry after lost response reopens same submitted job, edited brief needs a fresh readiness token',async()=>{const g=require('../../lib/creative-ai/runtime/studio-generation');const {runtime,d}=await fixture(cases[0]);const a=await g.prepare(runtime,d);let calls=0,jobs=[];runtime.store={list:async()=>jobs};runtime.create=async intake=>{calls++;jobs.push({id:'creative-existing',intake});return 'creative-existing';};assert.equal((await g.submit(runtime,{draft:d,token:a.token})).id,'creative-existing');assert.equal((await g.submit(runtime,{draft:d,token:a.token})).id,'creative-existing');assert.equal(calls,1);await assert.rejects(()=>g.submit(runtime,{draft:{...d,brief:'Changed brief'},token:a.token}),/changed|readiness/i);});
test('saved square briefs retain scoped font preferences and require approved named fonts for both brands',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c),p=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);
  const assets=await require('../../lib/creative-ai/runtime/editable').prerequisites(runtime,p.request);
  assert.equal(assets.brandId,c[0]);assert.ok(assets.fonts.length);assert.ok(assets.fonts.every(f=>f.brandId===c[0]&&f.approved&&f.name));
  assert.ok(p.checks.some(c=>c.label==='Complete artwork · named brand fonts'&&c.status==='passed'));
  assert.match(p.request.campaignClarification?.text||'',/Alternative fonts are permitted/);
  const original={facts:p.request.campaignClarification.nonEssentialFactIds.map(id=>({id,kind:'brand',status:'conflicted',essential:true})),additionalSources:[],assignment:{brief:d.brief,goal:d.audience},guardian:{establishedPositioningFactIds:[],requirements:[]}};
  const applied=require('../../lib/creative-ai/runtime/strategy-clarification').applyCampaign(original,p.request);
  assert.match(applied.guardian.requirements.find(r=>r.id==='campaign-clarification').text,/Alternative fonts are permitted/);
  assert.equal(original.guardian.requirements.length,0,'Applying campaign preferences preserves the source');
 }
});
test('Stories use one shared readiness profile in UI and runtime for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[{...d.outputs[0],featureId:8,formatId:'story',width:1080,height:1920,slides:1,staticValues:{publishing:'Organic',headline:'Room for your story',cta:'Explore'}}];const g=require('../../lib/creative-ai/runtime/studio-generation');assert.equal(g.supported(d),true);assert.equal(M.generationProfile(d).placementId,'custom:studio-social-story');const a=await g.prepare(runtime,d);assert.equal(a.summary.height,1920);assert.deepEqual(a.request.placementIds,['custom:studio-social-story']);assert.match(a.request.brief,/1080 × 1920/);assert.doesNotMatch(a.request.brief,/one square post/);assert.match(a.request.brief,/Room for your story/);assert.deepEqual(require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections[0].description.dimensions,{width:1080,height:1920,ratio:.563});assert.notEqual(a.token,(await g.prepare(runtime,{...d,outputs:[{...d.outputs[0],featureId:1,formatId:'square',height:1080}]})).token);for(const patch of [{height:1080},{slides:2},{featureId:16},{formatId:'square'}])assert.equal(g.supported({...d,outputs:[{...d.outputs[0],...patch}]}),false);}});
test('connected recipe requests retain carousel order, module dimensions and deterministic logo rules for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c),g=require('../../lib/creative-ai/runtime/studio-generation');for(const f of [7,9,6,5,14]){const x=structuredClone(d);x.outputs=[M.output(f)];const o=x.outputs[0];if(f===7)o.staticValues={brandedHost:'Yes'};if(f===9){o.slides=3;o.staticParts=[1,2,3].map(i=>({id:'part-'+i,name:'Slide '+i,copy:'Exact '+i,width:1080,height:1080}));}if(f===6){o.staticValues={marketplace:'QA modules',template:'Explicit test dimensions; not marketplace certification',eligibility:'Pending marketplace review'};o.staticParts=[{id:'hero',name:'Hero',copy:'First',width:970,height:600},{id:'detail',name:'Detail',copy:'Second',width:970,height:300}];}const a=await g.prepare(runtime,x),ss=require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections;assert.equal(a.request.productVariantId,d.variant);if(f===9){assert.equal(ss.length,3);assert.deepEqual(ss.map(s=>s.jobInputs.logoPolicy.treatment),['include','omit','include']);assert.match(a.request.brief,/Exact 1/);assert.equal(a.request.carouselSlideCount,3);}if(f===6)assert.deepEqual(ss.map(s=>s.description.dimensions.height),[600,300]);if([7,5].includes(f))assert.ok(ss.every(s=>s.jobInputs.logoPolicy.treatment==='omit'));}}});
test('missing commercial facts stop connected offer, proof, store and partner recipes before any dispatch',async()=>{const {runtime,d}=await fixture(cases[0]),g=require('../../lib/creative-ai/runtime/studio-generation');for(const f of [2,3,4,6,10,12,15]){const x={...d,outputs:[M.output(f)]};if(f===15)Object.assign(x.outputs[0],{formatId:'custom',width:1200,height:628});await assert.rejects(()=>g.prepare(runtime,x),/Complete/);}});
test('module readiness creates a store-valid bounded idempotency key before any paid request',async()=>{const {runtime,d}=await fixture(cases[0]);d.outputs=[M.output(6)];d.outputs[0].staticValues={marketplace:'QA',template:'QA module 970 × 600',eligibility:'Unverified'};d.outputs[0].staticParts=[{id:'a',name:'Hero',width:970,height:600,copy:'Exact'}];const a=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.match(a.request.requestKey,/^[a-zA-Z0-9_-]{8,100}$/);assert.equal(a.request.requestKey,(await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d)).request.requestKey);});
test('complete module sets above the former 3/6/20 ceilings preserve every item for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c);for(const count of [4,7,12,21]){d.outputs=[M.output(6)];d.outputs[0].staticValues={marketplace:'QA',template:'Explicit modules',eligibility:'Pending'};d.outputs[0].staticParts=Array.from({length:count},(_,i)=>({id:'part-'+i,name:'Module '+i,copy:'Exact',width:970,height:600}));const prepared=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.equal(prepared.request.placementIds.length,count);const selected=require('../../lib/creative-ai/runtime/placements').resolve(prepared.request).selections;assert.equal(selected.length,count);assert.equal(new Set(selected.map(s=>s.id)).size,count);}}});
test('multi-module brief asks for complete options without contradicting per-module dimensions',async()=>{const {runtime,d}=await fixture(cases[0]);d.creativeCount=2;d.outputs=[M.output(6)];d.outputs[0].staticValues={marketplace:'QA',template:'Explicit modules',eligibility:'Pending'};d.outputs[0].staticParts=[{id:'a',name:'Hero',width:970,height:600,copy:'Hero'},{id:'b',name:'Detail',width:970,height:300,copy:'Detail'}];const p=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.match(p.request.brief,/two model-rendered options of the complete ordered/);assert.doesNotMatch(p.request.brief,/for this one .*970 × 600/);});

test('invalidated research still blocks readiness for each brand without dispatch',async()=>{for(const c of cases){const {runtime,d}=await fixture(c),brand=await runtime.brands.read(c[0]);runtime.brands.read=async()=>({...brand,latestResearchId:null});await assert.rejects(()=>require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d),/Complete this brand.s research/);}});

test('landscape feed and offer Story preserve exact route, brief terms and export dimensions for both brands',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);
 for(const [featureId,formatId,width,height,placementId]of [[1,'feed-landscape',1200,628,'custom:studio-social-landscape'],[8,'story',1080,1920,'custom:studio-social-story']]){
  const x=structuredClone(d);x.brief='Festive offer: ₹25,000 for selected Queen only; valid 24–31 October. No additional discount.';x.outputs=[{...M.output(featureId),formatId,width,height,slides:1,...(featureId===8?{staticValues:{publishing:'Organic'}}:{})}];
  const prepared=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,x);
  assert.deepEqual(prepared.request.placementIds,[placementId]);assert.ok(prepared.request.brief.includes(x.brief));assert.deepEqual([prepared.summary.width,prepared.summary.height],[width,height]);
  const selection=require('../../lib/creative-ai/runtime/placements').resolve(prepared.request).selections[0];assert.deepEqual([selection.description.dimensions.width,selection.description.dimensions.height],[width,height]);
  const image=await require('sharp')({create:{width:1200,height:1000,channels:3,background:'#abc'}}).png().toBuffer();
  const exported=await require('../../lib/creative-ai/runtime/export').exportWholeStatic('data:image/png;base64,'+image.toString('base64'),{canvas:{width,height},outputFormat:'png',placementContext:{context:{placements:[{rules:selection.expanded.rules}]}}});
  const meta=await require('sharp')(exported.bytes).metadata();assert.deepEqual([meta.width,meta.height],[width,height]);
 }
 }
});

test('PMax and LinkedIn feature/story readiness bind the selected brand and saved product without comparison inputs',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);for(const [featureId,staticValues]of [[1,{platform:'PMax',imageRatios:'Landscape + square + portrait'}],[9,{platform:'LinkedIn',narrativeType:'Feature'}],[9,{platform:'LinkedIn',narrativeType:'Story'}]]){const x=structuredClone(d);x.outputs=[M.output(featureId)];x.outputs[0].staticValues=staticValues;const result=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,x);assert.equal(result.request.brandId,c[0]);assert.equal(result.request.productVariantId,x.variant);assert.equal(result.request.placementIds.length,featureId===1?3:1);assert.equal(result.summary.unitsPerOption,featureId===1?3:5);assert.ok(result.request.brief.includes(staticValues.platform));assert.ok(result.checks.every(c=>c.status==='passed'));}}
});

test('homepage category tile uses chosen component dimensions and selected SKU without assuming a multi-product collection',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[{...M.output(7),formatId:'custom',width:800,height:640,staticValues:{websiteType:'Category tile',categoryName:'Mattresses',labelTreatment:'Live website text',destination:'https://example.com/category'}}];const result=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.match(result.request.placementIds[0],/client-website-tile-800x640$/);assert.equal(result.summary.width,800);assert.equal(result.summary.height,640);assert.equal(result.request.productVariantId,d.variant);assert.ok(result.request.brief.includes('Mattresses'));assert.equal(result.request.logoTreatmentByPlacement[result.request.placementIds[0]],'omit');}
});
test('Amazon image presets reach actual saved-brand readiness and preserve each module size without manual eligibility text',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);for(const preset of Object.keys(M.amazonTemplates)){
  const x=structuredClone(d);x.outputs=[M.output(6)];M.applyAmazonPreset(x.outputs[0],preset);const prepared=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,x),ss=require('../../lib/creative-ai/runtime/placements').resolve(prepared.request).selections;
  assert.equal(prepared.request.brandId,c[0]);assert.equal(prepared.request.productVariantId,x.variant);assert.deepEqual(ss.map(s=>[s.description.dimensions.width,s.description.dimensions.height]),M.amazonTemplates[preset].parts.map(p=>p.slice(1)));assert.equal(prepared.summary.unitsPerOption,M.amazonTemplates[preset].parts.length);assert.ok(ss.every(s=>s.jobInputs.displayContext.includes(M.amazonTemplates[preset].instruction)));// A+ pages (9 Nov 2026): one brand logo on the hero only; single-module presets stay logo-free.
  assert.ok(ss.every(s=>s.jobInputs.logoPolicy.treatment===(M.amazonTemplates[preset].page&&s.jobInputs.aplus?.logo?'include':'omit')));if(M.amazonTemplates[preset].page){assert.equal(prepared.request.aplusVersion,1);assert.equal(require('../../lib/creative-ai/runtime/lean-context').groups(ss).length,1);assert.ok(prepared.request.brief.length<5000);}assert.ok(prepared.checks.every(c=>c.status==='passed'));
 }}
});

 test('A+ brand-only readiness excludes stale SKU data and shares visual intent for both brands',async()=>{
  for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[M.output(6)];M.applyAmazonPreset(d.outputs[0],'Amazon Brand Story');d.focus='brand';d.brief='Show a brand world through spatial design and material details.';d.outputs[0].staticValues.brandIdea='Rest and renewal';d.outputs[0].staticParts[0].visualIntent='Natural architectural framing';
   const g=require('../../lib/creative-ai/runtime/studio-generation'),a=await g.prepare(runtime,d);assert.equal(a.request.focusType,'brand');for(const key of ['productName','productPageUrl','productVariantId','productAssetId','landingPageUrl'])assert.equal(a.request[key],undefined,key);assert.match(a.request.brief,/Natural architectural framing/);assert.match(a.request.brief,/Rest and renewal/);assert.doesNotMatch(a.request.desiredAction,/official product page/);assert.ok(a.checks.every(x=>x.status==='passed'));assert.equal(a.summary.unitsPerOption,4);
   const changed=structuredClone(d);changed.outputs[0].staticParts[0].visualIntent='An open outdoor frame';assert.notEqual((await g.prepare(runtime,changed)).token,a.token);
   M.applyAmazonPreset(d.outputs[0],'Amazon feature module');await assert.rejects(()=>g.prepare(runtime,d),/connected/);
  }
 });
test('RCS saved-brand readiness carries image intent, ordered slots and no forced CTA for both brands',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[M.output(14)];const o=d.outputs[0];M.applyRcsPreset(o,'Carousel medium · medium image');o.staticValues.cardCount='2';M.applyRcsPreset(o,o.staticValues.rcsPreset);o.staticParts[0].visualIntent='Exact fabric texture';
 const a=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.equal(a.request.brandId,c[0]);assert.equal(a.request.productVariantId,d.variant);assert.equal(a.summary.unitsPerOption,2);assert.match(a.request.brief,/Exact fabric texture/);assert.ok(require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections.every(s=>require('../../lib/creative-ai/runtime/lean-context').textPolicy(s)==='none'&&s.jobInputs.logoPolicy.treatment==='omit'));assert.equal(a.request.landingPageUrl,undefined);assert.doesNotMatch(a.request.desiredAction,/official product page/);
 const snap=require('../../lib/creative-ai/treatment-knowledge').capture(require('../../lib/creative-ai/runtime/placements').resolve(a.request));assert.ok(snap.placements.every(p=>p.treatmentIds.includes('rcs')));
 }
});
test('push saved-brand readiness uses destination treatment and accepts brand-only image briefs without native copy',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[M.output(14)];const o=d.outputs[0];M.applyPushPreset(o,'iPhone / iOS','Square image · 1:1');o.staticValues.visualFocus='A close view of the selected product';
 const g=require('../../lib/creative-ai/runtime/studio-generation'),a=await g.prepare(runtime,d);assert.equal(a.request.brandId,c[0]);assert.equal(a.request.productVariantId,d.variant);assert.match(a.request.brief,/close view/);assert.ok(require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections.every(s=>require('../../lib/creative-ai/runtime/lean-context').textPolicy(s)==='none'&&s.jobInputs.logoPolicy.treatment==='omit'));assert.equal(a.request.landingPageUrl,undefined);assert.match(a.request.placementIds[0],/push-image-ios/);
 d.focus='brand';const b=await g.prepare(runtime,d);assert.equal(b.request.productName,undefined);assert.equal(b.request.focusType,'brand');assert.equal(b.summary.unitsPerOption,1);
 }
});
test('retail inputs reach saved-brand readiness with exact print geometry and local context',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);for(const key of ['store','store-banner','screen','standee','brochure','price','wall']){
  const x=structuredClone(d);x.outputs=[M.output(10)];M.applyRetailPreset(x.outputs[0],key);const o=x.outputs[0];o.staticValues.visualFocus='Show the selected product clearly';o.staticValues.suppliedWording='Opening this weekend';o.staticValues.storeName='Test outlet';
  const g=require('../../lib/creative-ai/runtime/studio-generation'),a=await g.prepare(runtime,x),selections=require('../../lib/creative-ai/runtime/placements').resolve(a.request).selections;
  assert.equal(a.request.brandId,c[0]);assert.equal(a.request.productVariantId,d.variant);assert.match(a.request.brief,/Opening this weekend/);assert.equal(a.request.landingPageUrl,undefined);
  if(M.retailEntry(o).printId){const snap=require('../../lib/creative-ai/treatment-knowledge').capture(require('../../lib/creative-ai/runtime/placements').resolve(a.request));assert.ok(snap.packs.some(p=>p.selectedFormat),key);assert.ok(a.request.printOptions);assert.equal(selections.length,M.generationProfile(x).unitCount);assert.equal(selections[0].description.print.trimWidthMm,Number(o.staticValues.physicalWidth));assert.equal(a.summary.width,selections[0].description.dimensions.width);}else{const snap=require('../../lib/creative-ai/treatment-knowledge').capture(require('../../lib/creative-ai/runtime/placements').resolve(a.request));assert.ok(snap.placements[0].treatmentIds.includes(key==='screen'?'retail-screen':'local-store'));}
  x.focus='brand';const b=await g.prepare(runtime,x);assert.equal(b.request.productName,undefined);assert.equal(b.request.focusType,'brand');
 }
 }
});

test('adapted intake preserves all brief fields and both complete model options for both saved brands',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);Object.assign(d,{intakeVersion:1,creativeCount:1,funnelStage:'MOFU',customerAge:'Adults 25–44',markets:'Bengaluru',themes:['Functional'],tonalities:['Direct'],rtbs:'Use the supplied material facts with their qualifiers.',backgroundBrief:'Small apartments',additionalDetails:'Leave room for live website text',briefDocument:{name:'unextracted.pdf',status:'not-extracted'}});d.outputs=[M.output(6)];M.applyAmazonPreset(d.outputs[0],'Amazon feature module');const a=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.deepEqual(a.request.conceptRoutes,['continuity','exploration']);assert.equal(a.summary.options,2);assert.equal(a.summary.unitsPerOption,M.staticParts(d.outputs[0]).length);for(const v of ['MOFU','Adults 25–44','Bengaluru','Functional','Direct','Small apartments','Leave room'])assert.ok(a.request.brief.includes(v),v);assert.doesNotMatch(a.request.brief,/unextracted.pdf|two distinct options/);assert.match(a.request.brief,/two model-rendered options/);assert.equal(a.request.leanWorkflowVersion,1);assert.equal(a.request.editableTextVersion,undefined);assert.equal(a.request.composedTextVersion,undefined);const changed=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,{...d,creativeCount:2});assert.notEqual(changed.token,a.token);assert.equal(changed.request.conceptRoutes.length,2);}
});

test('confirmed assignment wording and mandatory qualifiers reach shared generation for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c),g=require('../../lib/creative-ai/runtime/studio-generation');d.intakeVersion=2;d.rtbs='Supplied fixture feature, subject to selected-size qualification.';d.wordingMode='supplied';d.suppliedWording='Comfort for your home. Selected sizes only.';d.mandatoryInfo='Retain selected-size qualification';await assert.rejects(()=>g.prepare(runtime,d),/confirm/);M.confirmRequirements(d);const a=await g.prepare(runtime,d);assert.match(a.request.brief,/Comfort for your home\. Selected sizes only\./);assert.match(a.request.brief,/Retain selected-size qualification/);d.message='Changed assignment';await assert.rejects(()=>g.prepare(runtime,d),/confirm/);d.wordingMode='none';M.confirmRequirements(d);const b=await g.prepare(runtime,d);assert.match(b.request.brief,/No added wording/);assert.doesNotMatch(b.request.brief,/Comfort for your home/);}});
test('long imported briefs remain separate immutable sources and preserve every qualifier for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c);const text=('Client requirements and supporting context. '.repeat(220))+'\nWarranty: 10 years, subject to the specified conditions. अंतिम शर्तें लागू';d.briefDocuments=[{id:'d'.repeat(64),sha256:'e'.repeat(64),name:'Detailed brief.docx',text,status:'extracted'}];const g=require('../../lib/creative-ai/runtime/studio-generation'),a=await g.prepare(runtime,d);assert.ok(a.request.brief.length<5000);assert.equal(a.request.briefDocuments[0].text,text);const normalized=require('../../lib/creative-ai/runtime/campaign-input').normalize(a.request);assert.equal(require('../../lib/creative-ai/runtime/campaign-input').canonical(normalized).content.briefDocuments[0].text,text);const guide=require('../../lib/creative-ai/runtime/brief-document-context').attach({requirements:[]},a.request.briefDocuments);assert.ok(guide.requirements.every(r=>r.text.length<=2000));assert.equal(guide.requirements.map(r=>r.text.slice(r.text.indexOf('\n')+1)).join(''),text);d.briefDocuments[0].text+=' New supplied requirement.';assert.notEqual((await g.prepare(runtime,d)).token,a.token);}});

test('responsive image requests carry exact promotion, QR and template specifications for both brands without generation',async()=>{
 for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=[M.output(14)];const o=d.outputs[0];M.applyEmailPreset(o,'Email hero');Object.assign(o.staticValues,{responsiveMode:'Desktop + mobile',mobileWidth:'600',mobileHeight:'800',specBasis:'Supplied specification',specReference:'Email template revision 2',promotionMode:'Yes',offer:'Save 10%',offerSku:'King variant only',offerValidity:'Date range',offerStart:'2026-11-01',offerEnd:'2026-11-07',terms:'Selected variants only',contactMode:'QR + contact',qrDestination:'https://example.com/offer',contactType:'Phone',contactPhone:'+91 80000 12345'});
 d.intakeVersion=2;d.rtbs='Supplied fixture product detail.';M.confirmRequirements(d);const ready=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.equal(ready.request.placementIds.length,2);assert.deepEqual(ready.request.customProfiles.map(p=>p.canvas),[{width:1200,height:600,unit:'px'},{width:600,height:800,unit:'px'}]);for(const text of ['King variant only','https://example.com/offer','Email template revision 2','Selected variants only'])assert.ok(ready.request.brief.includes(text),text);
 o.staticValues.promotionMode='No';o.staticValues.contactMode='None';M.confirmRequirements(d);const next=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);assert.ok(!next.request.brief.includes('King variant only'));assert.ok(!next.request.brief.includes('https://example.com/offer'));assert.ok(!next.request.brief.includes('+91 80000 12345'));
 }
});

test('automatic versus manual project naming travels with the request without changing the brief',async()=>{for(const c of cases){const {runtime,d}=await fixture(c),g=require('../../lib/creative-ai/runtime/studio-generation'),a=await g.prepare(runtime,d),b=await g.prepare(runtime,{...d,manualName:true});assert.equal(a.request.studioProjectNameMode,'automatic');assert.equal(b.request.studioProjectNameMode,'manual');assert.equal(a.request.campaignName,d.name);assert.equal(a.request.brief,b.request.brief);}});

test('selected library RTBs alone pass readiness for legacy Cove and Napster snapshots without custom RTBs',async(t)=>{
 // Isolate RTB readiness from old product-specific campaign authorizations.
 // No production scope, saved evidence or provider is changed.
 t.mock.method(require('../../lib/creative-ai/runtime/production-scope'),'prepare',async()=>null);
 const savedCases=[['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-b2e17fcf89b99769068e'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-20b8cdb128e5b41b7655']];
 for(const c of savedCases){
  const {runtime,d}=await fixture(c),g=require('../../lib/creative-ai/runtime/studio-generation'),fs=require('fs/promises'),file=path.join(root,'output/creative-ai/brands',c[0],'products',c[1],'profile.json'),before=await fs.readFile(file,'utf8'),catalog=await runtime.brands.products.catalog(...c),facts=M.productRtbs(catalog);assert.ok(facts.length);
  Object.assign(d,{intakeVersion:2,focus:'product',productName:catalog.name,productUrl:catalog.pageUrl,rtbProductId:catalog.id,selectedRtbs:facts.slice(0,2),rtbs:''});M.confirmRequirements(d);
  assert.equal(M.validateBrief(d,{products:[catalog],purpose:'review'}).selectedRtbs,undefined,'Visible selected library features satisfy review');
  const catalogRead=runtime.brands.products.catalog.bind(runtime.brands.products);
  runtime.brands.products.catalog=runtime.brands.products.read.bind(runtime.brands.products);
  await assert.rejects(()=>g.prepare(runtime,d),/at least one feature/,'Old raw-profile lookup reproduces the false RTB rejection');
  runtime.brands.products.catalog=catalogRead;
  const prepared=await g.prepare(runtime,d);for(const fact of d.selectedRtbs)assert.ok(prepared.request.brief.includes(fact),'Selected library fact reaches strategy');
  const invalid={...d,selectedRtbs:['An invented unsupported feature'],rtbs:''};M.confirmRequirements(invalid);await assert.rejects(()=>g.prepare(runtime,invalid),/at least one feature/);
  const empty={...d,selectedRtbs:[],rtbs:''};M.confirmRequirements(empty);await assert.rejects(()=>g.prepare(runtime,empty),/at least one feature/);
  assert.equal(await fs.readFile(file,'utf8'),before,'Historical product profile is not rewritten');
 }
});

test('Cove and Napster reach complete readiness with library RTBs and real production scope, without paid dispatch',async()=>{
 for(const c of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-b2e17fcf89b99769068e'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-20b8cdb128e5b41b7655']]){
  const {runtime,d}=await fixture(c),p=await runtime.brands.products.catalog(...c);
  Object.assign(d,{intakeVersion:2,focus:'product',productName:p.name,productUrl:p.pageUrl,rtbProductId:p.id,selectedRtbs:M.productRtbs(p).slice(0,2),rtbs:'',outputs:[M.output(9)]});M.confirmRequirements(d);
  const prepared=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);
  assert.ok(prepared.checks.every(c=>c.status==='passed'));
  assert.equal(prepared.request.brandId,c[0]);assert.equal(prepared.request.productName,p.name);
  assert.doesNotMatch(prepared.request.campaignClarification.text,/Cocoon|Bubbles/);
  assert.equal(prepared.request.leanWorkflowVersion,1);assert.equal(prepared.request.editableTextVersion,undefined);
 }
});
test('campaign readiness retains all selected asset jobs for both brands with stable child identities',async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation');
 for(const c of cases){const {runtime,d}=await fixture(c);d.outputs=Array.from({length:30},(_,i)=>({...M.clone(d.outputs[0]),id:'asset-'+i,name:'Asset '+i}));
 assert.equal(g.supported(d),true);const a=await g.prepare(runtime,d),b=await g.prepare(runtime,d);
 assert.equal(a.request.campaignChildren.length,30);assert.equal(a.token,b.token);assert.equal(a.summary.unitsPerOption,30);
 assert.equal(new Set(a.request.campaignChildren.map(c=>c.prepared.request.requestKey)).size,30);
 assert(a.request.campaignChildren.every(c=>c.prepared.request.brandId===d.brandId));
 }
});
test('campaign readiness names invalid assets instead of silently dropping them',async()=>{
 const {runtime,d}=await fixture(cases[0]);d.outputs.push({...M.clone(d.outputs[0]),id:'invalid',name:'Invalid dimensions',width:13});
 const result=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,d);
 assert.equal(result.request.campaignChildren.length,1);assert.equal(result.blocked[0].name,'Invalid dimensions');assert.equal(result.summary.blockedAssets,1);
});
test('campaign submission isolates admission failures and retries stable child request keys',async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation'),{runtime,d}=await fixture(cases[0]);
 runtime.store.root=policyRoot;
 d.outputs=[{...M.clone(d.outputs[0]),id:'first'},{...M.clone(d.outputs[0]),id:'second'}];
 const prepared=await g.prepare(runtime,d),created=new Map();let fail=true;
 runtime.create=async request=>{if(fail&&request.sourceStudioDraftId.endsWith('-second'))throw Error('Temporary admission failure');if(!created.has(request.requestKey))created.set(request.requestKey,'creative-test-'+created.size);return created.get(request.requestKey);};
 const first=await g.submit(runtime,{draft:d,token:prepared.token});assert.equal(first.ids.length,1);assert.equal(first.errors.length,1);
 fail=false;const retry=await g.submit(runtime,{draft:d,token:prepared.token});assert.equal(retry.ids.length,2);assert.equal(retry.ids[0],first.ids[0]);assert.equal(created.size,2);
});

test('Explicit objectives take precedence over funnel shorthand for both brands',async()=>{for(const c of cases){const {runtime,d}=await fixture(c);for(const settings of [{objective:'Purchase',funnelStage:''},{objective:'Awareness',funnelStage:'BOFU'}]){const result=await require('../../lib/creative-ai/runtime/studio-generation').prepare(runtime,{...d,...settings});assert.equal(result.request.objective,settings.objective==='Awareness'?'awareness':'action');}}});

test('confirmed campaigns preserve confirmation and isolate unavailable members for both brands',async()=>{
 const g=require('../../lib/creative-ai/runtime/studio-generation');
 for(const c of cases){const {runtime,d}=await fixture(c);runtime.store.root=policyRoot;Object.assign(d,{creationMode:'campaign',intakeVersion:2,rtbs:'Supplied product feature.'});d.outputs.push({...M.clone(d.outputs[0]),id:'unavailable',featureId:999,name:'Unavailable asset'});
 await assert.rejects(()=>g.prepare(runtime,d),/confirm/);M.confirmRequirements(d);
 assert.deepEqual(M.campaignValidation(d,{products:[await runtime.brands.products.read(...c)]}),{});
 const prepared=await g.prepare(runtime,d);assert.equal(prepared.request.campaignChildren.length,1);assert.equal(prepared.blocked.length,1);
 let calls=0;runtime.create=async()=>{calls++;return 'creative-test';};const result=await g.submit(runtime,{draft:d,token:prepared.token});assert.equal(calls,1);assert.equal(result.errors[0].outputId,'unavailable');
 d.brief+=' Changed';await assert.rejects(()=>g.prepare(runtime,d),/confirm/);
 }
});
