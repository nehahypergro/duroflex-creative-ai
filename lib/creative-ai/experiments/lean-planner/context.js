'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const {scopeGuide}=require('../../runtime/brand-guide-cache');
async function compiledBrand(root,brand,context){
 const brandId=brand.id,revision=context.brandKnowledge.revision,dir=path.join(root,'output/creative-ai/brands',brandId,'knowledge-cache');
 const candidates=[];
 for(const name of await fs.readdir(dir))if(/^guide-[a-f0-9]+\.json$/.test(name)){
  const record=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
  if(record.brandId===brandId&&record.revision===revision&&record.guideHash===hash(record.guide)&&name===`guide-${record.key}.json`)candidates.push(record);
 }
 candidates.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 if(!candidates.length)throw Error('No current, hash-bound brand interpretation; refresh brand guidance first');
 const record=candidates[0],guide=scopeGuide(record.guide,context.brandKnowledge.draftDocumentIds||[]);
 const memory=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/memory',brandId+'.json'),'utf8'));
 if(memory.brandId!==brandId)throw Error('Brand preference memory mismatch');
 const sourcePolicy={id:'current-source-acceptance',text:'The client accepts explicit statements from the exact official SKU page and original technical artwork as source evidence. Preserve scope, numbers, conditions and qualifiers. Do not invent or strengthen claims; strategic brand propositions are not product efficacy evidence.',sourceIds:['AGENTS.md:client-source-acceptance-20261024']};
 const requirements=guide.requirements.filter(r=>r.id!=='req-claim-substantiation');
 requirements.push(sourcePolicy);
 // These visual rules duplicate requirements already carried above. Retain their
 // provenance in the saved guide, not another copy of the wording in each request.
 const duplicateIds=['vr-product-immutable-appearance','vr-imagery-no-artificial-fades','vr-other-source-authority'];
 const advice=[...guide.preferences.filter(r=>r.id!=='pref-category-world-differentiation'),...guide.visualRules.filter(r=>!duplicateIds.includes(r.id)).map(r=>({...r,text:r.value}))];
 const category=context.findings.filter(f=>f.section==='creative'&&/Airboost/i.test(f.text||'')&&!/sofas|recliners|massagers/i.test(f.text||''));
 for(const [i,f] of category.entries())advice.push({id:'sku-visual-direction-'+i,text:f.text,sourceIds:f.sourceIds});
 const activePreferences=memory.preferences.filter(p=>p.active&&p.brandId===brandId);
 const compiled={version:2,brandId,revision,guideKey:record.key,preferenceRevision:memory.revision,requirements,advice,activePreferences,
  resolutions:[{removed:'req-claim-substantiation',replacement:sourcePolicy.id,reason:'Current explicit client source acceptance supersedes the older extra-approval gate.'},{removed:'pref-category-world-differentiation',reason:'Use only this SKU category direction, not sofa/recliner/massager worlds.'},{removed:duplicateIds,reason:'Requirements already carry this wording.'}],
  fonts:brand.canvasAssets.fonts.filter(f=>f.approved&&f.style==='normal').map(f=>({name:f.name,source:f.sourceReference}))};
 const key=hash(compiled),cacheDir=path.join(root,'output/imagegen/lean-planner-context'),file=path.join(cacheDir,key+'.json');
 await fs.mkdir(cacheDir,{recursive:true});
 let reused=false;
 try{const saved=JSON.parse(await fs.readFile(file,'utf8'));if(hash(saved)!==key)throw Error('Experiment context cache integrity mismatch');reused=true;}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(file,JSON.stringify(compiled,null,2),{flag:'wx'});}
 return {...compiled,cache:{key,reused}};
}
function selectedBrand(compiled,{productUrl,formatId,profileId}){
 const canonical=url=>{const u=new URL(url);return u.origin+u.pathname;};
 const preferences=compiled.activePreferences.filter(p=>
  (p.scope!=='product'||p.productUrl&&canonical(p.productUrl)===canonical(productUrl))&&
  (!p.placementId||[formatId,profileId].includes(p.placementId)));
 return {id:compiled.brandId,name:'Duroflex',revision:compiled.revision,contextKey:compiled.cache.key,
  authority:'Explicit user preferences and official SKU/identity sources take precedence. Visual World Guide is draft/advisory; suggestions are not mandatory.',
  mandatory:compiled.requirements,preferences:preferences.map(p=>({id:p.id,text:p.text,sourceIds:['brand-preference-memory:'+p.id]})),advice:compiled.advice,fonts:compiled.fonts};
}
module.exports={compiledBrand,selectedBrand};
