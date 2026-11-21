'use strict';
// One request for a brand's project list (21 Nov 2026, speed review). Before, the Studio page asked for the list,
// then for every project and its saved edits separately (2 requests per project, plus design details in the
// background): about 230 requests on a fresh load. This returns the same project views and edit summaries in one
// answer. Visibility and brand rules are the list's: internal test work stays hidden, only the named brand's
// projects are read, and each view goes through the same store (and its teammate rules) as GET /jobs/:id.
// One project that cannot be read comes back as {id, loadError}; it never fails the whole list.
async function mapLimit(items,fn,limit){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i]);}}));return out;}
// ids (optional, at most 120): only these projects, for a page that already has the rest and asks for changed ones.
async function projects(runtime,root,brandId,ids=null){
 const wanted=ids?new Set(ids):null,S=require('./job-summaries'),listed=(await S.visible(root,await S.summaries(runtime))).filter(j=>j.intake?.brandId===brandId&&(!wanted||wanted.has(j.id)));
 const rows=await mapLimit(listed,async j=>{
  try{
   const [view,edits]=await Promise.all([runtime.view(j.id),require('./editable-delivery').list(runtime,j.id).then(e=>Array.isArray(e)?e:null,()=>null)]);
   return {...view,edits,editLookupFailed:!edits,...(j.submittedBy?.id?{madeBy:{id:j.submittedBy.id,name:j.submittedBy.name||j.submittedBy.username||'A teammate'}}:{})};
  }catch(e){return {id:j.id,brandId,status:j.status,createdAt:j.createdAt,updatedAt:j.updatedAt,loadError:'This project could not load.'};}
 },6);
 return {version:1,brandId,partial:!!wanted,projects:rows};
}
module.exports={projects};
