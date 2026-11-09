'use strict';
// UX rows 6, 7, 10, 16, 17 (8 Nov 2026), both brands, read-only preview (all POSTs rejected):
// picker search covers every tab; one-click Download on finished cards via the review page's
// download path (dimension gate kept); one sidebar "+ New" with no division links and no
// Projects highlight on brief/understood; Facebook Story brief row shows the Facebook icon;
// the review page badge reads "Check before using" for a design with a clear mismatch.
const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
test('nav, picker search, card download, brief icons and design badge for both brands',{timeout:180000},async()=>{
 const f=await require('./helpers/intake-preview.cjs').createPreview(),browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#c8b8a0'}}).png().toBuffer();
 const job=(b,i,status,name,result,dimensions={width:64,height:64})=>({id:`nav-${i}-${b.id.slice(-4)}`,brandId:b.id,status,createdAt:'2026-11-08T10:00:00Z',updatedAt:`2026-11-08T1${i}:00:00Z`,activeStages:status==='running'?['generation']:[],intake:{brandId:b.id,campaignName:name,conceptRoutes:['continuity']},placements:[{id:'square',name:'Square post',dimensions}],results:result?[{route:'continuity',placementId:'square',imageUrl:`/creative-ai/api/jobs/nav-${i}-${b.id.slice(-4)}/files/image.png`,...result}]:[]});
 const jobs=f.brands.flatMap(b=>[
  job(b,1,'finished','Flagged design',{ready:false,qualityVerified:false,leanWorkflowVersion:1,leanConformanceVersion:1,visualReview:{status:'completed',conclusion:'clear_mismatch'}}),
  job(b,2,'finished','Clean design',{ready:true,qualityVerified:true,visualReview:{status:'completed',conclusion:'no_mismatch'}}),
  job(b,3,'running','Still creating',null),
  job(b,4,'finished','Wrong size',{ready:true},{width:1080,height:1080})]);
 const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/creative-ai/api/jobs**',route=>{const req=route.request(),path=new URL(req.url()).pathname;if(req.method()!=='GET'){posts.push(path);return route.fulfill({status:501,json:{error:'Read-only test.'}});}
  if(path.endsWith('/jobs'))return route.fulfill({json:jobs});if(path.endsWith('/edits'))return route.fulfill({json:[]});if(path.endsWith('/files/image.png'))return route.fulfill({body:png,contentType:'image/png'});
  const j=jobs.find(j=>path==='/creative-ai/api/jobs/'+j.id);return route.fulfill(j?{json:j}:{json:{}});});
 try{for(const b of f.brands){const mine=jobs.filter(j=>j.brandId===b.id),[flagged,clean,running,wrong]=mine;
  await page.goto(f.url+'?brand='+b.id);await page.locator('.creation-hero').waitFor();
  // Row 10 + user follow-up (8 Nov 2026): "+ New" first, then the 9 format groups stay visible; "+ New" opens the picker on All.
  assert.equal(await page.locator('#sidebarNavigation .sidebar-new').count(),1);
  assert.equal(await page.locator('#sidebarNavigation [data-group]').count(),9);
  assert.equal(await page.locator('#sidebarNavigation .sidebar-section').count(),1);
  // "+ New" goes to the home brief box (8 Nov 2026); the format groups open the picker on their tab.
  await page.locator('#sidebarNavigation .sidebar-new').click();await page.waitForFunction(()=>document.activeElement?.id==='homeBrief');
  await page.locator('#sidebarNavigation [data-group=social]').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor();
  assert.match(page.url(),/#tools\/assets\?/);assert.equal(await page.locator('[data-action=picker-tab][aria-selected=true]').getAttribute('data-division'),'social');
  assert.equal(await page.locator('#sidebarNavigation [data-nav=create]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#sidebarNavigation [data-nav=projects]').getAttribute('aria-current'),'false');
  // Row 6: searching from the Ads tab looks across every division, grouped; clearing restores Ads.
  await page.locator('[data-action=picker-tab][data-division=ads]').click();
  await page.locator('#assetPickerSearch').fill('story');
  assert.equal(await page.locator('[data-action=picker-tab][aria-selected=true]').getAttribute('data-division'),'all');
  assert.equal(await page.locator('#assetPickerGrid [data-card=instagram-story]').count(),1,'organic Instagram Story is found from the Ads tab');
  const sections=await page.locator('#assetPickerGrid .asset-picker-section').evaluateAll(es=>es.map(e=>e.dataset.division));
  assert.ok(sections.includes('social')&&sections.includes('ads'),sections.join());
  await page.locator('#assetPickerSearch').fill('');
  assert.equal(await page.locator('[data-action=picker-tab][aria-selected=true]').getAttribute('data-division'),'ads');
  assert.equal(await page.locator('#assetPickerGrid .asset-picker-section[data-division]').count(),0);
  // Row 16: a three-story campaign brief shows each card's own icon.
  await page.locator('[data-action=picker-tab][data-division=all]').click();
  for(const id of ['instagram-story','facebook-story','whatsapp-status'])await page.locator('#assetPickerGrid [data-card='+id+']').click();
  await page.locator('#assetPickerTray [data-action=picker-continue]').click();await page.waitForURL(/#brief\//);await page.locator('.campaign-asset').first().waitFor();
  assert.deepEqual(await page.locator('.campaign-asset > summary .asset-icon').evaluateAll(es=>es.map(e=>e.dataset.assetIcon)),['instagram-story','facebook-story','whatsapp-status']);
  assert.match(await page.locator('.campaign-asset > summary .asset-icon[data-asset-icon=facebook-story]').innerHTML(),/ai-badge-facebook/);
  assert.doesNotMatch(await page.locator('.campaign-asset > summary .asset-icon[data-asset-icon=facebook-story]').innerHTML(),/ai-badge-instagram/);
  // Row 10: brief and understood pages highlight "New", not Projects.
  assert.equal(await page.locator('#sidebarNavigation [data-nav=projects]').getAttribute('aria-current'),'false');
  assert.equal(await page.locator('#sidebarNavigation [data-nav=create]').getAttribute('aria-current'),'page');
  const draftId=page.url().split('#brief/')[1].split('?')[0];
  await page.evaluate(id=>location.hash='understood/'+id,draftId);await page.waitForTimeout(400);
  if(page.url().includes('#understood/')){assert.equal(await page.locator('#sidebarNavigation [data-nav=projects]').getAttribute('aria-current'),'false');assert.equal(await page.locator('#sidebarNavigation [data-nav=create]').getAttribute('aria-current'),'page');}
  // A format group from a brief starts something new rather than editing that brief's assets.
  await page.locator('#sidebarNavigation [data-group=social]').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor();
  assert.equal(await page.locator('.asset-picker').getAttribute('data-picker-mode'),'quick');
  // Row 7: Download on finished project cards only.
  await page.evaluate(()=>location.hash='projects');await page.locator('.project-card').first().waitFor();await page.waitForFunction(n=>document.querySelectorAll('.project-card').length>=n,4);
  const card=id=>page.locator('.project-card').filter({has:page.locator(`a[href="#project/${id}"]`)});
  for(const j of [flagged,clean,wrong])assert.equal(await card(j.id).locator('[data-action=card-download]').count(),1,j.intake.campaignName);
  assert.equal(await card(running.id).locator('[data-action=card-download]').count(),0,'no Download while creating');
  assert.equal(await page.locator('.project-card').filter({hasText:/Draft/}).locator('[data-action=card-download]').count(),0,'no Download on a local draft');
  assert.equal((await card(clean.id).locator('[data-action=card-download]').innerText()).trim(),'','icon only (8 Nov 2026)');assert.match(await card(clean.id).locator('[data-action=card-download]').getAttribute('aria-label'),/^Download /);
  const [download]=await Promise.all([page.waitForEvent('download'),card(clean.id).locator('[data-action=card-download]').click()]);
  assert.match(download.suggestedFilename(),/\.png$/);
  await page.waitForFunction(()=>/Downloaded/.test(document.querySelector('#toast')?.textContent||''));
  // The existing dimension gate still blocks, with the same message.
  await card(wrong.id).locator('[data-action=card-download]').click();
  await page.waitForFunction(()=>/image dimensions do not match the selected format/.test(document.querySelector('#toast')?.textContent||''));
  // Home "Continue working" cards offer the same Download.
  await page.evaluate(()=>location.hash='home');await page.locator('.continue-card').first().waitFor();
  assert.ok(await page.locator('.continue-card [data-action=card-download]').count()>=1);
  // Row 7 + 17: labelled review download; flagged design reads "Check before using", clean reads Ready.
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',flagged.id);await page.locator('.focused-art img').waitFor();
  assert.equal((await page.locator('.review-image-actions [data-action=download]').innerText()).trim(),'Download');
  assert.equal(await page.locator('.flow-header-status .status').innerText(),'Check before using');
  assert.equal(await page.locator('.flow-header-status .status').getAttribute('data-design-check'),'check');
  await page.evaluate(id=>location.hash='review/'+id+'/0/0',clean.id);await page.waitForFunction(()=>document.querySelector('.flow-header-status .status')?.dataset.designCheck==='ready');
  assert.equal(await page.locator('.flow-header-status .status').innerText(),'Ready');
  // Mobile: the sidebar still opens and "+ New" opens the picker and closes the sidebar.
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>location.hash='home');await page.locator('.creation-hero').waitFor();
  await page.locator('#sidebarToggle').click();await page.locator('#sidebarNavigation [data-group=social]').click();await page.locator('#assetPickerGrid .asset-card').first().waitFor();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('sidebar-mobile-open')),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.setViewportSize({width:1366,height:900});
 }
 assert.deepEqual(posts,[],'no POST was attempted');assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>f.server.close(r));}
});
