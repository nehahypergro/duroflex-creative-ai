'use strict';
// Explicit paid experiment (user request, 10 Nov 2026, fix 11 from the asset evaluation: "trial a more careful
// checker"). Never invoked by the server or the test suite. Run with --live.
// The same saved images are checked with the new review checklist v1 by three checker settings, one request at a
// time, sent directly:
//   A  gpt-6-luna  medium  (today's checker, with the new checklist)
//   B  gpt-6-luna  high
//   C  gpt-6.1-sol medium
// Images: the evaluation's "does not meet" set plus images the evaluation found good (to count false alarms).
// Historical jobs, verdicts and files are never changed: results, receipts and costs live in one experiment record
// per brand under output/creative-ai/planner-experiments (counted by the cost ledger) and work/checker-trial-20261110.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/checker-trial-20261110');
const {loadConfig}=require('../../lib/creative-ai/runtime/config'),{OpenAIProvider}=require('../../lib/creative-ai/runtime/provider'),{JobStore}=require('../../lib/creative-ai/runtime/store');
const artifactFs=require('../../lib/creative-ai/runtime/artifact-fs'),visual=require('../../lib/creative-ai/lean/visual-review'),checklist=require('../../lib/creative-ai/lean/checklist'),sku=require('../../lib/creative-ai/lean/sku-check');
const {estimate,validFx}=require('../../lib/cost-tracker');
const SETTINGS=[{id:'A',label:'gpt-6-luna medium (today)',model:'gpt-6-luna',effort:'medium'},{id:'B',label:'gpt-6-luna high',model:'gpt-6-luna',effort:'high'},{id:'C',label:'gpt-6.1-sol medium',model:'gpt-6.1-sol',effort:'medium'}];
// expect: 'fail' = the evaluation found it does not meet its requirements (what should be caught); 'pass' = it met them.
const IMAGES=[
 {job:'4cd1ae63',unit:'premium-03',expect:'fail',why:'pointer on the base, not the springs'},
 {job:'4cd1ae63',unit:'premium-14',expect:'fail',why:'euro-top band missing'},
 {job:'b2b87081',unit:'push',expect:'fail',why:'invented pillow notch and tag'},
 {job:'6dc03ab9',unit:'slot-02',expect:'fail',why:'alternate angle repeats the hero view'},
 {job:'e933d782',unit:'image-02',expect:'fail',why:'label on the white band; band too tall'},
 {job:'e933d782',unit:'image-04',expect:'fail',why:'wrong quilt pattern on the surface detail'},
 {job:'8a014081',unit:'medium-02',expect:'fail',why:'copies the product photo\'s neon room'},
 {job:'7721718d',unit:'module-03',expect:'fail',why:'garbled label "DUTONLEX", "BACK NAGIC"'},
 {job:'4cd1ae63',unit:'premium-01',expect:'pass'},{job:'4cd1ae63',unit:'premium-10',expect:'pass'},{job:'6c7014e0',unit:'email',expect:'pass'},
 {job:'6dc03ab9',unit:'slot-03',expect:'pass'},{job:'6dc03ab9',unit:'slot-07',expect:'pass'},{job:'2c3142bd',unit:'feature-02',expect:'pass'},
 {job:'8a014081',unit:'medium-01',expect:'pass'},{job:'a12ec49d',unit:'slide-05',expect:'pass'}
];
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2));
const jobsDir=path.join(root,'output/creative-ai/jobs');
const jobDir=short=>path.join(jobsDir,fs.readdirSync(jobsDir).find(f=>f.includes(short)));
async function unitRecord(dir,pid){for(const f of fs.readdirSync(dir).filter(f=>/^image-queue-[a-f0-9]{24}\.json$/.test(f))){const r=await artifactFs.readJson(path.join(dir,f));if(r.placementId===pid)return r;}throw Error('Saved record missing for '+pid);}
const uri=b=>'data:image/png;base64,'+b.toString('base64');
async function main(){
 if(!process.argv.includes('--live'))throw Error('Use --live only for the user-authorized paid checker trial');
 fs.mkdirSync(out,{recursive:true});if(fs.existsSync(path.join(out,'results.json')))throw Error('Existing trial preserved; do not dispatch duplicate runs');
 const base=loadConfig(root),store=new JobStore(path.join(root,'output/creative-ai/planner-experiments')),experiments={},fx=validFx(JSON.parse(fs.readFileSync(path.join(root,'output/cost-tracking/currency.json'),'utf8')));
 const experiment=async(brandId,setting)=>{const k=brandId+':'+setting.id;if(experiments[k])return experiments[k];
  const config={...base,reasoningBackground:true,reasoningStore:true,directCheckVersion:1,maxReasoningCalls:200,jobTimeoutMs:4*60*60*1000,roleModels:{...base.roleModels,'lean-review':{model:setting.model,reasoningEffort:setting.effort},'lean-fingerprint':{model:'gpt-6-luna',reasoningEffort:'medium'}}};
  const job=await store.create({brandId,experiment:'checker-trial-20261110',setting:setting.id,note:'Paid checker-model trial; reads saved images only, changes no job.'},config,[]);
  return experiments[k]={id:job.id,provider:new OpenAIProvider(config),budget:store.budget(job.id)};};
 const results={version:1,createdAt:new Date().toISOString(),settings:SETTINGS,images:[],fingerprints:{}};write('results.json',results);
 const prepared=[];
 for(const item of IMAGES){
  const dir=jobDir(item.job),job=JSON.parse(fs.readFileSync(path.join(dir,'job.json'))),res=job.results.find(r=>r.placementId.endsWith(item.unit)||r.placementId.includes(item.unit));
  if(!res)throw Error('No saved image '+item.job+' '+item.unit);
  const record=await unitRecord(dir,res.placementId),bytes=fs.readFileSync(path.join(dir,res.imageUrl.split('/').pop()));
  // Product fingerprint (same reading production makes; saved once per brand + product photo set).
  const refs=(record.skuCheck?.references||[]).filter(r=>r.role==='product').map(r=>record.attachments.find(a=>a.assetId===r.assetId)).filter(Boolean).slice(0,3);
  const fpRefs=refs.length?refs:record.attachments.filter(a=>(a.roles||[]).includes('product')).slice(0,3);
  const hashes=fpRefs.map(a=>checklist.photoHash(a.imageData)),product=record.input.product,key=checklist.cacheKey(record.brandId,product.id,product.variant?.id,hashes);
  let fp=await checklist.loadCached(root,record.brandId,key);
  if(!fp){const e=await experiment(record.brandId,SETTINGS[0]);const reading=await e.provider.reason({contextKind:'lean-fingerprint',strictSchema:true,instructions:checklist.fingerprintInstructions,input:{product:product.name,variant:product.variant?.name||null},images:fpRefs.map((a,i)=>({id:a.assetId,label:'Exact product photo '+(i+1)+' of '+fpRefs.length+' (the selected SKU)',imageData:a.imageData})),schema:checklist.fingerprintSchema,maxOutputTokens:4000,validate:checklist.validateFingerprint,directCheck:true,inlineImageInput:true},e.budget);
   fp={version:checklist.FINGERPRINT_VERSION,key,brandId:record.brandId,productId:product.id||null,variantId:product.variant?.id||null,photoHashes:hashes,features:reading.features,labelWords:String(reading.labelWords||'').trim(),jobId:e.id,createdAt:new Date().toISOString()};await checklist.saveCached(root,record.brandId,fp);}
  results.fingerprints[product.name]={features:fp.features,labelWords:fp.labelWords};
  // The new checklist contract on the saved record; nothing in the saved record is changed.
  const page=record.plan.pages.find(p=>p.id===record.placementId),contract=structuredClone(record.reviewContract||visual.contract(record.input,record.plan,record.placementId));
  const at=contract.requirements.findIndex(r=>r.id==='campaign-copy');contract.requirements.splice(at<0?contract.requirements.length:at,0,...checklist.requirements({fingerprint:fp,page,plan:record.plan,input:record.input}));
  let images=sku.enabled(record)?(await sku.reviewImages(record,{artwork:bytes})).images:[{id:'final-artwork',label:'Finished artwork to inspect',imageData:uri(bytes)},...record.attachments.map(a=>({id:a.assetId,label:(a.roles||[]).join(', ')+' reference',imageData:a.imageData}))];
  const meta=await sharp(bytes).metadata(),ocr=await require('../../lib/creative-ai/runtime/review').ocr(await (async()=>{const f=path.join(out,'ocr-'+item.job+'-'+item.unit+'.png');fs.writeFileSync(f,bytes);return f;})()),rows=ocr.rows||[];
  const area=fp.labelWords?checklist.labelArea(rows,fp.labelWords,{width:meta.width,height:meta.height,copy:page.copy}):null;
  if(area){const crop=await sharp(bytes).extract(area).resize({width:Math.min(1024,Math.max(256,area.width*4)),kernel:'lanczos3'}).png().toBuffer();images=[...images,{id:'artwork-label-closeup',label:'Artwork label close-up: the label area of the finished artwork, enlarged for reading its words',imageData:uri(crop)}];}
  const sel=job.selection.find(s=>s.id===res.placementId),textSize=checklist.textSizeCheck(rows,{copy:page.copy,min:checklist.minTextPx(sel,{print:!!record.input.format.print}),width:meta.width,height:meta.height});
  prepared.push({item,record,contract,images,instructions:(record.reviewInstructions||visual.mainInstructions)+checklist.instructions,textSize,labelCloseUp:!!area});
 }
 for(const setting of SETTINGS)for(const p of prepared){
  const e=await experiment(p.record.brandId,setting),started=Date.now(),before=(await store.read(e.id)).budget.receipts.length;let report=null,error=null;
  try{const output=await e.provider.reason({contextKind:'lean-review',strictSchema:true,instructions:p.instructions,input:p.contract,images:p.images,schema:visual.schemaFor(p.contract.requirements),maxOutputTokens:16000,directCheck:true,inlineImageInput:true,maxProviderRequests:2,validate:o=>visual.validateReport(o,p.contract.requirements)},e.budget);report=visual.validateReport(output,p.contract.requirements);}catch(err){error=err.message;}
  const receipts=(await store.read(e.id)).budget.receipts.slice(before),usd=receipts.reduce((n,r)=>n+(estimate(r)??0),0),unknown=receipts.filter(r=>estimate(r)==null).length;
  results.images.push({setting:setting.id,job:p.item.job,unit:p.item.unit,expect:p.item.expect,why:p.item.why||null,seconds:Math.round((Date.now()-started)/1000),inr:fx?Math.round(usd*fx.usdToInr*100)/100:null,unknownReceipts:unknown,error,labelCloseUp:p.labelCloseUp,textSize:p.textSize,
   conclusion:report?.conclusion||null,mismatches:(report?.checks||[]).filter(c=>c.result==='clear_mismatch').map(c=>({id:c.id,evidence:String(c.evidence).slice(0,300)}))});
  write('results.json',results);console.log(setting.id,p.item.job,p.item.unit,p.item.expect,'->',report?.conclusion||error,(report?.checks||[]).filter(c=>c.result==='clear_mismatch').map(c=>c.id).join(','));
 }
 results.finishedAt=new Date().toISOString();results.experimentJobs=Object.fromEntries(Object.entries(experiments).map(([k,v])=>[k,v.id]));write('results.json',results);
}
main().catch(e=>{console.error(e);process.exit(1);});
