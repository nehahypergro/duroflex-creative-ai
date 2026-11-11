'use strict';
// Shared offline fixture for lean planning tests of marketing rules and channel craft (both brands, no paid calls).
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {JobStore}=require('../../lib/creative-ai/runtime/store'),flow=require('../../lib/creative-ai/runtime/lean-workflow'),policy=require('../../lib/creative-ai/runtime/lean-policy'),handoff=require('../../lib/creative-ai/runtime/stage-handoff');
const brands=['Duroflex','Sleepyhead'];
const NAMES={Duroflex:'Duro Safe - Waterproof Mattress Protector (Queen, White)',Sleepyhead:'Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)'};
const SHORT={Duroflex:'Duro Safe',Sleepyhead:'Sofa Drip Pro'};
const square=i=>({id:'page-'+i,description:{name:'Social square '+i,formatId:'custom:studio-social-square',dimensions:{width:1080,height:1080}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});
const story=()=>({id:'story-1',description:{name:'Story · vertical',formatId:'custom:studio-social-story',dimensions:{width:1080,height:1920}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});

function planFor(input,copyFor,pageExtra=()=>({})){return {...(input?.checklist?.setRules?{setRules:['The same room family on every page','The same product colourway on every page']}:{}),message:'Comfort at home',audience:'Couples',objective:'Purchase',insight:{text:'A first home matters',basis:'hypothesis'},desiredAction:'Buy',concept:'A clear choice',omitted:[],
 guidanceDecisions:[...input.brand.mandatory,...input.brand.preferences,...input.format.guidance.mandatory].map(r=>({id:r.id,decision:'apply',reason:'Applicable supplied requirement'})),
 pages:input.format.pages.map((p,i)=>({id:p.id,purpose:'Show the removable back cushion lifted off, seen from the front',copy:copyFor(input,p,i),artDirection:'A bright room',hierarchy:'Headline first',palette:'Brand colours',typography:input.brand.fonts[0].family+' 700',formatConstraints:['Keep a margin'],spatial:Object.fromEntries(require('../../lib/creative-ai/lean/planning').spatialFields.map(k=>[k,'Centred'])),...pageExtra(input,p,i)}))};}
const HEADS={'page-1':'Sink into the corner seat','page-2':'Arms that angle outward','story-1':'Lift a cushion, lean back','pdp-1':'Legs that lift the look'};
const freshCopy=(input,p)=>[{role:'headline',text:HEADS[p.id]+(input.marketing?.recentHeadlines?.length?' tonight':''),factIds:[]},{role:'support',text:'Backed by a 3-year conditional warranty.',factIds:['fact-1']}];

async function fixture(t,{brand='Duroflex',root:sharedRoot=null,selection=[square(1)],copyFor=freshCopy,pageExtra,pinned=true,unpin=['marketingRulesVersion'],ocrRows=[]}={}){
 const root=sharedRoot||await fs.mkdtemp(path.join(os.tmpdir(),'marketing-'));if(!sharedRoot)t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new JobStore(path.join(root,'output/creative-ai/jobs')),brandId='brand-'+brand.toLowerCase();
 const bytes=await sharp({create:{width:1080,height:1080,channels:3,background:brand==='Duroflex'?'#345678':'#7a3456'}}).png().toBuffer(),data='data:image/png;base64,'+bytes.toString('base64');
 const intake={brandId,brandUrl:'https://'+brand.toLowerCase()+'.test/',brief:'Purchase campaign for '+NAMES[brand]+'.',productName:NAMES[brand],productPageUrl:'https://'+brand.toLowerCase()+'.test/products/exact',productVariantId:'v1',originalArtworkVersion:1,leanWorkflowVersion:1,conceptRoutes:['continuity'],approvedLogoReference:{assetId:'approved-logo'},productReferencePolicy:{sourceAssetId:'sku-photo',referenceAssetIds:['sku-photo'],variant:{id:'v1',sku:'EXACT-1',name:'Default'}}};
 const configured=policy.configure({maxConcurrentUnits:1,maxReasoningCalls:100,jobTimeoutMs:3600000},intake),config=pinned?configured:Object.fromEntries(Object.entries(configured).filter(([k])=>!unpin.includes(k))),job=await store.create(intake,config,selection);
 const context={job,intake,brand:{id:brandId,name:brand,canvasAssets:{fonts:[{approved:true,brandId,family:brand==='Duroflex'?'Poppins':'Source Sans Pro',weight:700,style:'normal'}]}},research:{brandKnowledge:{brandId},dossier:{version:1,event:'research.completed',researchId:'mk-'+brand.toLowerCase(),brandName:brand,demo:false,completedAt:'2026-11-11T00:00:00.000Z',sources:[{id:'source-product-page',kind:'product',label:'Official product page',reference:intake.productPageUrl,collectedAt:'2026-11-11T00:00:00.000Z',status:'available'}],assets:[{id:'sku-photo',kind:'product',label:'Exact SKU photo',sourceIds:['source-product-page'],imageData:data},{id:'approved-logo',kind:'logo',label:'Approved logo',sourceIds:['source-product-page'],imageData:data}],findings:[]},productBriefEvidence:{productProfileId:'product-exact',assetIds:['sku-photo'],evidence:[{factId:'fact-1'}]},facts:[{id:'fact-1',status:'supported',text:'Backed by a 3-year conditional warranty.',sourceIds:[]}]},guardian:{requirements:[{id:'identity',text:'Preserve exact product identity'}],preferences:[],visualRules:[]}};
 const calls=[];
 const reason=async request=>{calls.push({kind:request.contextKind,input:request.input,instructions:request.instructions});
  if(request.contextKind==='lean-fingerprint')throw Error('No reading in this test');
  if(request.contextKind==='lean-planning'){const out=planFor(request.input,copyFor,pageExtra);if(request.validate)await request.validate(out);return out;}
  if(request.contextKind==='lean-correction')throw Error('No correction in this test');
  const out={checks:request.input.requirements.map(r=>({id:r.id,result:'no_mismatch',evidence:'Observed '+r.name,location:'Whole image'}))};if(request.validate)request.validate(out);return out;};
 const runtime={root,store,config,readCarouselPlan:async()=>null,checklistOcr:async()=>({status:'measured',rows:ocrRows}),provider:{reason,generate:async request=>{calls.push({kind:'image',...request});return {imageData:data};}}};
 runtime.activity=new (require('../../lib/creative-ai/workflow-producer').ActivityLedger)(path.join(root,'output/creative-ai/activity'));runtime.eventQueues=new Map();
 const proto=require('../../lib/creative-ai/runtime/engine').CreativeRuntime.prototype;for(const key of ['log','beginTask','finishTask','artifact','stage'])runtime[key]=proto[key].bind(runtime);
 await runtime.log(job.id,'job.created','created',{details:{config:{jobId:job.id,assignmentId:job.id,mode:'production',conceptRoutes:intake.conceptRoutes,concepts:intake.conceptRoutes.map(route=>({id:require('../../lib/creative-ai/creative-director').conceptIdFor({assignmentId:job.id},route),route})),placements:selection.map(s=>({id:s.id,label:s.description.name}))}}});
 let planError=null;try{await flow.plan(runtime,job.id,{...context,budget:store.budget(job.id),phase:'planning'});}catch(e){planError=e;}
 const dir=store.dir(job.id);let records=[];
 if(!planError){const manifest=JSON.parse(await fs.readFile(path.join(dir,'image-queue.json')));records=await Promise.all(manifest.units.map(u=>fs.readFile(path.join(dir,u.file),'utf8').then(JSON.parse)));}
 return {root,store,job,dir,runtime,records,calls,planError,run:()=>handoff.generate(runtime,job.id),read:()=>store.read(job.id)};
}

module.exports={brands,NAMES,SHORT,square,story,HEADS,freshCopy,planFor,fixture};
