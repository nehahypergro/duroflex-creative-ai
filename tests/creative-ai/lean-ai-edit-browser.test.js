'use strict';
// Image editor for simplified (lean) designs, both brands, read-only preview (user request,
// 8 Nov 2026: "The AI editor needs to be the one that we had in the previous iteration, where you
// can annotate as well"). Before this change a lean design had no Edit button, only a text-only
// side panel. Every API call is stubbed in the browser, so no generation or paid request happens.
// Checks: Edit opens the editor workspace with the earlier "Edit with AI" chat; clicking the design
// drops a pin with a comment box (9 Nov 2026: no Box tool); Send stays disabled until a pin comment
// or note is typed; a Send posts one request carrying the pin comments; the returned version
// appears and is shown; "Use this version" posts the exact hash.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),fs=require('node:fs/promises'),path=require('node:path');
const shots=path.join(__dirname,'../../work/ai-editor-20261108'),pub=path.join(__dirname,'../../public/creative-ai');
test('lean design opens the annotating image editor for both brands',{timeout:240000},async()=>{
 await fs.mkdir(shots,{recursive:true});
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const png=await sharp({create:{width:1080,height:1350,channels:3,background:'#e9e2d6'}}).composite([{input:await sharp({create:{width:500,height:300,channels:3,background:'#7a5b45'}}).png().toBuffer(),left:290,top:820}]).png().toBuffer();
 const edited=await sharp({create:{width:1080,height:1350,channels:3,background:'#cfe0f5'}}).png().toBuffer();
 const errors=[],posts=[];
 const state={},jobs=[];
 try{for(const b of f.brands){
  const id='aiedit-'+b.id.slice(-6),sha='a'.repeat(64),editSha='b'.repeat(64),newSha='c'.repeat(64),fileUrl='/creative-ai/api/jobs/'+id+'/files/static-lean-x.png',v1='creative-11111111-1111-1111-1111-111111111111',v2='creative-22222222-2222-2222-2222-222222222222';
  const editUrl=v=>'/creative-ai/api/jobs/'+id+'/versions/'+v+'/files/static-ai-edit-'+v.slice(9,17)+'.png';
  const job={id,name:'Pillow launch',brandId:b.id,status:'finished',createdAt:'2026-11-08T10:00:00Z',updatedAt:'2026-11-08T10:05:00Z',activeStages:[],intake:{brandId:b.id,campaignName:'Pillow launch',conceptRoutes:['continuity'],leanWorkflowVersion:1},placements:[{id:'portrait',name:'Instagram portrait',dimensions:{width:1080,height:1350}}],results:[{route:'continuity',placementId:'portrait',imageUrl:fileUrl,width:1080,height:1350,sha256:sha,originalArtwork:true,editable:false,ready:true,qualityVerified:true,leanWorkflowVersion:1,leanConformanceVersion:1,visualReview:{status:'completed',conclusion:'no_mismatch'}}]};
  jobs.push(job);state[id]={active:'original',versions:[{id:'original',label:'Original',status:'finished',result:{imageUrl:fileUrl,sha256:sha,ready:true,check:'checked'}},{id:v1,status:'finished',instruction:'Make the background light blue',annotations:[],masked:false,sourceVersionId:'original',result:{imageUrl:editUrl(v1),sha256:editSha,ready:false,check:'flagged',productCheck:{status:'flagged',problems:[{name:'Product identity',evidence:'The quilting pattern differs from the reference angles.',location:'Mattress top'}],unverified:[],productAngles:3}},costs:{currency:'INR',estimatedTotal:9.4,rateDate:'2026-10-09'}}]};
  // A fresh browser context per brand: saved workspace snapshots from the stubbed other-brand prefetch must not leak.
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
  // The preview helper serves studio files only; the editor modules come straight from public/.
  await page.route('**/creative-ai/editor-*',async route=>{const name=new URL(route.request().url()).pathname.split('/').pop();if(!/^editor-(chat-tools|chat|image-only)\.(js|css)$/.test(name))return route.fulfill({status:404,body:''});return route.fulfill({body:await fs.readFile(path.join(pub,name)),contentType:name.endsWith('.css')?'text/css':'text/javascript'});});
  await page.route('**/creative-ai/api/jobs**',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname,s=state[id];
   if(p.endsWith('/ai-edits')&&req.method()==='POST'){const body=req.postDataJSON();posts.push({p,body});s.versions.push({id:v2,status:'running',instruction:body.instruction,annotations:(body.annotations||[]).map((a,i)=>({...a,number:i+1})),masked:!!body.annotations?.some(a=>a.type==='box'),sourceVersionId:body.sourceVersionId,result:null,costs:null});return route.fulfill({status:202,json:s.versions.at(-1)});}
   if(p.endsWith('/ai-edits/selected')&&req.method()==='POST'){const body=req.postDataJSON();posts.push({p,body});s.active=body.versionId;return route.fulfill({status:200,json:{versionId:body.versionId}});}
   if(req.method()!=='GET')return route.fulfill({status:501,json:{error:'Read-only test.'}});
   if(p.endsWith('/ai-edits')){assert.equal(u.searchParams.get('brandId'),b.id,'the editor asks for its own brand');
    // The stubbed edit finishes as soon as the editor checks again.
    // 9 Nov 2026: the saved version is product-checked next; the editor keeps polling until the check settles.
    for(const v of s.versions)if(v.result?.check==='checking')Object.assign(v.result,{check:'passed',productCheck:{status:'passed',problems:[],unverified:[],productAngles:3}});
    for(const v of s.versions)if(v.status==='running')Object.assign(v,{status:'finished',result:{imageUrl:editUrl(v.id),sha256:newSha,ready:false,check:'checking'},costs:{currency:'INR',estimatedTotal:12.31,rateDate:'2026-10-09'}});
    return route.fulfill({json:{jobId:id,brandId:b.id,route:'continuity',placementId:'portrait',activeVersionId:s.active,estimate:{currency:'INR',perEdit:13,perCheck:2,basis:'Estimate from this project’s earlier gpt-image-2 images at list prices. Not a bill.'},versions:s.versions}});}
   if(p.endsWith('/jobs'))return route.fulfill({json:jobs});if(p.endsWith('/edits'))return route.fulfill({json:[]});if(p.endsWith('/details'))return route.fulfill({json:{units:[]}});
   if(p.endsWith('.png'))return route.fulfill({body:p.includes('ai-edit')?edited:png,contentType:'image/png'});
   return route.fulfill(p==='/creative-ai/api/jobs/'+id?{json:job}:{json:{}});});
  const slug=b.name.toLowerCase();
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',id);await page.locator('.focused-art img').waitFor();
  assert.equal(await page.locator('.ai-edit-panel').count(),0,'the old text-only side panel is gone');
  const edit=page.locator('[data-action=edit-image]');assert.equal(await edit.count(),1,'a lean design now has an Edit button');await edit.click();
  const dialog=page.locator('#editableDialog[open]');await dialog.locator('.ec-io .ec-io-version').nth(1).waitFor();
  assert.equal(await dialog.locator('.ec-chat h3').innerText(),'Edit with AI');assert.match(await dialog.locator('.ec-title span').innerText(),/1080 × 1350 px · Image editor/);
  const send=dialog.locator('[data-chat-send]');assert.equal(await send.isDisabled(),true,'Send is disabled until text is typed');
  assert.match(await dialog.locator('[data-io-cost]').innerText(),/about ₹13, plus one product check, about ₹2 \(estimates\)/);
  assert.match(await dialog.locator('.ec-chat-history').innerText(),/Check found a problem: The quilting pattern differs from the reference angles\. \(Mattress top\)/,'a flagged check is shown in plain words');assert.match(await dialog.locator('.ec-io-version').nth(1).innerText(),/Check found a problem/);
  assert.equal(await dialog.locator('.ec-io-version').count(),2);assert.match(await dialog.locator('.ec-chat-history').innerText(),/Make the background light blue/);
  /* 9 Nov 2026 ("i dont want box. just pins/comments that act as edits"): no Box or Pin tool buttons; clicking the design drops a pin with its own comment box. */
  assert.equal(await dialog.locator('[data-chat-box]').count(),0,'no Box tool');assert.equal(await dialog.locator('[data-chat-pin]').count(),0,'no separate Pin tool to switch on');
  const area=await dialog.locator('.ec-io-overlay').boundingBox(),at=(x,y)=>page.mouse.click(area.x+area.width*x,area.y+area.height*y);
  await at(.3,.4);const pop=dialog.locator('[data-io-pop]');await pop.waitFor();assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),1,'the pin is shown on the artwork');
  assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-io-comment]')),true,'the comment box is ready to type in');
  assert.equal(await send.isDisabled(),true,'a pin without a comment cannot be sent on its own');
  await dialog.locator('[data-io-comment]').fill('Make this vase white');assert.equal(await send.isDisabled(),false,'a pin comment alone can be sent');
  /* 9 Nov 2026 ("Yes, protect it"): each pin has an area, Medium by default, drawn as a dashed square. */
  assert.equal(await pop.locator('[data-io-area=medium]').getAttribute('aria-pressed'),'true','Medium area by default');assert.equal(await dialog.locator('.ec-io-overlay .ec-io-area-box').count(),1,'the area square is drawn');
  {const ab=await dialog.locator('.ec-io-overlay .ec-io-area-box').boundingBox(),side=.26*Math.min(area.width,area.height);assert.ok(Math.abs(ab.width-side)<3&&Math.abs(ab.height-side)<3,'the drawn square matches the server size '+JSON.stringify(ab));}
  assert.match(await dialog.locator('[data-io-pins]').innerText(),/1\s*Make this vase white/);
  /* 8 Nov live test kept: with focus outside the editor, Escape first closes the open comment box and keeps the editor open. */
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.querySelector('#editableDialog').open),true,'Escape with a comment open keeps the editor open');assert.match(await page.evaluate(()=>location.hash),/^#editor\//,'Escape keeps the editor route');
  assert.equal(await pop.isHidden(),true,'Escape closes the comment box');assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),1,'a pin with a comment stays');
  /* An empty new pin disappears when its comment box is closed. */
  await at(.72,.25);await pop.waitFor();await page.keyboard.press('Escape');assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),1,'empty pin removed on Escape');
  await at(.72,.25);await pop.waitFor();await dialog.locator('[data-io-comment]').fill('Remove this lamp');await pop.locator('[data-io-area=small]').click();assert.equal(await pop.locator('[data-io-area=small]').getAttribute('aria-pressed'),'true');await dialog.locator('[data-io-pop-done]').click();
  assert.equal(await pop.isHidden(),true);assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),2);
  /* Areas covering more than about a third of the design cannot be sent. */
  for(const [x,y] of [[.2,.8],[.8,.8],[.5,.55]]){await at(x,y);await pop.waitFor();await dialog.locator('[data-io-comment]').fill('Change this');await pop.locator('[data-io-area=large]').click();await dialog.locator('[data-io-pop-done]').click();}
  assert.equal(await send.isDisabled(),true,'oversized areas cannot be sent');assert.match(await dialog.locator('.ec-chat-status').innerText(),/more than about a third/);
  for(let i=0;i<3;i++)await dialog.locator('[data-pin-remove]').last().click();
  assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),2);assert.equal(await send.isDisabled(),false,'back within the limit');assert.doesNotMatch(await dialog.locator('.ec-chat-status').innerText(),/more than about a third/,'the size warning clears');
  await dialog.locator('[data-chat-input]').fill('   ');assert.equal(await send.isDisabled(),false,'pin comments are enough even with a blank note');
  await page.screenshot({path:path.join(shots,slug+'-annotate-1366.png')});
  await send.click();
  await dialog.locator('.ec-io-version').nth(2).locator('img').waitFor();
  const sent=posts.filter(x=>x.p.endsWith('/ai-edits')).at(-1).body;assert.equal(sent.instruction,undefined,'no empty note is sent');assert.equal(sent.brandId,b.id);assert.match(sent.requestKey,/^ai-edit-[a-zA-Z0-9-]{8,}$/);assert.equal(sent.sourceVersionId,'original');assert.equal(sent.expectedVersionId,'original');
  assert.deepEqual(sent.annotations.map(a=>[a.type,a.comment,a.area]),[['pin','Make this vase white','medium'],['pin','Remove this lamp','small']]);assert.ok(Math.abs(sent.annotations[0].x-.3)<.02&&Math.abs(sent.annotations[0].y-.4)<.02,'pin position '+JSON.stringify(sent.annotations[0]));
  assert.equal(await dialog.locator('.ec-io-overlay .ec-io-pin').count(),0,'pins clear after sending');
  // The new version is shown on the canvas (not selected) with a "Use this version" choice.
  await page.waitForFunction(()=>/Version 2 is ready/.test(document.querySelector('#editableDialog .ec-chat-history')?.textContent||''));
  await page.waitForFunction(()=>/Checked — product looks right \(compared with 3 product photos\)/.test(document.querySelector('#editableDialog .ec-chat-history')?.textContent||''),null,{timeout:20000});
  assert.doesNotMatch(await dialog.locator('.ec-io-version').nth(2).innerText(),/Ready|Checks passed/,'a checked edit is never shown as Ready');
  assert.match(await dialog.locator('[data-io-image]').getAttribute('src'),/static-ai-edit-22222222/);assert.match(await dialog.locator('[data-io-banner]').innerText(),/Viewing Version 2/);
  assert.match(await dialog.locator('.ec-chat-history').innerText(),/Make this vase white[\s\S]*Remove this lamp/);assert.match(await dialog.locator('.ec-chat-history').innerText(),/2 pins/);assert.match(await dialog.locator('.ec-chat-history').innerText(),/₹12\.31 \(estimate/);
  assert.equal(await send.isDisabled(),true,'edits start from the version in use, not the one being viewed');
  await page.screenshot({path:path.join(shots,slug+'-result-1366.png')});
  await dialog.locator('[data-io-banner] [data-io-use]').click();await page.waitForFunction(()=>/Now using Version 2/.test(document.querySelector('#editableDialog .ec-chat-status')?.textContent||''));
  const chose=posts.filter(x=>x.p.endsWith('/selected')).at(-1).body;assert.equal(chose.versionId,v2);assert.equal(chose.expectedSha256,newSha);assert.equal(chose.expectedVersionId,'original');assert.equal(chose.brandId,b.id);
  assert.equal(await dialog.locator('[data-io-banner]').isHidden(),true);assert.ok(await dialog.locator('.ec-io-overlay').evaluate(e=>e.classList.contains('drawing')),'the version in use can be pinned again');
  // Back closes the editor and returns to the design page.
  await dialog.locator('[data-io="close"]').click();await page.locator('#editableDialog[open]').waitFor({state:'detached'}).catch(()=>{});await page.waitForFunction(()=>!document.querySelector('#editableDialog')?.open);
  await page.waitForFunction(()=>location.hash.startsWith('#review/'));
  // Phone width: the chat stacks under the artwork without sideways scrolling.
  state[id].active='original';state[id].versions.splice(2);
  await page.setViewportSize({width:390,height:844});await page.evaluate(id=>location.hash='review/'+id+'/0/0',id);await page.locator('[data-action=edit-image]').click();
  await page.locator('#editableDialog[open] .ec-io-version').nth(1).waitFor();
  {const small=await page.locator('#editableDialog .ec-io-overlay').boundingBox();await page.mouse.click(small.x+small.width*.3,small.y+small.height*.6);}
  await page.locator('#editableDialog [data-io-pop]').waitFor();assert.equal(await page.locator('#editableDialog .ec-io-overlay .ec-io-pin').count(),1,'a pin can be dropped at phone width');
  {const pb=await page.locator('#editableDialog [data-io-pop]').boundingBox(),fb=await page.locator('#editableDialog .ec-io-frame').boundingBox();assert.ok(pb.x>=fb.x-1&&pb.x+pb.width<=fb.x+fb.width+1,'the comment box stays inside the artwork at phone width');}
  await page.locator('#editableDialog [data-io-comment]').fill('Make this sofa dark green');
  assert.ok(await page.evaluate(()=>{const d=document.querySelector('#editableDialog');return d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1;}),'no horizontal scroll at phone width');
  {const sb=await page.locator('#editableDialog [data-chat-send]').boundingBox();assert.ok(sb&&sb.y+sb.height<=844&&await page.locator('#editableDialog [data-chat-send]').isEnabled(),'Send is on screen and enabled at phone width');}
  await page.screenshot({path:path.join(shots,slug+'-annotate-390.png')});
  /* Escape with focus outside the editor: the first press closes the comment box, the second closes the editor fully, back on the design page. */
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.querySelector('#editableDialog').open),true,'the first Escape only closes the comment box');
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Escape');await page.waitForFunction(()=>{const d=document.querySelector('#editableDialog');return !d.open&&!d.classList.contains('ec-image-only');});await page.waitForFunction(()=>location.hash.startsWith('#review/'));
  await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
