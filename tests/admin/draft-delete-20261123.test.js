'use strict';
// Delete draft (Neha, 23 Nov 2026: "Yes, add it"). Checking the redeployed hosted Studio left a test brochure draft in
// Neha's account, and the Studio had no way to delete a draft: no button, and the account copy could only be read or
// saved (GET/PUT). Move to Trash only hides an item on one browser, so the account copy came back on every other device.
// Now a draft's ··· menu (and Trash) has "Delete draft": after a confirmation it is marked deleted in the account
// (kept in the database, hidden from every list, never synced back) and removed from this browser. Another device
// drops its copy on the next load, unless it holds edits that never reached the account (those stay, marked deleted).
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{MongoMemoryReplSet}=require('mongodb-memory-server'),{MongoClient}=require('mongodb');
const {createAdminServer}=require('../../admin-server');
const M=require('../../public/creative-ai/studio-model');
let repl,client,app,root,base,cookie;
const brands=[{id:'brand-duroflex',name:'Duroflex'},{id:'brand-sleepyhead',name:'Sleepyhead'}];
async function call(url,{method='GET',body,auth=cookie,origin=base}={}){return fetch(base+url,{method,headers:{Cookie:auth||'',Origin:origin,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});}
async function login(username){const r=await call('/admin/api/login',{method:'POST',body:{username,password:'test-password-123'},auth:''});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
before(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),'draft-delete-test-'));await fs.writeFile(path.join(root,'workspace.json'),JSON.stringify({brands}));repl=await MongoMemoryReplSet.create({replSet:{count:1}});client=await new MongoClient(repl.getUri()).connect();app=await createAdminServer({client,db:client.db('briefs'),sourceRoot:root,setupToken:'test'});await app.accounts.create({username:'owner',name:'Owner',password:'test-password-123'},null,{bootstrap:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;cookie=await login('owner');});
after(async()=>{await new Promise(r=>app?.server.close(r));await client?.close();await repl?.stop();await fs.rm(root,{recursive:true,force:true});});

for(const brand of brands)test(brand.name+': a saved draft can be deleted from the account, and stays deleted',async()=>{
 const id='draft-delete-'+brand.id.slice(6),route='/admin/api/briefs/'+brand.id+'/'+id,draft={schemaVersion:1,id,brandId:brand.id,outputs:[],brief:'Test brochure brief'};
 let r=await call(route,{method:'PUT',body:{draft,version:0}});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).version,1);
 // Before this change the route answered 405 "Unsupported brief action."
 assert.equal((await call(route,{method:'DELETE',body:{version:1},origin:'https://other.test'})).status,403,'only from the Studio itself');
 r=await call(route,{method:'DELETE',body:{version:0}});assert.equal(r.status,409,'a device that has not seen the newest version cannot delete it');assert.match((await r.json()).error,/changed on another device/);
 r=await call(route,{method:'DELETE',body:{version:1}});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).deleted,true);
 const list=await (await call('/admin/api/briefs?brand='+brand.id)).json();assert.ok(!list.some(row=>row.draft?.id===id),'gone from the account list');
 const all=await (await call('/admin/api/briefs?brand='+brand.id+'&deleted=1')).json(),gone=all.find(row=>row.draft?.id===id);
 assert.equal(gone?.deleted,true,'other devices can learn it was deleted');assert.equal(gone.draft.brief,undefined,'a deleted entry carries no brief content');
 assert.equal(await (await call(route)).json(),null,'reading it finds nothing');
 r=await call(route,{method:'PUT',body:{draft:{...draft,brief:'Edited on another device'},version:1}});assert.equal(r.status,410,'an old device cannot bring it back');assert.match((await r.json()).error,/deleted/i);
 assert.equal((await call(route,{method:'DELETE',body:{version:1}})).status,200,'deleting twice is harmless');
 const row=await client.db('briefs').collection('studio_briefs').findOne({brandId:brand.id,id});assert.ok(row.deletedAt,'marked deleted');assert.equal(row.draft.brief,'Test brochure brief','kept in the database, not erased');
 const other=brand.id==='brand-duroflex'?'brand-sleepyhead':'brand-duroflex';assert.equal((await call('/admin/api/briefs/'+other+'/'+id,{method:'DELETE',body:{version:1}})).status,200);
 assert.equal((await client.db('briefs').collection('studio_briefs').findOne({brandId:other,id})),null,'the other brand is untouched');
});

test('another account cannot delete someone else\'s draft',async()=>{
 const owner=await app.accounts.users.findOne({username:'owner'}),u=await app.accounts.create({username:'second-del',name:'Second',password:'test-password-123',role:'member'},{id:owner._id});await app.accounts.users.updateOne({_id:u.id},{$set:{mustChangePassword:false}});const second=await login('second-del');
 for(const brand of brands){const id='draft-keep-'+brand.id.slice(6),route='/admin/api/briefs/'+brand.id+'/'+id;assert.equal((await call(route,{method:'PUT',body:{draft:{schemaVersion:1,id,brandId:brand.id,outputs:[],brief:'Owner brief'},version:0}})).status,200);
  assert.equal((await call(route,{method:'DELETE',body:{version:1},auth:second})).status,200,'answers as if nothing was there');
  assert.ok((await (await call('/admin/api/briefs?brand='+brand.id)).json()).some(row=>row.draft.id===id),'the owner\'s draft is still listed');}
});

test('device storage removes one draft only, and refuses a stale tab',()=>{
 const values=new Map(),store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i]??null,get length(){return values.size;}};
 const s=M.storage(store);for(const brand of brands){const a=s.save({schemaVersion:1,id:'draft-a',brandId:brand.id,outputs:[]},undefined),b=s.save({schemaVersion:1,id:'draft-b',brandId:brand.id,outputs:[]},undefined);
  assert.throws(()=>s.remove(brand.id,'draft-a',a.revision+1),/changed in another tab/);
  s.remove(brand.id,'draft-a',a.revision);assert.equal(s.read(brand.id,'draft-a'),null);assert.equal(s.read(brand.id,'draft-b').id,b.id,'the other draft stays');}
 assert.equal(s.list('brand-duroflex').drafts.length,1);assert.equal(s.list('brand-sleepyhead').drafts.length,1,'each brand keeps its own');
 const org=M.organization(store);let v=org.update(org.read('brand-duroflex'),'project:draft-b',{favourite:true});v=org.forget(v,'project:draft-b');assert.equal(v.entries['project:draft-b'],undefined,'a deleted draft leaves no favourite or Trash entry behind');
 assert.throws(()=>org.forget(v,'creative:x'),/Unsupported/);
});

test('browser: Delete draft on one device removes it everywhere, for both brands',{timeout:240000},async()=>{
 const fixture=await require('../creative-ai/helpers/intake-preview.cjs').createPreview();const {AdminHTTP}=require('../../lib/admin/http'),{BriefDocuments}=require('../../lib/admin/brief-documents');const handler=new AdminHTTP({accounts:app.accounts,requests:app.requests,preview:false});handler.briefs=new BriefDocuments(client.db('browser_delete'),fixture.brands);await handler.briefs.init();
 const ui=require('node:http').createServer(async(req,res)=>{try{if(req.url.startsWith('/admin')){await handler.handle(req,res);return;}const actor=await handler.actor(req);if(!actor){res.writeHead(401);res.end();return;}const u=new URL(req.url,'http://localhost');if(u.pathname==='/creative-ai/session.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(require('../../lib/admin/studio-access').sessionScript(actor));return;}if(u.pathname==='/creative-ai/studio.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await fs.readFile(path.resolve('public/creative-ai/studio.html')));return;}if(req.method!=='GET'){res.writeHead(501,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Test fixture: generation unavailable'}));return;}const response=await fetch(fixture.url.replace('/creative-ai/studio.html','')+req.url);res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json'});res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});
 await new Promise(r=>ui.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+ui.address().port;
 const browser=await require('playwright-core').chromium.launch({executablePath:require('../browser-path.cjs')(),headless:true});const a=await browser.newContext({viewport:{width:1440,height:1000}}),b=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
 try{
  for(const ctx of [a,b]){const r=await ctx.request.post(url+'/admin/api/login',{headers:{Origin:url},data:{username:'owner',password:'test-password-123'}});assert.equal(r.status(),200);}
  const p=await a.newPage(),q=await b.newPage();for(const page of [p,q])page.on('pageerror',e=>errors.push(e.message));
  // A full load each time (a hash-only change would not reload), so the account restore runs as it does on a real visit.
  const open=async(page,brandId,hash='')=>{await page.goto('about:blank');await page.goto(url+'/creative-ai/studio.html?brand='+brandId+hash);await page.locator('main').waitFor();};
  const local=(page,brandId,id)=>page.evaluate(([brandId,id])=>StudioModel.storage(CreativeAccount.storage).read(brandId,id),[brandId,id]);
  const synced=async(ctx,brandId,id)=>(await (await ctx.request.get(url+'/admin/api/briefs?brand='+brandId)).json()).some(row=>row.draft?.id===id);
  const make=async(brandId,text,sync=true)=>p.evaluate(async([brandId,text,sync])=>{const d=StudioModel.startDraft(brandId,'quick',9);d.focus='brand';d.creativeCount=1;d.brief=text;const saved=StudioModel.storage(CreativeAccount.storage).save(d);if(sync){StudioDocuments.enqueue(saved);await StudioDocuments.flush(saved);}return saved.id;},[brandId,text,sync]);
  const deleteFrom=async(page,id,where)=>{const key='project:'+id;if(where==='menu'){await page.locator(`[data-action=org-menu][data-org-key="${key}"]`).first().click();await page.locator('#fileActionsMenu [data-action=org-delete-draft]').click();}else await page.locator(`[data-action=org-delete-draft][data-org-key="${key}"]`).click();
   await page.locator('#taskPanel').getByText('Delete this draft?').waitFor();assert.match(await page.locator('#taskPanel').innerText(),/your account and this browser/);await page.locator('[data-action=org-confirm-delete-draft]').click();await page.getByText('Draft deleted.').first().waitFor();};
  for(const brand of fixture.brands){
   await open(p,brand.id);const gone=await make(brand.id,'Delete me on every device'),kept=await make(brand.id,'Edited on device two before the delete');
   assert.ok(await synced(a,brand.id,gone)&&await synced(a,brand.id,kept),'both drafts reached the account');
   await open(q,brand.id);await q.waitForFunction(([b,ids])=>ids.every(id=>StudioModel.storage(CreativeAccount.storage).read(b,id)),[brand.id,[gone,kept]]);
   await q.evaluate(([b,id])=>{const s=StudioModel.storage(CreativeAccount.storage),d=s.read(b,id);s.save({...d,brief:'Unsent edit on device two'});},[brand.id,kept]);
   await open(p,brand.id,'#projects');await deleteFrom(p,gone,'menu');
   assert.equal(await local(p,brand.id,gone),null,'removed from this browser');assert.equal(await p.locator(`[data-org-key="project:${gone}"]`).count(),0,'gone from Projects');assert.equal(await synced(a,brand.id,gone),false,'gone from the account');
   await deleteFrom(p,kept,'menu');
   await open(q,brand.id,'#projects');await q.waitForFunction(([b,id])=>!StudioModel.storage(CreativeAccount.storage).read(b,id),[brand.id,gone]);assert.equal(await q.locator(`[data-org-key="project:${gone}"]`).count(),0,'device two drops its unchanged copy');
   assert.equal((await local(q,brand.id,kept))?.brief,'Unsent edit on device two','an unsent edit on device two is never thrown away');
   await q.waitForFunction(([b,id])=>/deleted/i.test(StudioDocuments.status({brandId:b,id}).message),[brand.id,kept]);assert.equal(await synced(b,brand.id,kept),false,'and it does not come back to the account');
   // A draft in Trash can be deleted from there too, and leaves no Trash entry behind.
   const trashed=await make(brand.id,'Trash then delete',false);await open(p,brand.id,'#projects');await p.locator(`[data-action=org-menu][data-org-key="project:${trashed}"]`).first().click();await p.locator('#fileActionsMenu [data-action=org-trash]').click();await p.locator('[data-action=org-confirm-trash]').click();
   await open(p,brand.id,'#settings/trash');await deleteFrom(p,trashed,'trash');assert.equal(await local(p,brand.id,trashed),null);
   assert.equal(await p.evaluate(([b,id])=>StudioModel.organization(CreativeAccount.storage).read(b).entries['project:'+id],[brand.id,trashed]),undefined,'no "Temporarily unavailable item" left in Trash');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>ui.close(r));await new Promise(r=>fixture.server.close(r));}
});
