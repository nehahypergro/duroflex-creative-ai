'use strict';
// Google Display banners v1 (user request, 9 Nov 2026; docs/display-banners-20261109.md). Offline only:
// fake provider, no paid calls. Original symptom: the "Google Display Banners" card was 'soon' (a
// 1200 x 628 planning brief), so neither the picker nor the home brief reader could make banners, and a
// 728 x 90 or 970 x 250 page would have been mirror-extended by exact-canvas.fit (gpt-image-2 stops at 3:1).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements'),ctx=require('../../lib/creative-ai/runtime/lean-context');
const flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),planning=require('../../lib/creative-ai/lean/planning'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const banners=require('../../lib/creative-ai/runtime/display-banners'),treatments=require('../../lib/creative-ai/treatment-knowledge'),readability=require('../../lib/creative-ai/runtime/readability');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const brands=['Duroflex','Sleepyhead'];
const STANDARD=['300x250','336x280','300x600','160x600','970x250','320x100'],STRIPS=['728x90','320x50'];

function bannerDraft(brand,set){
 const d=M.startAssetDraft('brand-'+brand.toLowerCase(),['google-display-banners']);
 if(set)d.outputs[0].staticValues.bannerSet=set;
 return d;
}
function setProfile(brand,set){
 const d=bannerDraft(brand,set),p=M.generationProfile(d);
 return {d,p,resolved:placements.resolve({placementIds:p.placementIds,jobInputs:p.jobInputs,logoTreatmentByPlacement:p.logoTreatment,placementLogoPolicyVersion:1})};
}

for(const brand of brands)test(brand+': the Google Display card is ready and makes the standard banner set in one job',()=>{
 const card=M.assetCard('google-display-banners');assert.equal(card.status,'ready');assert.equal(card.division,'Ads');
 const d=bannerDraft(brand),o=d.outputs[0];assert.ok(!o.planningOnly,'a ready card is never a planning-only brief');
 assert.ok(M.displayBanners(o));assert.deepEqual(M.displayBannerSlots(o).map(s=>s.width+'x'+s.height),STANDARD);
 const {p}=setProfile(brand);assert.equal(p.unitCount,6);assert.equal(p.displayBanners.imageCount,6);assert.equal(M.units(d),6,'the image count used by the estimate');
 assert.deepEqual(p.placementIds,['inline-rectangle','large-rectangle','half-page','wide-skyscraper','billboard','large-mobile-banner'].map(s=>'custom:studio-display-'+s),'existing Studio display presets, each with its 150 KB ceiling');
 const strips=setProfile(brand,M.displayBannerSetNames[1]).p;assert.equal(strips.unitCount,8);assert.deepEqual(strips.displayBanners.sizes.map(s=>s.width+'x'+s.height),[...STANDARD,...STRIPS]);
 // Most important inventory is marked; strip sizes are opt-in and say they are untested.
 const top=M.displayBannerSizes.filter(s=>s.top).map(s=>s.width+'x'+s.height);for(const size of ['300x250','728x90','300x600','320x50','160x600'])assert.ok(top.includes(size),size+' is marked as top inventory');
 const rows=M.assetRequirementSummary(o,d).join('\n');assert.match(rows,/Google Display banner set · 6 images in one job/);assert.match(rows,/300 × 250 Inline rectangle/);assert.match(rows,/150 KB/);assert.match(rows,/728 × 90.*left out/i);
 const sd=bannerDraft(brand,M.displayBannerSetNames[1]),stripRows=M.assetRequirementSummary(sd.outputs[0],sd).join('\n');assert.match(stripRows,/8 images in one job/);assert.match(stripRows,/728 × 90 Leaderboard · .*strip layout, not yet tested/);
 // No QR or contact questions on a banner; the CTA wording field is optional.
 const fields=M.staticRecipeForOutput(o,{...d,brief:'Add a QR code and our phone number'}).fields.map(f=>f[0]);
 assert.ok(!fields.some(f=>['contactMode','qrDestination','contactPhone'].includes(f)));assert.ok(fields.includes('bannerSet'));assert.ok(fields.includes('ctaText'));
 assert.deepEqual(M.requiredAssetFields(o,{...d,brief:'Add a QR code'}),[]);
});

test('strip sizes are exactly the shapes the image model cannot draw at 75% or more of its canvas',()=>{
 for(const s of M.displayBannerSizes){const geo=banners.shape(s.width,s.height);assert.equal(!!s.strip,geo.mode==='strip',s.width+'x'+s.height+' kept '+geo.kept);}
 assert.equal(banners.shape(300,250).mode,'native');assert.equal(banners.shape(970,250).mode,'band');assert.equal(banners.shape(160,600).mode,'band');assert.equal(banners.shape(728,90).mode,'strip');assert.equal(banners.shape(320,50).mode,'strip');
 const lb=banners.shape(728,90);assert.equal(lb.generation,placements.generationSize(728,90).size);assert.ok(lb.band.width/lb.band.height>8&&lb.band.width/lb.band.height<8.2,'the kept band has the leaderboard shape');
});

for(const brand of brands)test(brand+': a banner set is one coordinated plan with on-image text, a logo on every size and the display playbook',()=>{
 const {p,resolved}=setProfile(brand,M.displayBannerSetNames[1]);assert.equal(resolved.selections.length,8);
 assert.equal(ctx.groups(resolved.selections).length,1,'every size is planned together');
 assert.ok(resolved.selections.every(s=>ctx.textPolicy(s)==='display-banner'),'uploaded image ads carry their own copy and CTA');
 assert.ok(resolved.selections.every(s=>s.jobInputs.logoPolicy.treatment==='include'),'brand logo on every size');
 assert.deepEqual(resolved.selections.map(s=>[s.description.dimensions.width,s.description.dimensions.height].join('x')),[...STANDARD,...STRIPS]);
 const t=treatments.capture(resolved);assert.ok(t.placements.every(x=>x.treatmentIds.includes('fixed-display')),'the fixed-size display treatment applies');
 assert.equal(readability.policyFor({id:p.placementIds[0],width:300,height:250}).classId,'display-card');assert.equal(readability.policyFor({id:'custom:studio-display-mobile-banner-320',width:320,height:50}).classId,'micro-banner');
 assert.ok(resolved.selections.every(s=>require('../../lib/creative-ai/lean/objective-playbook').formatClass(s)==='banner'),'the playbook banner class: very few words, one action, legible brand');
});

test('the banner pin is for new lean banner jobs only',()=>{
 assert.equal(policy.configure({},{leanWorkflowVersion:1,displayBannersVersion:1}).displayBannersVersion,1);
 assert.equal(policy.configure({},{leanWorkflowVersion:1}).displayBannersVersion,undefined);
 assert.equal(policy.configure({},{displayBannersVersion:1}).displayBannersVersion,undefined,'legacy (non-lean) jobs never receive it');
 assert.equal(require('../../lib/creative-ai/runtime/provider-config').snapshot({displayBannersVersion:1}).displayBannersVersion,1,'the pin survives the job snapshot');
});

test('the Studio request pins the banner contract and only the user\'s own wording',()=>{
 const {d,p}=setProfile('Duroflex');d.brief='Display ads for Back Magic Pro. Flat 30% off till 15 Nov 2026.';
 const r=require('../../lib/creative-ai/runtime/studio-generation').displayBannersRequest(p,{promotionMode:'No',offer:'Hidden',ctaText:' Shop now '},d);
 assert.equal(r.displayBannersVersion,1);assert.deepEqual(Object.keys(r.jobInputs),p.placementIds);assert.ok(Object.values(r.logoTreatmentByPlacement).every(v=>v==='include'));
 assert.deepEqual(r.displayBannersSuppliedText,[d.brief]);assert.equal(r.displayBannersCta,'Shop now');
 assert.deepEqual(require('../../lib/creative-ai/runtime/studio-generation').displayBannersRequest(p,{promotionMode:'Yes',offer:'Flat 30% off',terms:'On selected sizes'},d).displayBannersSuppliedText,[d.brief,'Flat 30% off','On selected sizes']);
});

// ---- Lean planning with a fake provider ------------------------------------------------------------
function planFor(input,{headlines=null,cta='Shop now',offer=null,banned=false,ctaBy=null}={}){
 const b=input.displayBanners,font=input.brand.fonts[0].family;
 const pages=input.format.pages.map((p,i)=>{const info=b?.pages.find(x=>x.id===p.id)||{textClass:'card',name:p.name};
  const copy=[{role:'headline',text:headlines?headlines[i]:'Wake up without back pain',factIds:[]}];
  if(info.textClass==='card')copy.push({role:'supporting',text:'Orthopedic support for deep sleep',factIds:[]});
  if(offer)copy.push({role:'offer',text:offer,factIds:[]});
  if(banned&&info.textClass==='card')copy.push({role:'supporting',text:'Rated 4.8 stars by customers',factIds:[]});
  copy.push({role:'cta',text:ctaBy?ctaBy(i):cta,factIds:[]});
  return {id:p.id,purpose:info.name,copy,artDirection:'Exact product, one calm visual system across sizes',hierarchy:'Logo, product, headline, CTA',palette:'Brand colours',typography:font+' Bold 700',spatial:Object.fromEntries(planning.spatialFields.map(k=>[k,'Follow the size rule'])),formatConstraints:['Flat artwork']};});
 return {message:'Wake up rested',audience:'Shoppers',objective:'Consideration',insight:{text:'Back pain ruins mornings',basis:'hypothesis'},desiredAction:'Shop',concept:'One clear promise',
  guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applies'})),pages,omitted:[]};
}
// The fake image model paints the band that will be kept red and everything else blue, so the test
// can prove the final banner is the kept band, evenly scaled: no mirror-extended edges, no squash.
async function bandImage(size,width,height){
 const [w,h]=size.split('x').map(Number),g=placements.generationSize(width,height),c=g.crop;
 const band=await sharp({create:{width:Math.round(c.width),height:Math.round(c.height),channels:3,background:'#e01010'}}).png().toBuffer();
 return sharp({create:{width:w,height:h,channels:3,background:'#1040e0'}}).composite([{input:band,left:Math.round(c.x),top:Math.round(c.y)}]).png().toBuffer();
}
async function fixture(t,{brand='Duroflex',set,brief='Google display ads for this exact mattress.',plan={},pinned=true,cta=''}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'banners-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1024,height:1024,channels:3,background:'#345678'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const {p,resolved}=setProfile(brand,set);
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief,productName:brand+' Ortho Mattress',productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'queen',originalArtworkVersion:1,leanWorkflowVersion:1,...(pinned?{displayBannersVersion:1}:{}),conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'queen',sku:'EXACT-Q',name:'Queen'}},
  placementIds:p.placementIds,jobInputs:p.jobInputs,logoTreatmentByPlacement:p.logoTreatment,displayBannersSuppliedText:[brief],...(cta?{displayBannersCta:cta}:{})};
 const selection=resolved.selections.map(s=>({id:s.id,description:s.description,jobInputs:s.jobInputs}));
 const config=policy.configure({maxConcurrentUnits:3,maxReasoningCalls:200,jobTimeoutMs:3600000},intake),job=await store.create(intake,config,selection);
 const facts=[{id:'fact-cover',status:'supported',text:'Washable cover that is easy to clean',sourceIds:[]}];
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:facts.map(f=>({factId:f.id}))},facts},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const runtime={store,config,readCarouselPlan:async()=>null,brands:{products:{read:async(b,id)=>({id,brandId:b,pageUrl:intake.productPageUrl}),savedImage:async()=>({bytes})}},
  provider:{reason:async request=>{calls.push({kind:request.contextKind,input:request.input});let out;if(request.contextKind==='lean-planning')out=planFor(request.input,plan);else out={checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;},
   generate:async request=>{calls.push({kind:'image',...request});const s=resolved.selections.find(x=>x.id===request.scope.placementId).description.dimensions;return {imageData:'data:image/png;base64,'+(await bandImage(request.size,s.width,s.height)).toString('base64')};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});
 const manifest=JSON.parse(await fs.readFile(path.join(store.dir(job.id),'image-queue.json'))),records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(store.dir(job.id),u.file),'utf8').then(JSON.parse)));
 return {store,job,context,runtime,records,calls};
}

for(const brand of brands)test(brand+': one plan covers every banner size; strip and band sizes are the kept band of a supported shape, never mirrored or squashed',async t=>{
 const f=await fixture(t,{brand,set:M.displayBannerSetNames[1]});
 assert.equal(f.calls.filter(c=>c.kind==='lean-planning').length,1,'ONE planning call for the whole set');assert.equal(f.records.length,8);
 assert.equal(new Set(f.records.map(r=>JSON.stringify(r.plan))).size,1,'every size shares the same plan');
 const input=f.records[0].input;assert.equal(input.displayBanners.version,1);assert.equal(input.displayBanners.pages.length,8);
 assert.match(input.format.structure,/GOOGLE DISPLAY BANNER SET v1/);assert.ok(!f.records.some(r=>r.prompt.includes('GOOGLE DISPLAY BANNER SET v1')),'the set-planning rule stays out of image prompts');
 assert.ok(input.format.guidance.mandatory.some(r=>r.id==='display-banner-policy-v1'),'the Google image-ad policy is a checked requirement');
 for(const r of f.records){const page=input.displayBanners.pages.find(p=>p.id===r.placementId);assert.match(r.prompt,/fills? the (whole|entire) (banner|canvas)/i);assert.match(r.prompt,/close, play, download or install/);
  if(page.mode==='native')assert.doesNotMatch(r.prompt,/CROP CONTRACT/);else assert.match(r.prompt,/FINAL EXPORT CROP CONTRACT/);
  if(page.mode==='strip')assert.match(r.prompt,/one row/);}
 await handoff.generate(f.runtime,f.job.id);const j=await f.store.read(f.job.id);assert.equal(j.status,'finished',JSON.stringify(j.unitErrors));assert.equal(j.results.length,8);
 const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,8,'one image per size');
 for(const s of j.selection){const d=s.description.dimensions,call=images.find(c=>c.scope.placementId===s.id);assert.equal(call.size,placements.generationSize(d.width,d.height).size,'every size asks for a supported shape');
  const r=j.results.find(r=>r.placementId===s.id),file=path.join(f.store.dir(f.job.id),r.imageUrl.split('/').pop()),m=await sharp(file).metadata();assert.deepEqual([m.width,m.height],[d.width,d.height],s.id);
  // Inset 2 px: the scaled band edge falls between pixels (e.g. 4 x 0.42 = 1.7 px), a sub-pixel blend only.
  const {data,info}=await sharp(file).raw().toBuffer({resolveWithObject:true});let blue=0;for(let y=2;y<d.height-2;y++)for(let x=2;x<d.width-2;x++){const i=(y*d.width+x)*info.channels;if(data[i]<150||data[i+2]>110)blue++;}
  assert.ok(blue===0,s.id+': only the kept (red) band remains; nothing mirrored in from outside it');
  const key=require('../../lib/creative-ai/art-director').fingerprint([r.route,s.id]).slice(0,24),state=JSON.parse(await fs.readFile(path.join(f.store.dir(f.job.id),'lean-state-'+key+'.json')));
  assert.deepEqual(state.originalFit.added,{x:0,y:0},s.id+': no edge extension');}
 assert.equal(j.displayBanners.imageCount,8);assert.ok(j.displayBanners.notes.some(n=>/strip layout/.test(n)&&/not been checked in a paid run/.test(n)));
 assert.ok(M.resultNotes(j).some(n=>/strip layout/.test(n)),'the notes reach the result view');
 const std=await fixture(t,{brand});assert.equal(std.records.length,6);assert.ok((await std.store.read(std.job.id)).displayBanners.notes.some(n=>/Left out of the standard set/.test(n)),'the default set says which strip sizes it leaves out');
});

for(const brand of brands)test(brand+': the same headline and CTA on every size; one truthful CTA; text budgets per size; offers only from the brief',async t=>{
 const f=await fixture(t,{brand,set:M.displayBannerSetNames[1]}),input=f.records[0].input;
 assert.doesNotThrow(()=>planning.validatePlan(planFor(input),input));
 assert.throws(()=>planning.validatePlan(planFor(input,{headlines:input.format.pages.map((p,i)=>i?'Wake up without back pain':'Sleep like never before')}),input),/same headline/);
 assert.throws(()=>planning.validatePlan(planFor(input,{ctaBy:i=>i?'Shop now':'Buy now'}),input),/same call to action/);
 assert.throws(()=>planning.validatePlan(planFor(input,{cta:'Download the app now'}),input),/call to action/);
 assert.throws(()=>planning.validatePlan(planFor(input,{cta:'Install'}),input),/download, install, play or close/);
 const noCta=planFor(input);noCta.pages[0].copy=noCta.pages[0].copy.filter(c=>c.role!=='cta');assert.throws(()=>planning.validatePlan(noCta,input),/exactly one call to action/);
 const wordy=planFor(input),micro=input.displayBanners.pages.findIndex(p=>p.textClass==='micro');wordy.pages[micro].copy.splice(1,0,{role:'supporting',text:'Seven zone orthopedic support for every sleeper',factIds:[]});assert.throws(()=>planning.validatePlan(wordy,input),/text budget/);
 const supplied=await fixture(t,{brand,cta:'Explore now',plan:{cta:'Explore now'}});assert.throws(()=>planning.validatePlan(planFor(supplied.records[0].input),supplied.records[0].input),/supplied call to action/);
 assert.doesNotThrow(()=>planning.validatePlan(planFor(supplied.records[0].input,{cta:'Explore Now'}),supplied.records[0].input));
 const invented=await fixture(t,{brand,plan:{offer:'Now 40% off'}});assert.ok(!invented.records[0].plan.pages.some(p=>p.copy.some(c=>/40% off/.test(c.text))),'an offer not in the brief is removed');
 const offer=await fixture(t,{brand,brief:'Display ads. Flat 30% off till 15 Nov 2026.',plan:{offer:'Flat 30% off'}});assert.ok(offer.records[0].plan.pages.every(p=>p.copy.some(c=>c.text==='Flat 30% off')));
 const banned=await fixture(t,{brand,plan:{banned:true}});assert.ok(!banned.records.some(r=>/4\.8 stars/.test(r.prompt)),'ratings are removed before images');
 assert.ok((await banned.store.read(banned.job.id)).displayBanners.notes.some(n=>/Removed/.test(n)));
});

test('banner files are 150 KB or less: PNG when it fits, JPEG quality steps otherwise, exact pixels always',async()=>{
 const flat=await sharp({create:{width:300,height:250,channels:4,background:'#336699'}}).png().toBuffer();
 const small=await banners.bannerFile(flat);assert.equal(small.format,'png');assert.ok(small.bytes.length<=banners.FILE_MAX);assert.equal((await sharp(small.bytes).metadata()).channels,3,'opaque: Google rejects transparent backgrounds');
 const noise=await sharp(require('node:crypto').randomBytes(970*250*3),{raw:{width:970,height:250,channels:3}}).png().toBuffer();
 assert.ok(noise.length>banners.FILE_MAX,'test image is a PNG over 150 KB');
 const big=await banners.bannerFile(noise);assert.equal(big.format,'jpeg');assert.ok(big.bytes.length<=banners.FILE_MAX);assert.ok(big.quality>=banners.MIN_QUALITY);
 const m=await sharp(big.bytes).metadata();assert.deepEqual([m.width,m.height],[970,250],'never resized below the exact pixels');
 const over=await banners.bannerFile(noise,{maxBytes:2000});assert.equal(over.overLimit,true,'a file that cannot fit is flagged, not shrunk');assert.deepEqual([over.width,over.height],[970,250]);
 const ids=['custom:studio-display-inline-rectangle','custom:studio-display-billboard','custom:studio-display-leaderboard'];
 const out=await banners.packageEntries(ids.map((placementId,i)=>({placementId,bytes:i===1?noise:flat})));
 assert.deepEqual(out.files.map(x=>x.file),['google-display/rectangles/300x250-inline-rectangle.png','google-display/leaderboards/970x250-billboard.jpg','google-display/leaderboards/728x90-leaderboard.png']);
 assert.ok(out.files.every(x=>x.bytes<=banners.FILE_MAX));assert.ok(['google-display/sizes.csv','google-display/README.txt'].every(n=>out.entries.some(e=>e.name===n)));
 assert.match(String(out.entries.find(e=>e.name.endsWith('sizes.csv')).bytes),/970x250/);assert.match(String(out.entries.find(e=>e.name.endsWith('README.txt')).bytes),/150 KB/);
});

test('historical jobs and non-banner formats keep their contract',async t=>{
 const f=await fixture(t,{pinned:false});assert.equal(f.records[0].input.displayBanners,undefined,'no packet without the pin');
 assert.deepEqual(banners.fitOptions(f.records[0]),{},'unpinned jobs keep the 8 Nov exact-canvas fit');
 const pmax=M.startAssetDraft('brand-duroflex',['google-pmax-set']);const p=M.generationProfile(pmax);assert.equal(p.displayBanners,undefined);assert.equal(p.unitCount,3);assert.equal(p.omitLogo,true);
});

test('the brief reader maps display ads and banner ads to the Google Display card',()=>{
 const reader=require('../../lib/creative-ai/runtime/brief-reader');
 assert.ok(reader.cards().some(c=>c.id==='google-display-banners'),'the card is offered to the reader');
 assert.match(reader.instructions('Duroflex'),/google-display-banners/);
 const base={ask:'Get shoppers to try it',product:{productId:'',candidateIds:[],variantId:'',briefName:'',evidence:''},messageType:{value:'Benefit',source:'suggested'},objective:{value:'Consideration',source:'suggested',reason:'x'},language:{value:'English',source:'suggested'},audience:{value:'',source:'none'},tone:{value:'',source:'none'},keyMessage:{value:'',source:'none'},features:[],offer:{wording:'',terms:'',startDate:'',endDate:''},exactWording:[],occasion:{value:'',source:'none'},cta:{value:'',source:'none'},contactDetails:false,logoRequested:false,otherBrandMentioned:'',assumptions:[],questions:[]};
 for(const brief of ['Make Google display banners for the Diwali sale','We need display ads for the new mattress','Banner ads for our pillows','GDN banners please']){
  const r=reader.finish({...base,assets:[{cardId:'website-banner',source:'brief',reason:'banner'}]},{products:[],documents:[],brief});
  assert.deepEqual(r.assets.map(a=>a.cardId),['google-display-banners'],brief);}
 const both=reader.finish({...base,assets:[{cardId:'website-banner',source:'brief',reason:'site'}]},{products:[],documents:[],brief:'A homepage website banner and display ads'});
 assert.deepEqual(both.assets.map(a=>a.cardId).sort(),['google-display-banners','website-banner'],'an explicit website banner stays');
 const none=reader.finish({...base,assets:[{cardId:'instagram-post',source:'brief',reason:'x'}]},{products:[],documents:[],brief:'An Instagram post'});assert.deepEqual(none.assets.map(a=>a.cardId),['instagram-post']);
 // The free local fallback reads the same words.
 for(const brand of brands){const d=M.newDraft('brand-'+brand.toLowerCase());d.creationMode='quick';d.brief='Google display banners for the sale';const a=M.briefUnderstanding(d).asset;assert.equal(a?.staticValues?.platform,'Google Display');}
});

test('both brands: the real readiness path prepares a pinned banner request from saved research, with no paid call',{timeout:120000},async t=>{
 const root=path.resolve(__dirname,'../..'),od=require('../../lib/creative-ai/runtime/original-delivery'),prepare=od.prepare,policyRoot=await fs.mkdtemp(path.join(os.tmpdir(),'banners-policy-'));
 t.after(()=>fs.rm(policyRoot,{recursive:true,force:true}));await fs.writeFile(path.join(policyRoot,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
 t.mock.method(od,'prepare',(_root,intake)=>prepare(policyRoot,intake));
 const g=require('../../lib/creative-ai/runtime/studio-generation'),{CreativeRuntime}=require('../../lib/creative-ai/runtime/engine');
 for(const [brandId,productId] of [['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','product-3566a343eb36f945fd10'],['brand-3a5870df-d114-43eb-ba02-e5d8c3c729de','product-985736dbde7586ad61c7']]){
  const runtime=new CreativeRuntime({root,provider:{reason(){assert.fail('No paid call');},generate(){assert.fail('No paid call');}}});await require('./helpers/pinned-research-fixture').pin(runtime,brandId);
  const p=await runtime.brands.products.read(brandId,productId),d=M.startAssetDraft(brandId,['google-display-banners']);Object.assign(d,{name:'Banner readiness',brief:'Display ads for everyday comfort. No price or offer.',audience:'Families',productId:p.id,variant:p.variants[0].id});d.outputs[0].staticValues.ctaText='Shop now';
  const a=await g.prepare(runtime,d),r=a.request;
  assert.equal(r.displayBannersVersion,1);assert.equal(r.placementIds.length,6);assert.equal(r.displayBannersCta,'Shop now');assert.equal(r.brandId,brandId);
  const sel=placements.resolve(r).selections;assert.equal(ctx.groups(sel).length,1);assert.ok(sel.every(s=>s.jobInputs.logoPolicy.treatment==='include'&&s.jobInputs.displayBanner.version===1));
  assert.equal(policy.configure({},r).displayBannersVersion,1,'the new job pins the banner contract');
 }
});
