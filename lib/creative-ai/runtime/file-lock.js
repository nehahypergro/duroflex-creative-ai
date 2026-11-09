'use strict';
// Same-host, shared-filesystem coordination. Never steal a live owner by age:
// a slow provider response must not authorize a duplicate paid request.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
// A folder with no readable owner marker is abandoned only after this grace period.
// Writers before 8 Nov 2026 resolved process identity (two child processes with 2 s
// timeouts) between mkdir and writing the marker; any marker write or release refreshes
// the folder time. It stays below the 120 s submission wait, so resubmitting after a
// crash succeeds instead of failing busy.
const STALE_LOCK_GRACE_MS=90000;
const MARKER=/^owner-[a-f0-9-]+\.json$/;
function busy(file){const e=Error('Timed out waiting for shared writer: '+path.basename(file)+'. The owner was not interrupted.');e.code='SHARED_WRITER_BUSY';return e;}
// absent | live | foreign | manual | changed | fresh (retryAfterMs) | stale (entries)
async function classify(file){
 let stat;try{stat=await fs.lstat(file);}catch(e){if(e.code==='ENOENT')return {state:'absent'};throw e;}
 // Legacy PID files, symlinks and unknown content keep their own inspection workflow.
 if(!stat.isDirectory())return {state:'manual'};
 let names;try{names=await fs.readdir(file);}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return {state:'absent'};throw e;}
 const identity=require('./process-identity'),entries=[];let invalidNewest=-Infinity;
 for(const name of names){
  if(!MARKER.test(name))return {state:'manual'};
  let markerStat,text;try{markerStat=await fs.lstat(path.join(file,name));if(!markerStat.isFile())return {state:'manual'};text=await fs.readFile(path.join(file,name),'utf8');}catch(e){if(e.code==='ENOENT')return {state:'changed'};return {state:'manual'};}
  let owner=null;try{owner=JSON.parse(text);}catch{}
  const status=await identity.ownerStatus(owner,{markerMtimeMs:markerStat.mtimeMs});
  if(status==='live'||status==='foreign')return {state:status,owner};
  if(status==='invalid')invalidNewest=Math.max(invalidNewest,markerStat.mtimeMs);
  entries.push({name,status});
 }
 // A proven dead owner needs no age. An empty folder or half-written marker might be a
 // live writer mid-write, so it must also be older than the grace period.
 const newest=entries.some(e=>e.status==='dead')?invalidNewest:Math.max(stat.mtimeMs,invalidNewest),age=Date.now()-newest;
 if(age<STALE_LOCK_GRACE_MS)return {state:'fresh',retryAfterMs:Math.ceil(STALE_LOCK_GRACE_MS-age)};
 return {state:'stale',dev:stat.dev,ino:stat.ino,birthtimeMs:stat.birthtimeMs,entries};
}
// Returns true when the stale folder is gone. Marker names are unique per acquisition, so
// unlinking observed names can only remove the stale instance's files, and rmdir removes
// only an empty folder: a replacement owner that has written its marker is never touched.
async function reclaim(file){
 const observed=await classify(file);if(observed.state!=='stale')return false;
 let removedDead=false;
 for(const entry of observed.entries){try{await fs.unlink(path.join(file,entry.name));if(entry.status==='dead')removedDead=true;}catch(e){if(e.code!=='ENOENT')throw e;}}
 // Only the contender that removed a unique dead-owner marker may rmdir that folder.
 if(observed.entries.some(e=>e.status==='dead')&&!removedDead)return false;
 try{const now=await fs.lstat(file);if(now.dev!==observed.dev||now.ino!==observed.ino||now.birthtimeMs!==observed.birthtimeMs)return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}
 try{await fs.rmdir(file);return true;}catch(e){if(e.code==='ENOENT')return true;if(['ENOTEMPTY','EEXIST'].includes(e.code))return false;throw e;}
}
const removeFolder=file=>fs.rmdir(file).catch(e=>{if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(e.code))throw e;});
async function claim(file,identity){
 const token=crypto.randomUUID(),name='owner-'+token+'.json',marker=path.join(file,name);
 // ENOENT: the new folder was removed as stale before this write; contend again.
 try{await fs.writeFile(marker,JSON.stringify({pid:process.pid,host:os.hostname(),...identity,token,createdAt:new Date().toISOString()}),{flag:'wx'});}catch(e){if(e.code==='ENOENT')return null;await fs.rmdir(file).catch(()=>{});throw e;}
 // If the folder was replaced between mkdir and the write, another new owner may share it.
 // The later writer always sees the earlier marker, so two owners never both proceed.
 let names;try{names=await fs.readdir(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(names.some(n=>n!==name&&MARKER.test(n))){await fs.unlink(marker);await removeFolder(file);return null;}
 let released=false;return async()=>{if(released)return;released=true;await fs.unlink(marker);await removeFolder(file);};
}
async function acquire(file,{timeoutMs=30000,signal}={}){
 const deadline=Date.now()+timeoutMs;await fs.mkdir(path.dirname(file),{recursive:true});
 // Resolve identity first so a new lock folder is empty for one small write only.
 const identity=await require('./process-identity').self();let reclaimed=0;
 while(true){signal?.throwIfAborted();
  let created=false;try{await fs.mkdir(file);created=true;}catch(e){if(e.code!=='EEXIST')throw e;}
  if(created){const release=await claim(file,identity);if(release)return release;}
  else if(await reclaim(file)&&reclaimed++<8)continue;
  if(Date.now()>=deadline)throw busy(file);
  await delay(Math.min(15+Math.floor(Math.random()*25),Math.max(1,deadline-Date.now())),undefined,{signal});
 }
}
async function withLock(file,fn,options){const release=await acquire(file,options);try{return await fn();}finally{await release();}}
module.exports={acquire,withLock,classify,reclaim,STALE_LOCK_GRACE_MS};
