'use strict';
// Read-only handoff for native image generation. No job creation or paid calls.
const fs=require('../../lib/creative-ai/runtime/artifact-fs'),path=require('path');
const {BrandStore}=require('../../lib/creative-ai/runtime/brands');
const {JobStore}=require('../../lib/creative-ai/runtime/store');
const {snapshot,bindResearch,instructions}=require('../../lib/creative-ai/runtime/brand-isolation');
const {validateProductPage}=require('../../lib/creative-ai/runtime/product-input');
async function context(root,brandId,productPageUrl){
 const brands=new BrandStore(root),brand=await brands.read(brandId);
 if(productPageUrl)productPageUrl=validateProductPage(productPageUrl,brand.brandUrl);
 if(!brand.latestResearchId)throw Error('Complete this brand’s research before native generation.');
 const store=new JobStore(path.join(root,'output/creative-ai/research-sessions'));
 const job=await store.read(brand.latestResearchId);
 if(job.status!=='finished'||job.intake.brandId!==brandId||new URL(job.intake.brandUrl).href!==new URL(brand.brandUrl).href)throw Error('Current research does not belong to this brand workspace.');
 const scope=await snapshot({...job.intake,brandId},brands);
 if(job.intake.brandContext?.revision&&job.intake.brandContext.revision!==scope.revision)throw Error('Refresh research after changing this brand’s guidance.');
 const research=bindResearch(JSON.parse(await fs.readFile(path.join(store.dir(job.id),'research-product-evidence.json'),'utf8')),scope);
 const ownContext=await brands.context(brandId);
 return {brandKnowledge:scope,instructions:instructions(scope),researchSessionId:job.id,
  productPageUrl:productPageUrl||null,
  productEvidenceStatus:productPageUrl?'Fetch this exact official page and its images; generic brand research does not establish this SKU’s features.':'No product selected.',
  findings:research.dossier.findings.filter(f=>!productPageUrl||f.section!=='products'),
  facts:research.facts.filter(f=>!productPageUrl||!['product','destination','offer'].includes(f.kind)),
  sources:research.dossier.sources,
  brandGuidancePages:ownContext.pages,
  assets:research.dossier.assets.filter(a=>!productPageUrl||a.kind!=='product').map(({imageData,...asset})=>asset),
  assetDirectory:path.join(store.dir(job.id),'research'),
  note:'This is an evidence handoff, not approval of a generated image. Do not use payment or marketplace logos as brand styling references.'};
}
if(require.main===module){context(path.resolve(__dirname,'../..'),process.argv[2],process.argv[3]).then(value=>process.stdout.write(JSON.stringify(value,null,2)+'\n')).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});}
module.exports={context};
