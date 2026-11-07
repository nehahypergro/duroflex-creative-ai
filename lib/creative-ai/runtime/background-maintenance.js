'use strict';
// Reconcile expired stored background responses after a crash. This never POSTs
// a new generation. Unknown outcomes retain their original monetary reservation.
const fs=require('fs/promises'),path=require('path'),{JobStore}=require('./store');
async function sweep(root,provider){const report={reconciled:0,unconfirmed:0,errors:0};
 async function walk(dir){let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){if(!entry.isDirectory()||entry.name.startsWith('.'))continue;const folder=path.join(dir,entry.name);let job;try{job=JSON.parse(await fs.readFile(path.join(folder,'job.json'),'utf8'));}catch(e){if(e.code==='ENOENT'){await walk(folder);continue;}report.errors++;continue;}
 if(!job.runtimeConfig?.reasoningStore||job.executionBackendVersion)continue;
 const store=new JobStore(dir),budget=store.budget(job.id);
 for(const state of Object.values(job.budget?.requestStates||{})){if(state.kind!=='reasoning'||!/^[a-f0-9]{64}$/.test(state.key))continue;
 if(job.budget.receipts?.some(r=>r.kind==='reasoning'&&r.requestKey===state.key))continue;
 const wait=job.providerWaits?.[state.key],deadline=wait?.deadline||require('./processing-deadline')(job);
 if(Date.now()<deadline&&!['cancelled','stopped'].includes(job.status)&&(!['failed','partial','finished'].includes(job.status)||wait?.scoped))continue;
 try{const saved=await budget.loadResponse('reasoning',state.key),json=saved?.json;if(!['queued','in_progress'].includes(json?.status)||!/^resp_[A-Za-z0-9_-]+$/.test(json.id||''))continue;
 // Cancel is idempotent; a completed response can be returned instead.
 const response=await provider.cancelReasoning(json.id,10000);if(!response.ok)throw Error('Cancellation could not be confirmed');const terminal=await response.json();
 if(terminal.id!==json.id||!['completed','cancelled','failed','incomplete'].includes(terminal.status))throw Error('Provider request remains pending');
 await budget.saveResponse('reasoning',state.key,{...saved,json:terminal,cancellation:{reason:'expired-or-stopped',at:new Date().toISOString()}});
 await budget.receipt({kind:'reasoning',requestId:terminal.id,requestKey:state.key,model:state.model||terminal.model||job.runtimeConfig.reasoningModel,usage:terminal.usage||{},responseStatus:terminal.status});
 await budget.waiting({requestKey:state.key,responseId:terminal.id,status:terminal.status});report.reconciled++;
 }catch{report.unconfirmed++;}}
 }}await walk(path.join(root,'output/creative-ai'));return report;
}
function start(root,provider){let busy=false;const tick=async()=>{if(busy)return;busy=true;try{await require('./media-outbox').resume(root);if(provider?.cancelReasoning){const report=await sweep(root,provider);if(report.unconfirmed||report.errors)console.error('Background reconciliation pending: '+JSON.stringify(report));}}catch(e){console.error('Background maintenance pending: '+(e.code||'storage-or-provider-unavailable'));}finally{busy=false;}};const timer=setInterval(tick,60000);timer.unref();void tick();return ()=>clearInterval(timer);}
module.exports={sweep,start};
