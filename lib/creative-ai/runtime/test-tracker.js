'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const DIR='work/all-static-option1-20261027';
const active=new Set(['running','queued','preparing']);
async function read(file){return JSON.parse(await fs.readFile(file,'utf8'));}
function safeAsset(url,id){return typeof url==='string'&&url.startsWith('/creative-ai/api/jobs/'+id+'/files/')&&/^[-a-zA-Z0-9_.]+$/.test(url.slice(('/creative-ai/api/jobs/'+id+'/files/').length))&&!url.includes('..')?url:null;}
function explain(message){if(!message)return '';if(/at most 8 selected images/.test(message))return 'Review could not start: too many reference images were sent to the reviewer.';if(/still pending/.test(message))return 'The provider has not finished the accepted request. Its saved response can be checked again.';if(/Shared capacity configuration/.test(message))return 'The worker settings conflicted with the shared queue.';if(/before provider dispatch/.test(message))return 'This earlier attempt stopped before sending a generation request.';return String(message).slice(0,800);}
async function snapshot(root,{now=Date.now(),isAlive=pid=>{try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}}={}){
 const dir=path.join(root,DIR),m=await read(path.join(dir,'matrix.json')),plan=await read(path.join(dir,'sequential-plan.json'));
 const rank=new Map(plan.order.map(x=>[x.key,x.order]));
 let runner=null;try{runner=await read(path.join(dir,'runner-process.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const fresh=Number.isFinite(Date.parse(m.updatedAt))&&now-Date.parse(m.updatedAt)<90000;
 const alive=Number.isInteger(runner?.runnerPid)&&runner.runnerPid>0&&isAlive(runner.runnerPid);
 const rows=[];
 // Read only bounded job summaries, never load reference rasters or call a provider.
 for(const row of [...m.rows].sort((a,b)=>(rank.get(a.key)??99999)-(rank.get(b.key)??99999))){
  if(!['Duroflex','Sleepyhead'].includes(row.brand))throw Error('Unexpected tracker brand');
  let j=null,readError=null;
  if(row.id){if(!/^creative-[a-f0-9-]{36}$/.test(row.id))throw Error('Invalid tracker project');try{j=await read(path.join(root,'output/creative-ai/jobs',row.id,'job.json'));if(j.intake.brandId!==row.brandId)throw Error('Tracker project belongs to another brand');}catch(e){if(e.code!=='ENOENT')throw e;readError='Saved project details are unavailable.';}}
  const pendingRetry=row.status==='waiting-provider'&&j?.status==='failed'&&/Shared capacity configuration|before provider dispatch|still pending/.test(j.error||'');
  const results=(j?.results||row.results||[]).filter(r=>r.route==='continuity').map(r=>({imageUrl:safeAsset(r.imageUrl,row.id),ready:r.ready===true,status:r.status||'',placement:r.placementId})).filter(r=>r.imageUrl);
  const expected=Number(row.expectedImages)||0,generated=results.length,passed=results.filter(r=>r.ready).length;
  let state=['needs-input','deferred'].includes(row.status)?'on-hold':pendingRetry||!row.id?'queued':active.has(j?.status)?'active':readError||j?.status==='failed'||j?.status==='needs-input'?'issue':expected&&generated>=expected&&passed>=expected?'passed':generated?'review-needed':'issue';
  const issues=[];if(readError)issues.push(readError);if(!pendingRetry&&j?.error)issues.push(explain(j.error));if(!pendingRetry)for(const e of j?.unitErrors||[])issues.push(explain(typeof e==='string'?e:e.error||e.message||'An output needs attention.'));
  if(generated>passed&&j&&!active.has(j.status)){
   const jobDir=path.join(root,'output/creative-ai/jobs',row.id),names=(await fs.readdir(jobDir)).filter(n=>/^review-error-[a-zA-Z0-9_.-]+\.json$/.test(n));
   for(const n of names.slice(-20)){const error=await read(path.join(jobDir,n));issues.push(explain(error.error));}
   if(!issues.length)issues.push('Artwork is saved but some quality checks are pending or did not pass. Open the project for its review.');
  }
  const waiting=Object.values(j?.providerWaits||{}).some(w=>w.status==='waiting');
  const labels={strategy:'Shaping the strategy',concepts:'Developing the idea',art:'Planning the design',copy:'Preparing artwork wording',reconciliation:'Aligning wording and layout',generation:'Generating the image',statics:'Generating the set',review:'Reviewing the artwork',quality:'Reviewing the artwork',queued:'Waiting to start',preparing:'Preparing the brief',research:'Checking saved references'};
  rows.push({key:row.key,order:rank.get(row.key)||null,brand:row.brand,name:row.name,family:row.family,state,stage:state==='active'?(labels[j?.stage]||'Working on the project'):'',waiting,expected,generated,passed,results,issues:[...new Set(issues)].filter(Boolean),note:state==='on-hold'?row.reason||'Outside this runnable batch.':pendingRetry?'Queued to resume; the earlier interruption is retained in project history.':'',projectUrl:row.id?'/creative-ai/studio.html?brand='+encodeURIComponent(row.brandId)+'#progress/'+row.id:null,deliveries:(row.deliveries||[]).map(d=>({url:safeAsset(d.url,row.id),status:d.status,count:d.count})).filter(d=>d.url),startedAt:row.dispatchStartedAt||null});
 }
 const runnable=rows.filter(r=>r.state!=='on-hold'),sum=(items,key)=>items.reduce((n,r)=>n+r[key],0),count=(items,state)=>items.filter(r=>r.state===state).length;
 const current=rows.find(r=>r.state==='active');
 const stopped=m.stopReason||m.runnerError;
 const health=stopped?'stopped':m.finishedAt?'finished':!alive?'stopped':!fresh?'stale':'running';
 return {checkedAt:new Date(now).toISOString(),updatedAt:m.updatedAt,startedAt:m.runStartedAt,health,message:stopped?explain(stopped):health==='stopped'?'The batch runner is not active. Saved outputs remain available.':health==='stale'?'The runner is present, but its progress has not updated recently.':health==='finished'?'The batch has finished its attempts. Check any outstanding review issues.':'One project at a time · Duroflex first, then Sleepyhead',currentKey:current?.key||null,totals:{projects:runnable.length,processed:runnable.filter(r=>['passed','review-needed','issue'].includes(r.state)).length,expected:sum(runnable,'expected'),generated:sum(runnable,'generated'),passed:sum(runnable,'passed'),issues:count(runnable,'issue')+count(runnable,'review-needed'),onHold:rows.length-runnable.length},brands:['Duroflex','Sleepyhead'].map(brand=>{const items=runnable.filter(r=>r.brand===brand);return {brand,projects:items.length,processed:items.filter(r=>['passed','review-needed','issue'].includes(r.state)).length,generated:sum(items,'generated'),expected:sum(items,'expected'),passed:sum(items,'passed')};}),rows};
}
module.exports={snapshot,safeAsset,explain};
