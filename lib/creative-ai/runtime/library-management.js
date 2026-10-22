'use strict';
// Source updates preserve originals and historical jobs; only future research changes.
async function updateSource(runtime,brandId,input){
 const {brandName,id,expectedUpdatedAt,note,draft,replacementId}=input;
 if(typeof note!=='string'||note.length>1200||typeof draft!=='boolean')throw Error('Enter source notes under 1200 characters and a draft status.');
 return runtime.brands.update(brandId,b=>{
  if(b.name!==brandName)throw Error('Select the matching brand.');
  const rows=[...(b.documents||[]),...(b.assets||[])],source=rows.find(a=>a.id===id);
  if(!source)throw Error('Source not found in this brand.');
  if((source.updatedAt||source.uploadedAt||'')!==expectedUpdatedAt)throw Error('This source changed. Reload the library before saving.');
  if(source.supersededBy)throw Error('This source already has a newer version. Update that version instead.');
  const replacement=replacementId&&rows.find(a=>a.id===replacementId);
  if(replacementId&&(!replacement||replacement.id===id||replacement.supersededBy||replacement.replaces))throw Error('Choose a new source file from this brand.');
  source.history=[...(source.history||[]),{note:source.note||'',draft:!!source.draft,updatedAt:source.updatedAt||source.uploadedAt||'',savedAt:new Date().toISOString()}];
  source.note=note;source.draft=draft;source.updatedAt=new Date().toISOString();
  if(replacement){source.supersededBy=replacement.id;replacement.replaces=id;replacement.note=note;replacement.draft=draft;replacement.updatedAt=source.updatedAt;}
  b.libraryRevision=(b.libraryRevision||0)+1;b.latestResearchId=null;
 });
}
module.exports={updateSource};
