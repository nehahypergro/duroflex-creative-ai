'use strict';
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const {getBytes}=require('../../lib/creative-ai/runtime/network'),{canonical,parseProduct}=require('../../lib/creative-ai/runtime/product-library');
const root=path.resolve(__dirname,'../..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const RUN='random-sku-matrix-2026-10-13',SEED='brand-ratio-sku-20261013-v1';
const ids=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
async function main(){const manifests=[];for(const id of ids){const brandDir=path.join(root,'output/creative-ai/brands',id),brand=JSON.parse(await fs.readFile(path.join(brandDir,'brand.json'))),dir=path.join(brandDir,'products/qa-fixtures',RUN);await fs.mkdir(dir,{recursive:true});
 let prior;try{prior=JSON.parse(await fs.readFile(path.join(dir,'manifest.json')));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(prior){manifests.push(prior);continue;}
 const research=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/research-sessions',brand.latestResearchId,'job.json')));if(research.intake.brandId!==brand.id)throw Error('Research brand mismatch');
 const products=[],catalogSources=[];for(let page=1;page<=4;page++){const url=new URL('/products.json?limit=250&page='+page,brand.brandUrl).href,got=await getBytes(url,{maxBytes:16000000,timeout:20000});const data=JSON.parse(got.bytes);if(!Array.isArray(data.products))throw Error('Missing catalog products');const file='catalog-'+page+'.json';await fs.writeFile(path.join(dir,file),got.bytes);catalogSources.push({url:got.url,file,sha256:hash(got.bytes),count:data.products.length});products.push(...data.products);if(data.products.length<250)break;}
 const unique=[...new Map(products.map(p=>[p.handle,p])).values()];const chosen=unique.map(p=>({product:p,rank:hash(SEED+'|'+id+'|'+p.handle)})).sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,10);
 if(chosen.length!==10)throw Error('Need ten products for '+brand.name);
 const savedProfiles=[];for(const entry of await fs.readdir(path.join(brandDir,'products')))if(/^product-[a-f0-9]{20}$/.test(entry))try{savedProfiles.push(JSON.parse(await fs.readFile(path.join(brandDir,'products',entry,'profile.json'))));}catch{}
 const rows=[];for(let offset=0;offset<chosen.length;offset+=2){await Promise.all(chosen.slice(offset,offset+2).map(async({product,rank})=>{
 const url=new URL('/products/'+product.handle,brand.brandUrl).href,existing=savedProfiles.find(p=>canonical(p.pageUrl)===canonical(url));let bytes,sourceUrl,json=product,reused=false;
 if(existing){bytes=await fs.readFile(path.join(brandDir,'products',existing.id,existing.snapshot,'page.html'));if(hash(bytes)!==existing.pageHash)throw Error('Saved source hash mismatch');sourceUrl=existing.pageUrl;try{json=JSON.parse(await fs.readFile(path.join(brandDir,'products',existing.id,existing.snapshot,'product.json')));}catch{}reused=true;}
 else{const got=await getBytes(url,{maxBytes:6000000,timeout:20000});bytes=got.bytes;sourceUrl=got.url;if(new URL(sourceUrl).hostname.replace(/^www\./,'')!==new URL(brand.brandUrl).hostname.replace(/^www\./,''))throw Error('Foreign product redirect');}
 const parsed=parseProduct(bytes.toString('utf8'),sourceUrl,json),variants=parsed.variants.filter(v=>v.id&&v.sku);if(!variants.length)throw Error('No exact SKU variants for '+product.handle);
 const variant=variants.map(v=>({v,rank:hash(SEED+'|'+id+'|'+product.handle+'|'+v.id)})).sort((a,b)=>a.rank.localeCompare(b.rank))[0].v;
 const productId='product-'+hash(canonical(url)).slice(0,20),file=productId+'.html',jsonFile=productId+'.json';await fs.writeFile(path.join(dir,file),bytes);await fs.writeFile(path.join(dir,jsonFile),JSON.stringify(json));
 rows.push({productId,handle:product.handle,name:parsed.name,category:parsed.category,variant,variantUrl:url+'?variant='+encodeURIComponent(variant.id),sourceUrl,file,jsonFile,pageHash:hash(bytes),jsonHash:hash(JSON.stringify(json)),selectionRank:rank,reusedSavedPage:reused});process.stderr.write(brand.name+': '+parsed.name+'\n');
 }));}
 const result={version:1,mode:'website-source-fixtures-only',seed:SEED,brandId:id,brandName:brand.name,brandUrl:brand.brandUrl,researchId:brand.latestResearchId,collectedAt:new Date().toISOString(),catalogSources,catalogProducts:unique.length,sampling:'Ten product handles ranked by seeded SHA-256 from up to four public catalog pages; one seeded exact SKU variant each. Availability is retained, not filtered.',directory:dir,products:rows.sort((a,b)=>a.selectionRank.localeCompare(b.selectionRank)),limits:['Source snapshots only; no image download, audit, approved claims or visual inspection.','QA variant choices do not authorize production campaigns. Existing product profiles and historical jobs remain unchanged.']};await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(result,null,2));manifests.push(result);
 }return manifests;}
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main,RUN,SEED};
