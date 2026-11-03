'use strict';
// Workers consume only already-reserved, scoped tasks. Never create campaigns.
const path=require('node:path'),{setTimeout:delay}=require('node:timers/promises');
const root=path.resolve(__dirname,'../..'),config=require('../../lib/creative-ai/runtime/config').loadConfig(root);
(async()=>{if(!config.distributed)throw Error('Configure PostgreSQL execution before starting a worker');const backend=require('../../lib/creative-ai/distributed/settings').connect(config.distributed);try{
 if(process.argv.includes('--migrate')){await backend.coordinator.migrate();console.log('Shared execution schema verified');return;}
 if(process.argv.includes('--check-storage')){const bytes=Buffer.from('creative-private-storage-probe-v1'),scope='brand-storage-probe/creative-storage-probe',ref=await backend.objects.put(scope,bytes);if(!(await backend.objects.get(ref,scope)).equals(bytes))throw Error('Storage verification failed');console.log('Private storage write/read integrity verified; probe retained');return;}
 if(!config.apiKey)throw Error('Worker provider credential is missing');const owner='worker-'+require('node:crypto').randomUUID();let stopped=false;for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{stopped=true;});
 const run=async kind=>{while(!stopped){const r=await backend.coordinator.claim(kind,owner);if(!r){await delay(500);continue;}try{await require('../../lib/creative-ai/distributed/execution').executeClaim(backend.coordinator,backend.objects,r,{apiKey:config.apiKey});}catch{console.error(JSON.stringify({jobId:r.job_id,kind,requestKey:r.request_key,status:'check-shared-execution-record'}));}}};
 await Promise.all([run('image'),run('reasoning')]);
 }finally{await backend.pool.end();}})().catch(()=>{console.error('Execution worker stopped; check database, bucket and worker configuration. No automatic paid retry was started.');process.exitCode=1;});
