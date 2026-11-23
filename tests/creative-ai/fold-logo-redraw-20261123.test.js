'use strict';
// Regression (Neha, 23 Nov 2026: "yes fix both", after the paid local A4 bi-fold brochures of 22 Nov).
// 1. Every fold panel request got the logo picture, so the model drew a logo on each panel: the Duroflex outside face
//    (creative-ba959221) and the Sleepyhead inside face (creative-e96f951b) both came back with two logos and failed
//    "logo once". New lean jobs pin foldLogoVersion 1: the planner names the one panel that carries each face's logo
//    (logoPanel) and only that panel's request gets the logo picture; the others get a brief that says no logo there
//    and numbers the attached pictures without it.
// 2. Folded faces were left out of the one layout redraw, so the Duroflex cover's cut-off mattress stayed. New lean
//    jobs pin foldRedrawVersion 1: a face with a layout finding is drawn again panel by panel, joined at the same fold,
//    checked once and kept only if better. Failing before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config'),planning=require('../../lib/creative-ai/lean/planning');
const {brands,fixture}=require('./lean-marketing-fixture');
const print={trimWidthMm:297,trimHeightMm:210,bleedMm:3,safeMm:5,proofPpi:150,requiredPpi:300,fold:'half',panelWidthsMm:[148.5,148.5],keepoutTopMm:0,keepoutBottomMm:0,templateNote:'',proofWorkflowVersion:1,geometry:{artboard:{width:303,height:216,unit:'mm'}}};
const face=(i,label)=>({id:'custom_studio-print-brochure-bifold-page-0'+i,description:{name:'Brochure · A4 bi-fold · two flat faces · '+label,formatId:'custom:studio-print-brochure-bifold',formatName:'Brochure · A4 bi-fold · two flat faces',guidelines:'Flat spread, not a mockup. Outside: back on left, cover on right; inside: left/right reading order. Fold at halfway.',dimensions:{width:1790,height:1276},print,printSet:{id:'custom:studio-print-brochure-bifold',name:'Brochure · A4 bi-fold · two flat faces',index:i,count:2,label}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});
const bifold=()=>[face(1,'Outside flat face'),face(2,'Inside flat face')];
const copyFor=(input,p,i)=>[{role:'headline',text:['Layers that hold you','Comfort you can open'][i%2]+(input.marketing?.recentHeadlines?.length?' tonight':''),factIds:[]},{role:'support',text:'Backed by a 3-year conditional warranty.',factIds:['fact-1']}];
// The cover (panel 2) carries the outside face's logo; the inside face's logo is on its left panel (panel 1).
const logoPanels=(input,p)=>input.foldPanels?.logoPanel?{logoPanel:p.id.endsWith('01')?2:1}:{};
const BASE={Duroflex:'https://duroflex.test/cdn/shop/files/',Sleepyhead:'https://sleepyhead.test/cdn/shop/files/'};
const gallery=base=>[{id:'sku-product-image-1',label:'Mattress on a bed',url:base+'M_1.jpg'},{id:'sku-product-image-2',label:'Mattress cutaway showing its foam layers and outer fabric',url:base+'M_2.jpg'}];
const COLOURS=['#c03030','#3050c0','#30a050','#a0a030','#a030a0','#30a0a0'];
async function colourImage(i){return 'data:image/png;base64,'+(await sharp({create:{width:848,height:1200,channels:3,background:COLOURS[i%COLOURS.length]}}).png().toBuffer()).toString('base64');}
// byKey: the same request always gets the same picture (a resumed request redraws what it would have drawn).
function colours(f,{byKey=false}={}){let n=0;f.runtime.provider.generate=async request=>{f.calls.push({kind:'image',...request});return {imageData:await colourImage(byKey?parseInt(request.requestKey.slice(0,6),16):n++)};};}
const pixel=async(file,x,y)=>{const {data}=await sharp(file).extract({left:x,top:y,width:1,height:1}).raw().toBuffer({resolveWithObject:true});return [...data.slice(0,3)];};
const hasLogo=img=>img.attachments.some(a=>a.roles?.includes('logo'));
const CUT='The cover mattress and navy base run beyond the right canvas edge, cutting off their right-hand corners.';
// Flags the layout check on the review calls listed in `on` (1 = the drawing's check, 2 = the redraw's check).
function flag(on){let n=0;return out=>{n++;if(!on.includes(n))return;const c=out.checks.find(x=>['spatial-layout','layout','structure'].includes(x.id));c.result='clear_mismatch';c.evidence=CUT;c.location='Right panel, right canvas edge';};}
const stateOf=async f=>{const name=(await fs.readdir(f.dir)).find(n=>n.startsWith('lean-state-'));return {name,state:JSON.parse(await fs.readFile(path.join(f.dir,name),'utf8'))};};

test('new lean jobs pin the fold logo and fold redraw, and the snapshot keeps them; earlier configs do not',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.foldLogoVersion,1);assert.equal(c.foldRedrawVersion,1);
 assert.equal(pc.snapshot(c).foldLogoVersion,1);assert.equal(pc.snapshot(c).foldRedrawVersion,1);
 assert.equal(pc.snapshot({}).foldLogoVersion,undefined);assert.equal(pc.snapshot({}).foldRedrawVersion,undefined);
});
for(const brand of brands){
 test(brand+': only the panel the planner names gets the logo picture; the other panel is told there is no logo',async t=>{
  const f=await fixture(t,{brand,selection:bifold(),copyFor,pageExtra:logoPanels,gallery:gallery(BASE[brand])});assert.equal(f.planError,null);
  const input=f.calls.find(c=>c.kind==='lean-planning').input;assert.match(input.foldPanels.logoPanel.rule,/one panel/);
  assert.ok(planning.schemaFor(input).properties.pages.items.required.includes('logoPanel'),'the plan must name the logo panel');
  assert.deepEqual(f.records.map(r=>r.foldLogo.panel),[1,0],'saved on each face: cover, inside left');
  colours(f);await f.run();
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,4);
  const [back,cover,left,right]=images;
  assert.deepEqual([back,cover,left,right].map(hasLogo),[false,true,true,false],'one logo picture per face, on the named panel');
  assert.match(back.prompt,/No brand logo on this panel: this face's one logo sits on the front cover/);
  assert.match(back.prompt,/No separate identity image is attached to this panel/);assert.doesNotMatch(back.prompt,/approved \w+ identity asset/);
  assert.match(cover.prompt,/This panel carries this face's one brand logo/);assert.match(cover.prompt,/approved \w+ identity asset/);
  assert.match(right.prompt,/one logo sits on the inside left panel/);
  // Picture numbers in each brief point at the right attachment, with or without the logo picture.
  const construction=f.records[0].attachments.at(-1).assetId;
  for(const img of images){const k=Number(/Image (\d+) is the official construction picture/.exec(img.prompt)?.[1]);assert.equal(img.attachments[k-1]?.assetId,construction,'construction picture number in: '+img.requestKey.slice(0,8));}
 });
 test(brand+': a logo panel outside the face, or none, fails the plan check',async t=>{
  const wrong=await fixture(t,{brand,selection:bifold(),copyFor,planEdit:out=>{out.pages[0].logoPanel=3;}});assert.match(String(wrong.planError?.message),/logoPanel: unsupported value/);
  const missing=await fixture(t,{brand,selection:bifold(),copyFor,planEdit:out=>{delete out.pages[1].logoPanel;}});assert.match(String(missing.planError?.message),/logoPanel: required/);
 });
 test(brand+': jobs admitted before the fold logo pin keep the logo picture on every panel',async t=>{
  const f=await fixture(t,{brand,selection:bifold(),copyFor,pinned:false,unpin:['marketingRulesVersion','foldLogoVersion']});assert.equal(f.planError,null);
  assert.equal(f.calls.find(c=>c.kind==='lean-planning').input.foldPanels.logoPanel,undefined);assert.equal(f.records[0].foldLogo,undefined);
  colours(f);await f.run();const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,4);assert.ok(images.every(hasLogo));
 });
 test(brand+': a folded face with a layout finding is redrawn panel by panel, joined at the same fold, and the better redraw is used',async t=>{
  const f=await fixture(t,{brand,selection:[face(1,'Outside flat face')],copyFor,pageExtra:logoPanels,reviewEdit:flag([1])});assert.equal(f.planError,null);
  assert.equal((await f.read()).budget.maxImageCalls,4,'original + correction slot, plus one extra panel for each');
  colours(f);await f.run();
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,4,'two panels, then two redrawn panels');
  const [,,r1,r2]=images;
  for(const img of [r1,r2]){assert.match(img.prompt,/ONE REDRAW/);assert.ok(img.prompt.includes(CUT.slice(0,50)),'the check\'s words go to the image model');assert.match(img.prompt,/fix every point that concerns this panel/);assert.match(img.prompt,/FOLD PANEL DRAWING \(one panel of 2\)/);}
  assert.deepEqual([r1,r2].map(hasLogo),[false,true],'the redraw keeps the logo on the named panel only');
  assert.equal(new Set(images.map(i=>i.requestKey)).size,4,'its own request identity per redrawn panel');
  const {state}=await stateOf(f);assert.equal(state.candidatePanels.length,2);assert.equal(state.panels.length,2,'the original panels are kept');
  assert.ok(!r1.attachments.some(a=>a.assetId==='fold-panel-anchor'));assert.equal(r2.attachments.find(a=>a.assetId==='fold-panel-anchor').sha256,state.candidatePanels[0].sha256,'the second redrawn panel matches the first redrawn one');
  assert.equal(f.calls.filter(c=>c.kind==='lean-correction').length,0,'no separate diagnosis or local repaint');
  const r=(await f.read()).results[0];assert.match(r.imageUrl,/candidate/);assert.equal(r.correction.action,'redraw');assert.equal(r.correction.selected,true);
  const file=path.join(f.dir,r.imageUrl.split('/').pop());assert.notDeepEqual(await pixel(file,894,600),await pixel(file,895,600),'the redrawn face still folds at x = 895');
 });
 test(brand+': a panel redraw that is not better keeps the original face',async t=>{
  const f=await fixture(t,{brand,selection:[face(1,'Outside flat face')],copyFor,pageExtra:logoPanels,reviewEdit:flag([1,2])});colours(f);await f.run();
  assert.equal(f.calls.filter(c=>c.kind==='image').length,4);const r=(await f.read()).results[0];assert.doesNotMatch(r.imageUrl,/candidate/);assert.match(r.correction.note,/not better, so the original is kept/);
 });
 test(brand+': an interrupted panel redraw resumes without redrawing its saved panel',async t=>{
  const f=await fixture(t,{brand,selection:[face(1,'Outside flat face')],copyFor,pageExtra:logoPanels,reviewEdit:flag([1])});colours(f,{byKey:true});await f.run();
  // Make it look as if the Studio stopped after the first redrawn panel was saved.
  const {name,state}=await stateOf(f);state.status='correcting';state.selected='original';state.candidatePanels=state.candidatePanels.slice(0,1);
  for(const k of ['candidate','candidateReview','candidateFit','finishedAt'])delete state[k];await fs.writeFile(path.join(f.dir,name),JSON.stringify(state));
  const before=f.calls.filter(c=>c.kind==='image').length;await f.run();
  const after=f.calls.filter(c=>c.kind==='image').slice(before);assert.equal(after.length,1,'only the missing panel');assert.match(after[0].prompt,/panel 2 of 2/);assert.match(after[0].prompt,/ONE REDRAW/);
  assert.match((await f.read()).results[0].imageUrl,/candidate/);
 });
 test(brand+': jobs admitted before the fold redraw pin keep the face without a redraw',async t=>{
  const f=await fixture(t,{brand,selection:[face(1,'Outside flat face')],copyFor,pinned:false,unpin:['marketingRulesVersion','foldRedrawVersion'],reviewEdit:flag([1])});
  assert.equal((await f.read()).budget.maxImageCalls,3,'one extra panel for the drawing only');
  colours(f);await f.run();assert.equal(f.calls.filter(c=>c.kind==='image').length,2);assert.doesNotMatch((await f.read()).results[0].imageUrl,/candidate/);
 });
 test(brand+': brand isolation accepts the first redrawn panel of this unit as the fold anchor, and nothing else',async t=>{
  const iso=require('../../lib/creative-ai/runtime/brand-isolation'),{fingerprint}=require('../../lib/creative-ai/art-director'),fp=require('../../lib/creative-ai/runtime/fold-panels'),{hash}=require('../../lib/creative-ai/runtime/masked-image');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fold-redraw-anchor-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const brandId='brand-'+brand.toLowerCase(),scope={conceptId:'c1',route:'continuity',placementId:'custom_studio-print-brochure-bifold-page-01'},k=fingerprint([scope.route,scope.placementId]).slice(0,24);
  const png=c=>sharp({create:{width:20,height:20,channels:3,background:c}}).png().toBuffer(),first=await png('#123456'),redrawn=await png('#abcdef');
  await fs.writeFile(path.join(dir,'static-lean-panel-'+k+'-0.png'),first);await fs.writeFile(path.join(dir,'static-lean-candidate-panel-'+k+'-0.png'),redrawn);await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId}}));
  const write=candidate=>fs.writeFile(path.join(dir,'lean-state-'+k+'.json'),JSON.stringify({panels:[{index:0,filename:'static-lean-panel-'+k+'-0.png',sha256:hash(first)}],candidatePanels:[candidate]}));
  const context={leanWorkflowVersion:1,dir,scope:{brandId}};
  await write({index:0,filename:'static-lean-candidate-panel-'+k+'-0.png',sha256:hash(redrawn)});
  assert.equal((await iso.verifyFoldAnchor({scope,attachments:[fp.anchor(redrawn,k,hash(redrawn))]},context)).length,1);
  assert.equal((await iso.verifyFoldAnchor({scope,attachments:[fp.anchor(first,k,hash(first))]},context)).length,1,'the original first panel still works');
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[fp.anchor(await png('#999999'),k,hash(redrawn))]},context),/fold panel/);
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[fp.anchor(redrawn,k,hash(redrawn))]},{...context,scope:{brandId:'brand-other'}}),/fold panel/);
  await write({index:0,filename:'static-lean-panel-'+k+'-0.png',sha256:hash(redrawn)});
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[fp.anchor(redrawn,k,hash(redrawn))]},context),/fold panel/,'a redrawn panel must be the saved candidate file');
 });
}
for(const brand of brands){
 test(brand+': the estimate\'s high end counts the possible panel redraw; the low end does not',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fold-estimate-'));try{
   await fs.mkdir(path.join(root,'output/cost-tracking'),{recursive:true});await fs.writeFile(path.join(root,'output/cost-tracking/currency.json'),JSON.stringify({displayCurrency:'INR',usdToInr:100,rateDate:'2026-11-01',source:'https://example.test/fx'}));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({artworkDelivery:'original',artworkWorkflow:'lean-v1'}));
   const brandId='brand-'+brand.toLowerCase(),at='2026-11-08T00:01:00Z',r=(kind,model,key,out)=>({kind,model,recordedAt:at,requestKey:key,usage:kind==='image'?{input_tokens:0,output_tokens:out,input_tokens_details:{text_tokens:0,image_tokens:0}}:{input_tokens:0,output_tokens:out}});
   const job={id:'one-'+brandId,status:'finished',createdAt:'2026-11-08T00:00:00Z',intake:{brandId,leanWorkflowVersion:1},runtimeConfig:{roleModels:{'lean-planning':{model:'gpt-6.1-sol'}},leanImageOptions:[{route:'continuity',model:'gpt-image-2'}]},selection:[{description:{dimensions:{width:1080,height:1080}}}],results:[{imageUrl:'a'}],budget:{receipts:[r('reasoning','gpt-6.1-sol','plan',20000),r('image','gpt-image-2','i1',5000),r('reasoning','gpt-6-luna','v1',10000)],requestStates:{}}};
   const runtime={root,config:{},store:{list:async()=>[job]}},{estimateBrief}=require('../../lib/creative-ai/runtime/studio-estimate');
   const profile={width:1790,height:1276,unitCount:2,foldExtraImages:2};
   const before=await estimateBrief(runtime,brandId,profile,1),after=await estimateBrief(runtime,brandId,{...profile,foldRedrawImages:2},1);
   assert.equal(after.low,before.low,'the redraw happens only when a layout problem is found');assert.ok(after.high>before.high,'the high end includes it: '+after.high+' > '+before.high);
   assert.match(after.message,/2 extra panel pictures so each fold sits exactly in place, and up to 2 more if a folded face needs its one redraw/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
 });
}
