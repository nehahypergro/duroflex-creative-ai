'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const base='/creative-ai/experiments/raw-artwork/';
const image=id=>'/creative-ai/api/experiments/raw-artwork?image=1&id='+encodeURIComponent(id);
function state(status,active){return ['running','preparing','queued'].includes(status)&&!active?'interrupted':status;}
async function list(runtime){
 const runs=[],warnings=[],represented=new Set(),dir=path.join(runtime.root,'output/creative-ai/raw-artwork-batches');
 let names=[];try{names=await fs.readdir(dir);}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const name of names.filter(n=>/^raw-web-[a-f0-9]{24}\.json$/.test(n))){try{
  const b=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));if(b.id+'.json'!==name||!Array.isArray(b.items))throw Error('Invalid collection record');
  const finished=b.items.filter(i=>i.status==='finished'&&i.result),cover=finished.find(i=>i.jobId);
  runs.push({id:b.id,type:'collection',title:b.title||'Web & commerce',brandId:b.brandId,brand:b.brand,product:b.product,createdAt:b.createdAt,status:state(b.status,runtime.rawWebTasks?.has(b.id)),completed:finished.length,total:b.items.length,thumbnail:cover?(cover.result.imageUrl||image(cover.jobId)):null,url:base+'collection.html?batch='+encodeURIComponent(b.id)});
  b.items.forEach(i=>{if(i.jobId)represented.add(i.jobId);});
 }catch{warnings.push('A saved collection could not be read: '+name);}}
 const jobs=await runtime.store.list({metadataOnly:true});
 for(const j of jobs){if(j.intake?.rawArtworkExperimentVersion!==1||represented.has(j.id))continue;
  const source=j.intake.rawArtworkSource||{},q=new URLSearchParams({run:j.id});for(const [key,value]of Object.entries({sourceId:source.id,route:source.route,placementId:source.placementId}))if(value)q.set(key,value);
  runs.push({id:j.id,type:'image',title:j.intake.rawArtworkSlot?.label||'Original artwork',brandId:j.intake.brandId,brand:j.intake.brandName||'',product:j.intake.productName||'Saved experiment',createdAt:j.createdAt,status:state(j.status,runtime.rawArtworkTasks?.has(j.id)),completed:j.status==='finished'&&j.results?.length?1:0,total:1,thumbnail:j.status==='finished'&&j.results?.length?image(j.id):null,url:base+'index.html?'+q});
 }
 const brandNames=new Map(runs.filter(r=>r.brand).map(r=>[r.brandId,r.brand]));
 for(const r of runs)if(!r.brand){if(!brandNames.has(r.brandId)){try{brandNames.set(r.brandId,(await runtime.brands.read(r.brandId)).name);}catch{brandNames.set(r.brandId,'Saved brand');}}r.brand=brandNames.get(r.brandId);}
 return {runs:runs.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))||a.id.localeCompare(b.id)),warnings};
}
module.exports={list};
