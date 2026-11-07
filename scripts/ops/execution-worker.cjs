'use strict';
// Workers consume only already-reserved, scoped tasks. Never create campaigns.
const path=require('node:path'),{setTimeout:delay}=require('node:timers/promises');
const root=path.resolve(__dirname,'../..'),config=require('../../lib/creative-ai/runtime/config').loadConfig(root);
(async()=>{if(!config.distributed)throw Error('Configure PostgreSQL execution before starting a worker');const backend=require('../../lib/creative-ai/distributed/settings').connect(config.distributed);try{
 if(process.argv.includes('--migrate')){await backend.coordinator.migrate();console.log('Shared execution schema verified');return;}
 if(process.argv.includes('--check-storage')){const bytes=Buffer.from('creative-private-storage-probe-v1'),scope='brand-storage-probe/creative-storage-probe',ref=await backend.objects.put(scope,bytes);if(!(await backend.objects.get(ref,scope)).equals(bytes))throw Error('Storage verification failed');console.log('Private storage write/read integrity verified; probe retained');return;}
 if(!config.apiKey)throw Error('Worker provider credential is missing');const owner='worker-'+require('node:crypto').randomUUID();let stopped=false;for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{stopped=true;});
 const execution=require('../../lib/creative-ai/distributed/execution'),{runLoop}=require('../../lib/creative-ai/distributed/worker-loop');
 const run=kind=>runLoop({kind,owner,coordinator:backend.coordinator,stopped:()=>stopped,execute:r=>execution.executeClaim(backend.coordinator,backend.objects,r,{apiKey:config.apiKey}),reconcile:kind=>execution.reconcileCompletions(backend.coordinator,backend.objects,kind)});
 // Shutdown drains both loops, including in-flight provider calls, before closing PostgreSQL.
 await Promise.allSettled([run('image'),run('reasoning')]);
 }finally{await backend.pool.end();}})().catch(()=>{console.error('Execution worker stopped; check database, bucket and worker configuration. No automatic paid retry was started.');process.exitCode=1;});
