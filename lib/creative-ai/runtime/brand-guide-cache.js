'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto');
const fp=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const VERSION=1;
function brandInput(research){
 const dossier=structuredClone(research.dossier);
 dossier.sources=dossier.sources.filter(s=>!['product','user'].includes(s.kind));
 const ids=new Set(dossier.sources.map(s=>s.id));
 dossier.assets=dossier.assets.filter(a=>a.kind!=='product'&&(a.sourceIds||[]).every(id=>ids.has(id)));
 dossier.findings=(dossier.findings||[]).filter(f=>f.section!=='products'&&(f.sourceIds||[]).every(id=>ids.has(id)));
 const facts=(research.facts||[]).filter(f=>f.kind==='brand'&&(f.sourceIds||[]).every(id=>ids.has(id)));
 return {dossier,guidelinePages:(research.pages||[]).filter(p=>dossier.sources.find(s=>s.id===p.sourceId)?.kind==='guidelines'),facts,additionalSources:[],brief:'Interpret reusable brand knowledge only. No campaign instructions, selected SKU facts, offers or product claims are being approved.',allowedSourceIds:[...ids],allowedPositioningFactIds:facts.filter(f=>f.status==='supported').map(f=>f.id)};
}
class BrandGuideCache{
 constructor(runtime){this.runtime=runtime;this.pending=new Map();}
 async guide({job,baseResearch,provider,budget,instructions,schemaFor,validate}){
  const input=brandInput(baseResearch),scope=job.intake.brandKnowledge;
  if(!scope?.brandId){const guide=await provider.reason({instructions,input,schema:schemaFor(input),images:require('./research').orderedImages(input.dossier.assets),validate:o=>validate(o,input)},budget);return {guide,input,cache:{status:'disabled-unscoped'}};}
  require('./brand-isolation').bindResearch({dossier:input.dossier,brandKnowledge:baseResearch.brandKnowledge},scope);
  const schema=schemaFor(input),key=fp({version:VERSION,scope,model:this.runtime.config.reasoningModel,instructions,schema,input,memoryRevision:job.preferenceMemory?.revision??null});
  const dir=path.join(this.runtime.brands.dir(scope.brandId),'knowledge-cache'),file=path.join(dir,'guide-'+key+'.json');
  const load=async()=>{try{const saved=JSON.parse(await fs.readFile(file,'utf8'));if(saved.key!==key||saved.brandId!==scope.brandId||saved.revision!==scope.revision||fp(saved.guide)!==saved.guideHash)throw Error('Brand guide cache binding mismatch');validate(saved.guide,input);return saved.guide;}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError||e.message==='Brand guide cache binding mismatch')return null;throw e;}};
  const hit=await load();if(hit)return {guide:hit,input,cache:{status:'reused',key,brandId:scope.brandId,revision:scope.revision}};
  if(this.pending.has(key)){const guide=await this.pending.get(key);validate(guide,input);return {guide:structuredClone(guide),input,cache:{status:'reused-concurrent',key,brandId:scope.brandId,revision:scope.revision}};}
  const task=(async()=>{const guide=await provider.reason({instructions,input,schema,images:require('./research').orderedImages(input.dossier.assets),validate:o=>validate(o,input)},budget);validate(guide,input);await fs.mkdir(dir,{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.pending';await fs.writeFile(temp,JSON.stringify({version:VERSION,key,brandId:scope.brandId,revision:scope.revision,model:this.runtime.config.reasoningModel,createdByJobId:job.id,guideHash:fp(guide),guide,createdAt:new Date().toISOString()}));await fs.rename(temp,file);return guide;})();this.pending.set(key,task);
  try{return {guide:await task,input,cache:{status:'created',key,brandId:scope.brandId,revision:scope.revision}};}finally{this.pending.delete(key);}
 }
}
function campaignGuide(guide,brief){
 const out=structuredClone(guide),prefix='Current campaign instructions; not substantiation of product claims: ';
 // Downstream requirement fields are bounded to 2,000 characters, while the
 // campaign brief allows 5,000. Preserve every character across ordered rules.
 if(brief?.trim())for(let offset=0,part=1;offset<brief.length;part++){
  let end=Math.min(brief.length,offset+2000-prefix.length);
  if(end<brief.length&&/[\uD800-\uDBFF]/.test(brief[end-1]))end--;
  out.requirements.push({id:'current-campaign-brief'+(part===1?'':'-'+part),text:prefix+brief.slice(offset,end),sourceIds:['user-brief']});offset=end;
 }
 return out;
}
function scopeGuide(guide,draftDocumentIds=[]){
 const out=structuredClone(guide),drafts=new Set(draftDocumentIds),advisory=out.requirements.filter(r=>r.sourceIds.length&&r.sourceIds.every(id=>drafts.has(id)));
 out.requirements=out.requirements.filter(r=>!advisory.some(a=>a.id===r.id));
 for(const rule of advisory)if(!out.preferences.some(p=>p.id===rule.id))out.preferences.push({...rule});
 return out;
}
module.exports={BrandGuideCache,brandInput,campaignGuide,scopeGuide,VERSION};
