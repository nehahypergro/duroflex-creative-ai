'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
function response(){return {headersSent:false,destroyed:false,writableEnded:false,writeHead(status){assert.equal(this.headersSent,false,'Cannot write headers twice');this.statusCode=status;this.headersSent=true;},end(body){this.body=body;this.writableEnded=true;},destroy(){this.destroyed=true;}};}
test('runtime catches null and object throws, and missing assets do not commit 200',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'error-boundary-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const app=require('../../lib/creative-ai/runtime/http').createHandler({root,provider:{}});await app.runtime.publishing.ready;
 for(const value of [null,'failure',{},42]){app.runtime.brands.list=async()=>{throw value;};const res=response();await app.handle({method:'GET'},res,'/creative-ai/api/brands');assert.equal(res.statusCode,400);assert.equal(typeof JSON.parse(res.body).error,'string');}
 for(const url of ['/creative-ai/studio.html','/creative-ai/placement-guide']){const res=response();await app.handle({method:'GET'},res,url);assert.equal(res.statusCode,404);}
 const res=response();res.headersSent=true;app.runtime.brands.list=async()=>{throw Error('after headers');};await app.handle({method:'GET'},res,'/creative-ai/api/brands');assert.equal(res.destroyed,true);
});
test('runner survives failure to persist an error and still runs the next job',()=>{
 const code=`const {CreativeRuntime}=require(${JSON.stringify(require.resolve('../../lib/creative-ai/runtime/engine'))});const r=Object.create(CreativeRuntime.prototype);r.active=new Set();r.pending=['one','two'];r.config={maxConcurrentJobs:1};r.store={update:async()=>{throw Error('disk full')}};r.log=async()=>{throw Error('ledger full')};let count=0;r.execute=async()=>{count++;throw null};r.pump();setTimeout(()=>{if(count!==2||r.active.size)process.exitCode=2;},30);`;
 const child=spawnSync(process.execPath,['-e',code],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);
});
test('an orphan job directory cannot block keyed creation or defeat deduplication',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'orphan-create-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const {JobStore}=require('../../lib/creative-ai/runtime/store'),store=new JobStore(path.join(root,'jobs'));await fs.mkdir(store.dir('creative-orphan'),{recursive:true});
 for(const brandId of ['brand-duroflex','brand-sleepyhead']){const intake={brandId,requestKey:'request-'+brandId},a=await store.create(intake,{jobTimeoutMs:10000},[]),b=await store.create(intake,{jobTimeoutMs:10000},[]);assert.equal(a.id,b.id);}
});
test('admin catches non-Error throws and reads static files before headers',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'admin-boundary-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const app=Object.create(require('../../lib/admin/http').AdminHTTP.prototype);app.publicRoot=root;app.accounts={session:async()=>{throw null}};
 for(const url of ['/admin','/admin/creative-ai-logo-02b.svg','/admin/api/session']){const res=response();res.setHeader=()=>{};await app.handle({url,method:'GET',headers:{}},res);assert.equal(res.statusCode,url.includes('/api/')?500:404);}
});
