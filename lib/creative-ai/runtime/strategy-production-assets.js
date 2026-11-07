'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function attach(runtime,input,intake,{jobId}={}){const assets=intake.canvasAssets;if(!assets||assets.brandId!==intake.brandId)return input;const verified=[];for(const asset of [...(assets.fonts||[]),...(assets.logos||[assets.logo]).filter(Boolean)]){if(asset.brandId!==intake.brandId||asset.approved!==true||!asset.sha256||!/^asset-[a-f0-9]{24}\.(woff2?|ttf|otf|png|jpg|webp|svg)$/.test(asset.filename||''))continue;let bytes;try{bytes=await fs.readFile(path.join(runtime.brands.dir(intake.brandId),'canvas-assets',asset.filename));}catch(e){if(e.code==='ENOENT')continue;throw e;}if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)continue;verified.push(asset);}
 if(!verified.length)return input;const out=structuredClone(input),sourceId='verified-production-assets',source={id:sourceId,kind:'asset',label:'Existing approved same-brand production files; hashes verified for this campaign',reference:'saved-canvas-assets:'+intake.brandId,status:'available',collectedAt:new Date().toISOString()};out.additionalSources=out.additionalSources.some(s=>s.id===sourceId)?out.additionalSources.map(s=>s.id===sourceId?source:s):[...out.additionalSources,source];const factIndex=out.facts.findIndex(f=>f.id==='campaign-production-assets');out.facts=out.facts.filter(f=>f.id!=='campaign-production-assets');out.facts.push({id:'campaign-production-assets',kind:'brand',status:'supported',essential:true,sourceIds:[sourceId],text:'Production resources already supplied for this campaign (not consumer claims): '+verified.map(a=>a.kind+' '+a.name+' ['+a.id+(a.kind==='font'?'; weight '+a.weight+'; '+a.style:'')+']').join('; ')+'. These exact current same-brand files are approved in the asset registry and their SHA-256 hashes match. Typography availability is therefore supplied; do not request these same font files again. This verifies these resources only, not a complete brandbook, draft guidance, font licensing beyond recorded approval, rendered artwork quality or unrelated brand conflicts.'});if(factIndex>=0)out.facts.splice(factIndex,0,out.facts.pop());await pinSource(runtime,out,intake,verified,jobId);return out;}
async function pinSource(runtime,out,intake,verified,jobId){
 if(!jobId||!runtime.store?.dir)return;
 const artifact=require('./artifact-fs'),source=out.additionalSources.find(s=>s.id==='verified-production-assets'),fact=out.facts.find(f=>f.id==='campaign-production-assets');
 const binding=crypto.createHash('sha256').update(JSON.stringify({brandId:intake.brandId,assets:verified.map(a=>({id:a.id,sha256:a.sha256})),fact:fact.text})).digest('hex'),file=path.join(runtime.store.dir(jobId),'production-assets-evidence.json');
 let saved;try{saved=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(saved){if(saved.binding!==binding||saved.brandId!==intake.brandId)throw Error('Verified production asset binding changed; saved planning cannot be silently rebound.');source.collectedAt=saved.source.collectedAt;return;}
 // A legacy concept handoff is an immutable, hash-bound source of its original
 // verification timestamp. Reuse only this field after rechecking all files.
 try{const concepts=await artifact.readJson(path.join(runtime.store.dir(jobId),'concepts.json')),ctx=concepts.handoff?.context,prior=ctx?.strategyInput?.additionalSources?.find(s=>s.id===source.id),priorFact=ctx?.strategyInput?.facts?.find(f=>f.id===fact.id);
  if(concepts.assignmentId===jobId&&ctx&&prior?.reference===source.reference&&prior?.status===source.status&&priorFact?.text===fact.text&&Number.isFinite(Date.parse(prior.collectedAt))){
   // Specialist handoffs deliberately omit unused image bytes. Validate against
   // the full saved director input, changing only this proposed timestamp.
   const candidate=await artifact.readJson(path.join(runtime.store.dir(jobId),'director-input.json'));
   const savedSource=candidate.strategyInput.additionalSources.find(s=>s.id===source.id);
   if(candidate.assignmentId===jobId&&savedSource){savedSource.collectedAt=prior.collectedAt;if(concepts.strategyHash===require('../creative-director').strategyFingerprint(candidate))source.collectedAt=prior.collectedAt;}
  }
 }catch(e){if(e.code!=='ENOENT')throw e;}
 const snapshot={version:1,brandId:intake.brandId,binding,source},tmp=file+'.'+crypto.randomUUID()+'.pending';
 try{await fs.writeFile(tmp,JSON.stringify(snapshot));try{await fs.link(tmp,file);}catch(e){if(e.code!=='EEXIST')throw e;const prior=JSON.parse(await fs.readFile(file,'utf8'));if(prior.binding!==binding)throw Error('Concurrent production evidence changed');source.collectedAt=prior.source.collectedAt;}}
 finally{await fs.unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
module.exports={attach};
