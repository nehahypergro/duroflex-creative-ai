'use strict';
// Project summaries for the list routes (21 Nov 2026, memory review). The project list (GET /creative-ai/api/jobs,
// asked every few seconds by an open Studio page) and the bulk project route read and decoded EVERY job.json at
// once: 365 files, 134 MB on the local copy (each carries its pinned brand knowledge). The server peaked at about
// 800 MB although only ~34 MB was in use at rest, which is why it ran out of memory on startup and under load.
// Here each project is read through the store's own read (so the workspace and access rules still apply) only when
// its job.json changes, eight at a time, and only the few fields the lists use are kept (~1 KB per project).
// A project that cannot be read is left out and tried again next time; nothing is cached for it.
const fs=require('fs/promises'),path=require('path');
const LIMIT=8,caches=new WeakMap();
async function mapLimit(items,fn,limit){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i]);}}));return out;}
function summary(j){
 const by=j.submittedBy;
 return {id:j.id,status:j.status,createdAt:j.createdAt,updatedAt:j.updatedAt,outputs:Array.isArray(j.results)?j.results.length:0,
  intake:{brandId:j.intake?.brandId||null,brandUrl:j.intake?.brandUrl||null,requestKey:j.intake?.requestKey||null},
  ...(by?{submittedBy:{id:by.id,name:by.name,username:by.username}}:{}),
  // The job's own "internal work" reason (client-visibility.reason), worked out once from the full record.
  internalReason:require('./client-visibility').reason(j)||null};
}
// brandId (optional): a project's brand never changes, so projects already known to belong to another brand are not
// even checked; new or unknown projects are read once to learn their brand.
async function summaries(runtime,{brandId=null}={}){
 const store=runtime.store;let cache=caches.get(store);if(!cache){cache=new Map();caches.set(store,cache);}
 let ids;try{ids=(await fs.readdir(store.root)).filter(id=>/^creative-[a-z0-9-]+$/.test(id));}catch(e){if(e.code==='ENOENT')return [];throw e;}
 const present=new Set(ids);for(const id of cache.keys())if(!present.has(id))cache.delete(id);
 const rows=await mapLimit(ids,async id=>{
  if(brandId&&cache.get(id)&&cache.get(id).summary.intake.brandId!==brandId)return null;
  let st;try{st=await fs.stat(path.join(store.dir(id),'job.json'));}catch{cache.delete(id);return null;}
  const stamp=st.mtimeMs+':'+st.size,hit=cache.get(id);if(hit&&hit.stamp===stamp)return hit.summary;
  try{const s=summary(await store.read(id,{hydrate:false}));cache.set(id,{stamp,summary:s});return s;}catch{cache.delete(id);return null;}
 },LIMIT);
 return rows.filter(s=>s&&(!brandId||s.intake.brandId===brandId)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
// Same rule as client-visibility.visible, using the saved reason plus the internal-work register.
async function visible(root,rows){const r=await require('./client-visibility').registry(root);return rows.filter(s=>!(r?.jobs?.[s.id]?.reason||s.internalReason));}
module.exports={summaries,visible,summary,LIMIT};
