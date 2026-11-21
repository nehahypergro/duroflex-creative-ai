'use strict';
// Speed review (21 Nov 2026; developer: "the api request has a lot of latency, every single click is requesting
// multiple api calls and many db calls"). Measured on the local copy before the fix: a fresh Studio load made 231
// requests and fetched ~10 MB of uncompressed JSON plus ~2 MB of scripts on every visit; opening one project read
// ~180 files on the server (the activity reader keeps only 8 projects); request tracking re-read the project after
// every project request. After: 6 requests, ~720 KB. Every test here fails before the fix.
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),zlib=require('node:zlib'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const repo=path.join(__dirname,'../..');
const BRANDS=[['Duroflex','brand-1923d633-e03e-44cc-84b2-bbfb5c152710'],['Sleepyhead','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de']];
const listen=handler=>new Promise(r=>{const s=http.createServer(handler);s.listen(0,'127.0.0.1',()=>r(s));});
const request=(port,p,headers={})=>new Promise((res,rej)=>http.get({host:'127.0.0.1',port,path:p,headers},r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:Buffer.concat(c)}));}).on('error',rej));

test('answers are gzipped and page files get an ETag and 304 when unchanged',async()=>{
 const {wrap}=require('../../lib/http-speed'),big=JSON.stringify({rows:Array.from({length:400},(_,i)=>({i,name:'project '+i}))});
 const s=await listen((req,res)=>{wrap(req,res);
  if(req.url==='/api')return res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}),res.end(big);
  if(req.url==='/page.js')return res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'}),res.end('x'.repeat(5000));
  if(req.url==='/small')return res.writeHead(200,{'Content-Type':'application/json'}),res.end('{"ok":true}');
  if(req.url==='/image')return res.writeHead(200,{'Content-Type':'image/png'}),res.end(Buffer.alloc(4000));
  if(req.url==='/stream'){res.writeHead(200,{'Content-Type':'text/plain'});res.write('a'.repeat(3000));return res.end('b');}
 }),port=s.address().port;
 try{
  const api=await request(port,'/api',{'accept-encoding':'gzip, br'});assert.equal(api.headers['content-encoding'],'gzip');assert.equal(zlib.gunzipSync(api.body).toString(),big);assert.ok(api.body.length<big.length/4);assert.equal(api.headers.etag,undefined,'no-store answers are never kept');
  assert.equal((await request(port,'/api')).headers['content-encoding'],undefined,'no gzip unless the browser accepts it');
  const page=await request(port,'/page.js',{'accept-encoding':'gzip'});assert.match(page.headers.etag,/^W\/"/);
  const again=await request(port,'/page.js',{'accept-encoding':'gzip','if-none-match':page.headers.etag});assert.equal(again.status,304);assert.equal(again.body.length,0);
  assert.equal((await request(port,'/small',{'accept-encoding':'gzip'})).headers['content-encoding'],undefined);
  assert.equal((await request(port,'/image',{'accept-encoding':'gzip'})).headers['content-encoding'],undefined);
  const stream=await request(port,'/stream',{'accept-encoding':'gzip'});assert.equal(stream.headers['content-encoding'],undefined);assert.equal(stream.body.toString(),'a'.repeat(3000)+'b');
 }finally{s.close();}
 assert.match(fs.readFileSync(path.join(repo,'server.js'),'utf8'),/require\('\.\/lib\/http-speed'\)\.wrap\(req,res\)/);
});

async function jobTree(brandId,id,status='finished'){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'view-cache-')),dir=path.join(root,'jobs',id),activity=path.join(root,'activity',id);
 await fsp.mkdir(dir,{recursive:true});await fsp.mkdir(activity,{recursive:true});
 const save=async(d,name,value)=>{const tmp=path.join(d,name+'.tmp');await fsp.writeFile(tmp,JSON.stringify(value));await fsp.rename(tmp,path.join(d,name));};
 await save(dir,'job.json',{id,status,intake:{brandId}});await fsp.writeFile(path.join(activity,'00000001.json'),'{}');
 let viewer='admin';const runtime={store:{dir:x=>path.join(root,'jobs',x)},activity:{folder:x=>path.join(root,'activity',x)},viewerKey:()=>viewer};
 return {root,dir,activity,save,runtime,setViewer:v=>{viewer=v;}};
}
for(const [brand,brandId] of BRANDS)test(brand+': a finished project view is reused until its files change',async()=>{
 const {ViewCache}=require('../../lib/creative-ai/runtime/view-cache'),id='creative-'+brandId.slice(6,14)+'-0000-4000-8000-000000000001',t=await jobTree(brandId,id);
 let clock=0,builds=0,status='finished';const cache=new ViewCache({now:()=>clock}),build=async()=>({id,status,n:++builds});
 assert.equal((await cache.get(t.runtime,id,build)).n,1);assert.equal((await cache.get(t.runtime,id,build)).n,1,'unchanged: no rebuild');
 await new Promise(r=>setTimeout(r,15));await t.save(t.dir,'job.json',{id,status:'finished',intake:{brandId},changed:true});assert.equal((await cache.get(t.runtime,id,build)).n,2,'another writer changed job.json');
 await fsp.writeFile(path.join(t.activity,'00000002.json'),'{}');assert.equal((await cache.get(t.runtime,id,build)).n,3,'a new activity event');
 const child=path.join(t.dir,'refinements','creative-'+brandId.slice(6,14)+'-0000-4000-8000-000000000009');await fsp.mkdir(child,{recursive:true});await t.save(child,'job.json',{status:'running'});assert.equal((await cache.get(t.runtime,id,build)).n,4,'a new edit version');
 await new Promise(r=>setTimeout(r,15));await t.save(child,'job.json',{status:'finished'});assert.equal((await cache.get(t.runtime,id,build)).n,5,'the edit version finished');
 assert.equal((await cache.get(t.runtime,id,build)).n,5);
 t.setViewer('member:u1:1');assert.equal((await cache.get(t.runtime,id,build)).n,6,'a teammate gets their own entry');t.setViewer('admin');
 cache.drop(id);assert.equal((await cache.get(t.runtime,id,build)).n,7,'a save through this server drops it');
 clock+=11*60*1000;assert.equal((await cache.get(t.runtime,id,build)).n,8,'rebuilt after ten minutes anyway');
 status='running';cache.drop(id);await cache.get(t.runtime,id,build);assert.equal((await cache.get(t.runtime,id,build)).n,10,'projects still being made are never kept');
 await fsp.rm(t.root,{recursive:true,force:true});
});

test('the engine routes project views through the cache and drops it on every save',async()=>{
 const src=fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/engine.js'),'utf8');
 assert.match(src,/if\(!this\.viewCache\)\{this\.viewCache=new/);assert.match(src,/async viewFresh\(id\)/);assert.match(src,/for\(const name of \['save','update'\]\)/);
 assert.match(fs.readFileSync(path.join(repo,'lib/admin/studio-access.js'),'utf8'),/runtime\.viewerKey=\(\)=>/);
});

for(const [brand,brandId] of BRANDS)test(brand+': one request returns the brand’s visible projects with their edits',async()=>{
 const other=BRANDS.find(b=>b[1]!==brandId)[1],job=(n,b,extra={})=>({id:'creative-'+b.slice(6,14)+'-0000-4000-8000-00000000000'+n,status:'finished',createdAt:'2026-11-2'+n+'T00:00:00Z',intake:{brandId:b,...extra},results:[]});
 const jobs=[job(1,brandId),job(2,brandId),job(3,other),job(4,brandId,{clientVisibility:'internal'}),job(5,brandId)];
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'project-list-')),jobsDir=path.join(root,'jobs');for(const j of jobs){await fsp.mkdir(path.join(jobsDir,j.id),{recursive:true});await fsp.writeFile(path.join(jobsDir,j.id,'job.json'),JSON.stringify(j));}
 const viewed=[],store={root:jobsDir,dir:id=>path.join(jobsDir,id),read:async id=>JSON.parse(await fsp.readFile(path.join(jobsDir,id,'job.json'),'utf8'))},runtime={store,view:async id=>{viewed.push(id);if(id.endsWith('5'))throw Error('broken');return {id,brandId,status:'finished',results:[]};}};
 const {projects}=require('../../lib/creative-ai/runtime/project-list');
 const all=await projects(runtime,root,brandId);
 assert.deepEqual(all.projects.map(p=>p.id).sort(),[jobs[0].id,jobs[1].id,jobs[4].id].sort(),'own brand only, internal work hidden');
 assert.equal(all.projects.find(p=>p.id===jobs[4].id).loadError,'This project could not load.');assert.ok(all.projects.filter(p=>!p.loadError).every(p=>'edits' in p));
 viewed.length=0;const some=await projects(runtime,root,brandId,[jobs[1].id,jobs[2].id]);assert.deepEqual(some.projects.map(p=>p.id),[jobs[1].id]);assert.deepEqual(viewed,[jobs[1].id],'only the asked-for projects are read');
 await fsp.rm(root,{recursive:true,force:true});
 assert.match(fs.readFileSync(path.join(repo,'lib/creative-ai/runtime/http.js'),'utf8'),/searchParams\.get\('include'\)==='projects'/);
});

for(const [brand,brandId] of BRANDS)test(brand+': the page loads projects with the list plus one request for new or changed ones',async()=>{
 const M=require('../../public/creative-ai/studio-model.js'),calls=[],id=n=>'creative-'+brandId.slice(6,14)+'-0000-4000-8000-00000000000'+n;let fresh='a';
 const listRows=()=>[1,2,3].map(n=>({id:id(n),brandId,status:'finished',createdAt:'2026-11-0'+n+'T00:00:00Z',updatedAt:'2026-11-0'+n+'T00:00:00Z',freshness:n===2?fresh:'x'}));
 const fetch=async url=>{const u=new URL(url,'http://local');calls.push(u.pathname+(u.searchParams.get('include')?'?projects='+u.searchParams.get('ids').split(',').length:''));
  const body=u.pathname.endsWith('/jobs')&&!u.searchParams.get('include')?listRows():{version:1,brandId,projects:u.searchParams.get('ids').split(',').map(x=>({id:x,brandId,status:'finished',createdAt:'2026-11-01T00:00:00Z',placements:[{id:'square'}],results:[{route:'continuity',placementId:'square',imageUrl:'/a.png'}],edits:[{route:'continuity',placementId:'square',revision:2,updatedAt:'2026-11-05T00:00:00Z'}]}))};
  return {ok:true,status:200,json:async()=>body};};
 const window={sessionStorage:{length:0,key:()=>null,getItem:()=>null,setItem(){},removeItem(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
 const ctx=vm.createContext({window,StudioModel:M,fetch,AbortController,setTimeout,clearTimeout,console,URL,indexedDB:undefined,structuredClone});
 vm.runInContext(fs.readFileSync(path.join(repo,'public/creative-ai/studio-data.js'),'utf8'),ctx);const D=window.StudioData;
 const [a,b]=await Promise.all([D.projects(brandId,false),D.projects(brandId,true)]);
 assert.equal(a,b,'overlapping loads share one request');assert.deepEqual(calls,['/creative-ai/api/jobs','/creative-ai/api/jobs?projects=3']);
 assert.equal(a.projects[0].results[0].latestEdit.revision,2);
 calls.length=0;await D.projects(brandId,true);assert.deepEqual(calls,['/creative-ai/api/jobs'],'nothing changed: only the short list');
 calls.length=0;fresh='b';await D.projects(brandId,true);assert.deepEqual(calls,['/creative-ai/api/jobs','/creative-ai/api/jobs?projects=1'],'only the changed project');
});

test('request tracking reads the project only when it records something',async()=>{
 const {Tracking}=require('../../lib/admin/tracking');let reads=0;const t=Object.create(Tracking.prototype);t.requests={read:async(a,id)=>{reads++;return {id,intake:{brandId:BRANDS[0][1]}};}};t.append=async()=>{};t.clientEvent=async()=>{};
 const job='/creative-ai/api/jobs/creative-19230000-0000-4000-8000-000000000001';
 for(const sub of ['/edits','/details','/creative-feedback'])await t.observeResponse({id:'u'},{method:'GET',url:job+sub,status:200,attachment:false,context:{}});
 assert.equal(reads,0);
 await t.observeResponse({id:'u'},{method:'GET',url:job+'/files/static-a.png',status:200,attachment:true,context:{}});assert.equal(reads,1);
 await t.observeResponse({id:'u'},{method:'POST',url:job+'/retry-checks',status:202,attachment:false,context:{}});assert.equal(reads,2);
});

test('the editor drawing library loads when the layer editor opens, not with every Studio page',()=>{
 assert.doesNotMatch(fs.readFileSync(path.join(repo,'public/creative-ai/studio.html'),'utf8'),/vendor\/fabric\.min\.js/);
 const src=fs.readFileSync(path.join(repo,'public/creative-ai/editable-canvas.js'),'utf8');assert.match(src,/async function openDocument\(key,options=\{\}\)\{ await ensureFabric\(\);/);assert.match(src,/s\.src='\/creative-ai\/vendor\/fabric\.min\.js'/);
});
