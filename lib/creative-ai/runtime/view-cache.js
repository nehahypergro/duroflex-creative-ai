'use strict';
// Project view cache (21 Nov 2026, speed review). Building one project's view read about 180 files (its job, its
// activity history, strategy, concepts, edit versions); the activity reader keeps only 8 projects, so a page load
// over ~90 projects re-read nearly everything every time. A finished project's view (~30 KB) is kept here and reused
// while a few cheap checks show nothing it was built from has changed:
// - the project folder and job.json (every save renames a file into the folder, which updates both);
// - the activity folder (new events add files) and its file count;
// - each saved edit version's folder and job.json.
// The checks read the shared files, so another server instance's changes are seen too. Only finished, failed and
// partial projects are cached (anything still being made or waiting is rebuilt each time); a save through this server drops the entry at once; every entry is rebuilt after
// TTL_MS anyway; each viewer (an owner, an admin or a teammate seeing a redacted view) has its own entry.
const fs=require('fs/promises'),path=require('path');
const TTL_MS=10*60*1000,MAX=600,DONE=new Set(['finished','failed','partial']);
const stamp=async p=>{try{const s=await fs.stat(p);return s.mtimeMs+':'+s.size;}catch(e){if(e.code==='ENOENT')return '-';throw e;}};
async function signature(runtime,id){
 const dir=runtime.store.dir(id),activity=runtime.activity?.folder?runtime.activity.folder(id):null,refDir=path.join(dir,'refinements');
 let events='-';if(activity)try{events=(await fs.readdir(activity)).filter(f=>/^\d{8}\.json$/.test(f)).length;}catch(e){if(e.code!=='ENOENT')throw e;}
 let children=[];try{children=(await fs.readdir(refDir)).filter(n=>/^creative-[a-z0-9-]+$/.test(n)).sort();}catch(e){if(e.code!=='ENOENT')throw e;}
 const parts=await Promise.all([stamp(dir),stamp(path.join(dir,'job.json')),activity?stamp(activity):'-',stamp(refDir),...children.flatMap(c=>[stamp(path.join(refDir,c)),stamp(path.join(refDir,c,'job.json'))])]);
 return JSON.stringify([parts,events,children]);
}
class ViewCache{
 constructor({now=()=>Date.now()}={}){this.entries=new Map();this.now=now;this.hits=0;this.misses=0;}
 drop(id){for(const k of this.entries.keys())if(k.startsWith(id+'|'))this.entries.delete(k);}
 async get(runtime,id,build){
  const viewer=typeof runtime.viewerKey==='function'?runtime.viewerKey():'local',key=id+'|'+viewer,before=await signature(runtime,id),hit=this.entries.get(key);
  if(hit&&hit.signature===before&&this.now()-hit.at<TTL_MS){this.hits++;this.entries.delete(key);this.entries.set(key,hit);return structuredClone(hit.view);}
  this.misses++;const view=await build();
  // Keep it only when nothing changed while it was built and the project is finished.
  if(DONE.has(view?.status)&&await signature(runtime,id)===before){this.entries.delete(key);this.entries.set(key,{signature:before,at:this.now(),view:structuredClone(view)});if(this.entries.size>MAX)this.entries.delete(this.entries.keys().next().value);}else this.entries.delete(key);
  return view;
 }
}
module.exports={ViewCache,signature,TTL_MS,DONE};
