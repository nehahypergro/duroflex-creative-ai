'use strict';
// Regression (Neha, 21 Nov 2026): folded brochures kept missing the fold. The image model got the fold only in
// millimetres and words: the hosted Prana bi-fold split at about 40% of the width, and 2 of 4 local faces (jobs
// 9abf4683, 9e977aab) drew a fold line. Layout findings are not auto-corrected, so it repeated on every run.
// User decision "Draw panels separately": new lean jobs pin foldPanelVersion 1 and draw each panel as its own
// picture, joined exactly at the fold. Failing before (one picture per face, no fold position); no paid calls.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {brands,fixture}=require('./lean-marketing-fixture');
const print={trimWidthMm:297,trimHeightMm:210,bleedMm:3,safeMm:5,proofPpi:150,requiredPpi:300,fold:'half',panelWidthsMm:[148.5,148.5],keepoutTopMm:0,keepoutBottomMm:0,templateNote:'',proofWorkflowVersion:1,geometry:{artboard:{width:303,height:216,unit:'mm'}}};
const face=(i,label)=>({id:'custom_studio-print-brochure-bifold-page-0'+i,description:{name:'Brochure · A4 bi-fold · two flat faces · '+label,formatId:'custom:studio-print-brochure-bifold',formatName:'Brochure · A4 bi-fold · two flat faces',guidelines:'Flat spread, not a mockup. Outside: back on left, cover on right; inside: left/right reading order. Fold at halfway.',dimensions:{width:1790,height:1276},print,printSet:{id:'custom:studio-print-brochure-bifold',name:'Brochure · A4 bi-fold · two flat faces',index:i,count:2,label}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});
const copyFor=(input,p,i)=>[{role:'headline',text:['Layers that hold you','Comfort you can open'][i%2]+(input.marketing?.recentHeadlines?.length?' tonight':''),factIds:[]},{role:'support',text:'Backed by a 3-year conditional warranty.',factIds:['fact-1']}];
const bifold=()=>[face(1,'Outside flat face'),face(2,'Inside flat face')];
const COLOURS=['#c03030','#3050c0','#30a050','#a0a030'];
async function colourImage(i){return 'data:image/png;base64,'+(await sharp({create:{width:848,height:1200,channels:3,background:COLOURS[i%COLOURS.length]}}).png().toBuffer()).toString('base64');}
const pixel=async(file,x,y)=>{const {data}=await sharp(file).extract({left:x,top:y,width:1,height:1}).raw().toBuffer({resolveWithObject:true});return [...data.slice(0,3)];};

test('fold panel geometry: a bi-fold A4 face folds at exactly half of 1790 px; tri-fold uses its own panel widths',()=>{
 const fp=require('../../lib/creative-ai/runtime/fold-panels');
 assert.deepEqual(fp.layout(print,1790,1276).foldsPx,[895]);
 assert.deepEqual(fp.layout(print,1790,1276).panels.map(p=>p.width),[895,895]);
 const tri=fp.layout({...print,fold:'letter',panelWidthsMm:[97,100,100]},1790,1276);assert.equal(tri.panels.length,3);assert.equal(tri.foldsPx[0],Math.round((3+97)*1790/303));
 assert.equal(fp.layout({...print,fold:'none'},1790,1276),null);
 assert.equal(fp.extraImages(bifold()),2,'one extra picture per folded face');
});
test('new lean jobs pin fold panels and the snapshot keeps it; earlier configs do not',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.foldPanelVersion,1);assert.equal(pc.snapshot(c).foldPanelVersion,1);assert.equal(pc.snapshot({}).foldPanelVersion,undefined);
});
for(const brand of brands){
 test(brand+': each bi-fold panel is drawn separately and joined exactly at the fold',async t=>{
  const f=await fixture(t,{brand,selection:bifold(),copyFor});assert.equal(f.planError,null);
  assert.ok(f.calls.find(c=>c.kind==='lean-planning').input.foldPanels?.rule,'the planner is told the panels are drawn separately');
  assert.equal((await f.read()).budget.maxImageCalls,8,'two faces × (one original + one correction) + one extra panel per face, for the drawing and for the possible panel-by-panel redraw (foldRedrawVersion 1, 23 Nov 2026)');
  let n=0;f.runtime.provider.generate=async request=>{f.calls.push({kind:'image',...request});return {imageData:await colourImage(n++)};};
  await f.run();
  const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,4,'two panels per face');
  for(const img of images)assert.match(img.prompt,/FOLD PANEL DRAWING \(one panel of 2\)/);
  assert.match(images[0].prompt,/back panel/);assert.match(images[1].prompt,/front cover/);
  assert.ok(!images[0].attachments.some(a=>a.assetId==='fold-panel-anchor'),'the first panel has no anchor');
  const anchorRef=images[1].attachments.find(a=>a.assetId==='fold-panel-anchor');assert.ok(anchorRef,'the second panel sees the first');
  assert.equal(new Set(images.map(i=>i.requestKey)).size,4,'one request identity per panel');
  const job=await f.read();
  for(const r of job.results){
   assert.equal(r.width,1790);const file=path.join(f.dir,r.imageUrl.split('/').pop());
   const left=await pixel(file,894,600),right=await pixel(file,895,600);assert.notDeepEqual(left,right,'the seam sits exactly at x = 895');
   assert.deepEqual(await pixel(file,10,600),left);assert.deepEqual(await pixel(file,1780,600),right);
  }
  const states=(await fs.readdir(f.dir)).filter(n=>n.startsWith('lean-state-'));
  for(const s of states){const st=JSON.parse(await fs.readFile(path.join(f.dir,s)));assert.deepEqual(st.foldPanels.foldsPx,[895]);assert.equal(st.panels.length,2);
   if(st.panels[0].sha256===anchorRef.sha256)assert.equal(anchorRef.imageData,'data:image/png;base64,'+(await fs.readFile(path.join(f.dir,st.panels[0].filename))).toString('base64'));}
 });
 test(brand+': a resumed face keeps its saved first panel and draws only the missing one',async t=>{
  const f=await fixture(t,{brand,selection:[face(1,'Outside flat face')],copyFor});let n=0;
  f.runtime.provider.generate=async request=>{f.calls.push({kind:'image',...request});if(n===1){n++;throw Error('connection dropped');}return {imageData:await colourImage(n++)};};
  await f.run().catch(()=>{});
  const before=f.calls.filter(c=>c.kind==='image').length;assert.match(f.calls.find(c=>c.kind==='image').prompt,/panel 1 of 2/);
  await f.run().catch(()=>{});
  const images=f.calls.filter(c=>c.kind==='image');assert.ok(images.slice(before).every(i=>!/panel 1 of 2/.test(i.prompt)),'panel 1 is never redrawn');assert.ok(images.slice(before).some(i=>/panel 2 of 2/.test(i.prompt)),'the missing panel is drawn on resume');
 });
 test(brand+': jobs admitted before the pin keep one picture per face',async t=>{
  const f=await fixture(t,{brand,selection:bifold(),copyFor,pinned:false,unpin:['foldPanelVersion']});assert.equal(f.planError,null);
  assert.equal(f.calls.find(c=>c.kind==='lean-planning').input.foldPanels,undefined);
  await f.run();const images=f.calls.filter(c=>c.kind==='image');assert.equal(images.length,2);assert.ok(images.every(i=>!/FOLD PANEL/.test(i.prompt)));
 });
 test(brand+': brand isolation accepts only this unit\'s own first panel as the fold anchor',async t=>{
  const iso=require('../../lib/creative-ai/runtime/brand-isolation'),{fingerprint}=require('../../lib/creative-ai/art-director'),fp=require('../../lib/creative-ai/runtime/fold-panels');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fold-anchor-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const brandId='brand-'+brand.toLowerCase(),scope={conceptId:'c1',route:'continuity',placementId:'custom_studio-print-brochure-bifold-page-01'},k=fingerprint([scope.route,scope.placementId]).slice(0,24);
  const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#123456'}}).png().toBuffer(),sha=require('../../lib/creative-ai/runtime/masked-image').hash(bytes);
  await fs.writeFile(path.join(dir,'static-lean-panel-'+k+'-0.png'),bytes);
  await fs.writeFile(path.join(dir,'lean-state-'+k+'.json'),JSON.stringify({panels:[{index:0,filename:'static-lean-panel-'+k+'-0.png',sha256:sha}]}));
  await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({intake:{brandId}}));
  const context={leanWorkflowVersion:1,dir,scope:{brandId}},asset=fp.anchor(bytes,k,sha);
  assert.equal((await iso.verifyFoldAnchor({scope,attachments:[asset]},context)).length,1);
  const other=await sharp({create:{width:20,height:20,channels:3,background:'#654321'}}).png().toBuffer();
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[fp.anchor(other,k,sha)]},context),/fold panel/);
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[{...asset,bindingKey:'0'.repeat(24)}]},context),/fold panel/);
  await assert.rejects(iso.verifyFoldAnchor({scope,attachments:[asset]},{...context,scope:{brandId:'brand-other'}}),/fold panel/);
 });
}
