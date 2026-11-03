'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
// A reservation without a durable response is ambiguous, not permission to POST again.
async function inspect(job,dir){
 const unresolved=[],pending=[];
 const states=new Map(Object.values(job.budget?.requestStates||{}).map(r=>[r.kind+':'+r.key,r]));
 for(const key of job.budget?.imageReservations||[])if(!states.has('image:'+key))states.set('image:'+key,{kind:'image',key});
 for(const r of states.values()){
  if(!['reasoning','image'].includes(r.kind)||!/^[a-f0-9]{64}$/.test(r.key))throw Error('Invalid saved request identity');
  let saved;try{saved=JSON.parse(await fs.readFile(path.join(dir,'request-'+r.kind+'-'+r.key+'.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!saved||(!saved.json&&!saved.httpFailure)){unresolved.push({kind:r.kind,key:r.key});continue;}
  if(['queued','in_progress'].includes(saved.json?.status))pending.push({kind:r.kind,key:r.key,responseId:saved.json.id});
 }
 return {safe:unresolved.length===0,unresolved,pending};
}
module.exports={inspect};
