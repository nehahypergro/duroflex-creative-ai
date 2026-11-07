'use strict';
// Save locally and persist an outbox entry before returning. At most two uploads
// run outside application locks. Required remote references still await publish().
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),cdn=require('./cdn-media');
const pending=new Map(),running=new Map();let pumping=false;
async function marker(file,value){const temp=file+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(temp,JSON.stringify(value));await fs.rename(temp,file);}
async function enqueue(file){const scope=cdn.scope(file);if(!scope||!(await cdn.config(scope.root))?.enabled)return;
 const token=crypto.randomUUID();await marker(file+'.cdn-pending.json',{version:1,status:'pending',token,file:path.relative(scope.root,file),recordedAt:new Date().toISOString()});pending.set(file,token);pump();
}
function pump(){if(pumping)return;pumping=true;setImmediate(()=>{pumping=false;for(const [file,token]of pending){if(running.size>=2)break;if(running.has(file))continue;pending.delete(file);const work=(async()=>{try{
 // Local files are retained: background work must never evict a newer save.
 await cdn.publish(file,{clearPending:false});
 const latest=JSON.parse(await fs.readFile(file+'.cdn-pending.json','utf8'));
 if(latest.token===token)await fs.rm(file+'.cdn-pending.json',{force:true});
 }catch(e){if(e.code==='CDN_SOURCE_CHANGED'){await enqueue(file);}
 // On network failure the durable marker survives. Maintenance retries later.
 }finally{running.delete(file);if(pending.size)pump();}})();running.set(file,work);}});}
async function drain(){while(pumping||pending.size||running.size){await new Promise(r=>setImmediate(r));await Promise.allSettled([...running.values()]);}}
async function resume(root){let found=0;async function walk(dir){let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const e of entries){const file=path.join(dir,e.name);if(e.isDirectory()){if(!e.name.startsWith('.'))await walk(file);}else if(e.name.endsWith('.cdn-pending.json')){const media=file.slice(0,-17);if(!cdn.scope(media)||running.has(media)||pending.has(media))continue;try{await fs.access(media);const value=JSON.parse(await fs.readFile(file,'utf8'));pending.set(media,value.token);found++;}catch(e){if(e.code!=='ENOENT')throw e;}}}}await walk(path.join(root,'output/creative-ai'));if(found)pump();return found;}
module.exports={enqueue,drain,resume};
