'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),net=require('node:net'),crypto=require('node:crypto');
const {PostgresCoordinator}=require('../../lib/creative-ai/distributed/postgres-coordinator');
test('PostgreSQL serializes ten clients, preserves budget and fences lost workers across both brands',async t=>{
 const {default:EmbeddedPostgres}=await import('embedded-postgres'),{Pool}=require('pg'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'creative-postgres-'));
 const probe=net.createServer();await new Promise((r,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',r);});const port=probe.address().port;await new Promise(r=>probe.close(r));
 const password=crypto.randomUUID();const pg=new EmbeddedPostgres({databaseDir:path.join(dir,'db'),port,user:'postgres',password,persistent:false,onLog:()=>{},onError:()=>{}});
 const connections=new Set();let pool;t.after(async()=>{if(pool){const ended=[...connections].filter(c=>!c._ended).map(c=>require('node:events').once(c,'end'));await pool.end();await Promise.all(ended);}await pg.stop().catch(()=>{});await fs.rm(dir,{recursive:true,force:true});});await pg.initialise();await pg.start();
 pool=new Pool({host:'127.0.0.1',port,user:'postgres',database:'postgres',password,max:20});pool.on('connect',client=>connections.add(client));const clients=Array.from({length:10},()=>new PostgresCoordinator(pool));await clients[0].migrate();
 const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 for(const brand of ['duroflex','sleepyhead']){
  const base={jobId:'creative-'+brand,brandId:'brand-'+brand,kind:'image',limitUsd:30,reservationUsd:3,inputHash:hash('payload'),payload:{key:'fixture'},deadline:Date.now()+60000};
  await Promise.all(clients.map((c,i)=>c.enqueue({...base,requestKey:hash('request-'+i)})));
  await Promise.all(clients.map(c=>c.enqueue({...base,requestKey:hash('request-0')})));
  assert.equal(Number((await pool.query('SELECT reserved_usd FROM creative_execution_jobs WHERE id=$1',[base.jobId])).rows[0].reserved_usd),30);
  await assert.rejects(()=>clients[0].enqueue({...base,requestKey:hash('extra')}),/REMOTE_BUDGET_EXCEEDED/);
  const claims=(await Promise.all(clients.map((c,i)=>c.claim('image','worker-'+i)))).filter(Boolean);assert.equal(claims.length,2);
  const lost=claims[0],safe=claims[1];await clients[0].dispatch(lost);
  await pool.query("UPDATE creative_execution_requests SET lease_until=clock_timestamp()-interval '1 second' WHERE job_id=$1",[base.jobId]);
  const replacement=await clients[1].claim('image','replacement');assert.ok(replacement);assert.notEqual(replacement.request_key,lost.request_key);assert.equal(await clients[2].claim('image','third-worker'),null,'Ambiguous dispatched work retains a slot through its deadline');
  assert.equal((await clients[0].get(lost.job_id,lost.kind,lost.request_key)).state,'unknown');await assert.rejects(()=>clients[0].dispatch(safe),/REMOTE_LEASE_LOST/);
  await clients[0].complete(lost,{key:'late-saved-response'});assert.equal((await clients[0].get(lost.job_id,lost.kind,lost.request_key)).state,'completed');
  await assert.rejects(()=>clients[0].enqueue({...base,brandId:'brand-other',requestKey:hash('request-0')}),/scope/);
  // Clear fixture pending states only, never reservations, before next brand.
  await pool.query("UPDATE creative_execution_requests SET state='cancelled' WHERE job_id=$1 AND state IN ('queued','leased')",[base.jobId]);
 }
 // Release only requests proven never dispatched, once, retaining ambiguous spend.
 const c=clients[0],jobId='creative-refunds',base={jobId,brandId:'brand-duroflex',kind:'reasoning',limitUsd:10,reservationUsd:2,inputHash:hash('refund-payload'),payload:{key:'fixture'},deadline:Date.now()+60000};
 await c.enqueue({...base,requestKey:hash('expired')});await pool.query("UPDATE creative_execution_requests SET deadline=clock_timestamp()-interval '1 second' WHERE job_id=$1",[jobId]);await c.claim('reasoning','refund-worker');
 const reserved=async()=>Number((await pool.query('SELECT reserved_usd FROM creative_execution_jobs WHERE id=$1',[jobId])).rows[0].reserved_usd);assert.equal(await reserved(),0);await c.claim('reasoning','refund-worker');assert.equal(await reserved(),0);
 await c.enqueue({...base,requestKey:hash('invalid')});const invalid=await c.claim('reasoning','refund-worker');await c.cancel(invalid);await c.cancel(invalid);assert.equal(await reserved(),0);
 await c.enqueue({...base,requestKey:hash('ambiguous')});const unknown=await c.claim('reasoning','refund-worker');await c.dispatch(unknown);await c.unknown(unknown);await c.cancel(unknown);assert.equal(await reserved(),2);assert.equal((await c.get(jobId,'reasoning',unknown.request_key)).state,'unknown');
 await c.complete(unknown,{key:'usage-response'},0.05);assert.equal(await reserved(),0.05);await c.complete(unknown,{key:'usage-response'},0.05);assert.equal(await reserved(),0.05,'settlement must be idempotent after database reconnect');
 await c.enqueue({...base,requestKey:hash('new-after-settlement')});assert.equal(await reserved(),2.05);

});
test('private object references are scoped and actual bytes are verified',async()=>{
 const {ObjectStore}=require('../../lib/creative-ai/distributed/object-store');const objects=new Map(),client={send:async command=>{const x=command.input;if(x.Body){objects.set(x.Key,Buffer.from(x.Body));return {};}return {Body:(async function*(){yield objects.get(x.Key);})()};}};
 const store=new ObjectStore(client,'private-test');for(const brand of ['duroflex','sleepyhead']){const scope='brand-'+brand+'/creative-test',ref=await store.put(scope,Buffer.from('Exact '+brand));assert.equal((await store.get(ref,scope)).toString(),'Exact '+brand);await assert.rejects(()=>store.get(ref,'brand-other/creative-test'),/reference/);objects.set(ref.key,Buffer.from('changed'));await assert.rejects(()=>store.get(ref,scope),/size|integrity/);}
});
