'use strict';
const fs=require('fs/promises'),path=require('path'),{fingerprint}=require('../art-director');
// Persist explicit production choices separately from research: a campaign scope
// never changes the truth/status of draft evidence or promotes it to proof.
async function validatePolicy(policy,brand,product,research,logo){
 if(policy.version!==1||policy.brandId!==brand.id)throw Error('Production scope belongs to another brand.');
 if(!Array.isArray(policy.productIds)||!policy.productIds.includes(product.id))throw Error('Saved production scope does not cover this product.');
 if(policy.logoSha256!==logo.sha256)throw Error('Approved logo changed since the saved production choice.');
 if(!policy.authorization?.sourceJobId||!policy.authorization?.note)throw Error('Production scope needs saved authorization provenance.');
 const choice=policy.clarification;
 if(choice?.version!==1||typeof choice.text!=='string'||!choice.text.trim()||choice.text.length>2000||!Number.isFinite(Date.parse(choice.createdAt))||!Array.isArray(choice.nonEssentialFactIds))throw Error('Invalid production clarification.');
 for(const id of choice.nonEssentialFactIds){
  const fact=research.facts.find(f=>f.id===id);
  if(!fact||fact.kind!=='brand'||fact.status!=='conflicted')throw Error('Production scope can only exclude an explicitly scoped brand conflict, never product proof.');
  if(policy.factBindings?.[id]!==fingerprint(fact))throw Error('Brand conflict changed since the saved production choice.');
 }
 return {...structuredClone(choice),authorization:policy.authorization.note,sourceJobId:policy.authorization.sourceJobId};
}
async function prepare(runtime,brand,product,research,logo){
 let policy;
 if(/^product-[a-f0-9]{20}$/.test(product.id))try{policy=JSON.parse(await fs.readFile(path.join(runtime.brands.dir(brand.id),'production-scopes',product.id+'.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!policy){
  let legacy;try{legacy=JSON.parse(await fs.readFile(path.join(runtime.brands.dir(brand.id),'production-scope.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  // A previous campaign's SKU list is not the brand's product allowlist.
  // Prefer its exact scope when applicable, otherwise use only an explicitly
  // recorded brand-wide choice; never transfer the old campaign's wording.
  policy=legacy?.productIds?.includes(product.id)?legacy:await brandDefault(runtime,brand,product)||legacy;
 }
 const choice=policy?await validatePolicy(policy,brand,product,research,logo):null,excluded=new Set(choice?.nonEssentialFactIds||[]),sources=new Map(research.dossier.sources.map(s=>[s.id,s]));
 const unresolved=research.facts.filter(f=>f.kind==='brand'&&f.essential&&!excluded.has(f.id)&&(f.status!=='supported'||!f.sourceIds.length||f.sourceIds.some(id=>!sources.has(id)||sources.get(id).status==='unavailable'||sources.get(id).kind==='meta')));
 if(unresolved.length)throw Error('Production guidance is unresolved before generation: '+unresolved.map(f=>f.id).join(', ')+'. Review the saved production choices; no AI call was made.');
 return choice;
}
async function brandDefault(runtime,brand,product){
 if(!runtime.root)return null;
 let registry;try{registry=JSON.parse(await fs.readFile(path.join(runtime.root,'config/production-scope-defaults.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(registry.version!==1||!Array.isArray(registry.brands))throw Error('Invalid saved production choices.');
 const choices=registry.brands.filter(p=>p.brandId===brand.id);
 if(choices.length>1)throw Error('Conflicting saved production choices.');
 const saved=choices[0];if(!saved)return null;
 const sourcePolicy=require('./website-certification-approval');
 const intake={brandId:brand.id,brandUrl:brand.brandUrl};
 const approval=await sourcePolicy.load(runtime.root,intake);
 if(saved.scope!=='official-product-library'||product.brandId!==brand.id||!sourcePolicy.broad(approval)||!sourcePolicy.matches(approval,intake,product.pageUrl))throw Error('Saved production choice requires the selected brand’s approved official product source.');
 // Bind the reusable brand identity choice to this exact library selection.
 // validatePolicy still checks the current logo and each unchanged brand fact.
 return {...saved,productIds:[product.id]};
}
module.exports={prepare,validatePolicy};
