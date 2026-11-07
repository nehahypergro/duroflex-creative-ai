'use strict';
const path=require('path'),fs=require('./artifact-fs');
const M=require('../../../public/creative-ai/studio-model'),{fingerprint}=require('../art-director');
function draftHash(d){const copy=structuredClone(d);for(const key of ['updatedAt','revision','status','submission'])delete copy[key];return fingerprint(copy);}
function supported(d){return M.campaignGenerationSupported(d);}
// The communication action follows the selected assignment; a blog, local
// post or technical explanation must not inherit a product-sales CTA.
function recipeIntent(output,values){
 const action={2:'Help the reader understand the supplied technology and supported benefit. No sales CTA is required.',3:'Use the supplied offer destination and retain its exact terms.',4:'Help the reader understand the supplied claim and its evidence. No sales CTA is required.',10:values.localCTA||'Help the reader understand this local update and its supplied next action.',12:'Explain the supplied partnership and agreed next action; do not invent one.',15:'Help the reader understand the article topic and read the supplied article.'}[output.featureId];
 if(!action)return null;
 const destination=typeof values.destination==='string'?values.destination.trim():'';
 return {desiredAction:action,...(destination?{landingPageUrl:destination}:{})};
}
async function prepare(runtime,d){
 if(d?.outputs?.length>1)return prepareCampaign(runtime,d);
 const lean=require('./original-delivery').prepare(runtime.root,{}).leanWorkflowVersion===1;
 const profile=M.generationProfile(d);if(!profile)throw Error('Choose a connected static recipe and its exact supported dimensions. Check the selected preset and its dimensions, including square or portrait choices. Batch versions, complete catalogues and partner toolkits currently save planning briefs only.');
 if(profile.placementId===require('./pdp').id)require('./pdp').admission(runtime.config);
 const {placementId}=profile, placementIds=profile.placementIds||[placementId];
 const output=d.outputs[0], values=M.assetValues(output,d),amazon=M.amazonImageTemplate(output)||(output.featureId===6&&profile.customProfiles?.every(p=>p.platform==='Amazon A+')),email=M.emailImage(output),rcs=M.rcsImage(output),push=M.pushImage(output),retail=M.retailEntry(output),brandOnly=d.focus==='brand';
 for(const key of M.requiredAssetFields(output,d))if(typeof values[key]!=='string'||!values[key].trim())throw Error('Complete '+key+' before generating this recipe. Missing facts must not be invented.');
 if(output.featureId===12)throw Error('Partner generation requires a verified attached partner asset and lockup contract in advanced tools. A text asset name is not enough.');

 // Use the same hash-checked saved catalog as the checklist, including features
 // extracted from legacy snapshots. Raw profiles may predate structured features.
 const brand=await runtime.brands.read(d.brandId),product=brandOnly?null:await runtime.brands.products.catalog(brand.id,d.productId);
 if(product&&product.brandId!==brand.id)throw Error('Product belongs to another brand.');
 const errors=M.validateBrief(d,{brand,products:product?[product]:[]});if(Object.keys(errors).length)throw Error(Object.values(errors).join(' '));
 if(!brand.latestResearchId)throw Error('Complete this brand’s research before generating.');
 await runtime.researchSessions.prepare({brandId:brand.id,brandUrl:brand.brandUrl,researchId:brand.latestResearchId});
 let hero=null;
 if(product){
  const page=await runtime.brands.products.savedSource(brand.id,product.pageUrl);if(!page)throw Error('Saved product snapshot unavailable.');
  const candidates=product.assets.filter(a=>a.status==='stored'&&a.group==='product-images'&&a.type==='image');
  hero=d.productAssetId?candidates.find(a=>a.id===d.productAssetId):candidates[0];if(!hero)throw Error('Choose a saved product photograph.');
  await runtime.brands.products.savedImage(brand.id,product,hero.url);
 }
 const research=JSON.parse(await fs.readFile(path.join(runtime.researchSessions.store.dir(brand.latestResearchId),'research-product-evidence.json'),'utf8'));
 const selectedReferenceIds=[];
 for(const ref of d.references||[]){if(ref.kind==='device-file')throw Error('This reference is only stored on this device. Add it to the brand library and process it before generation.');const id=String(ref.id||'').startsWith('supplied-asset-library-')?ref.id:'supplied-asset-library-'+ref.id;const a=research.dossier.assets.find(a=>a.id===id);if(!a||typeof a.imageData!=='string'||!a.imageData.startsWith('data:image/'))throw Error('Selected reference is not available in this brand’s saved research.');selectedReferenceIds.push(id);}
 if(selectedReferenceIds.length>3)throw Error('Select up to three visual references for this creative.');
 const assetValues=Object.fromEntries(M.staticRecipeForOutput(output,d).fields.map(([key])=>[key,values[key]]).filter(([,v])=>v));
 const inactiveConditional=['offer','offerSku','offerValidity','offerStart','offerEnd','terms','qrDestination','contactType','contactPhone','contactAddress','templateUrl','templateReferenceId','marketplaceName','mobileWidth','mobileHeight','specReference'];
 if(!(amazon||email||rcs||push||retail))for(const [key,value] of Object.entries(values))if(!inactiveConditional.includes(key)&&!(key in assetValues))assetValues[key]=value;
 const assetPlan=M.staticParts(output).map(({id,name,copy,alt,visualIntent,width,height},i)=>({index:i+1,id,name,width,height,...((amazon||rcs)?{visualIntent:visualIntent||'',...(copy?{previousCopyNote:copy}:{}),...(alt?{previousDescriptionNote:alt}:{})}:{copy,alt})}));
 const count=lean?2:1,optionWords=count===1?"one option":"two model-rendered options";
 const brief=[d.brief,M.intakeContext(d,product),d.message&&'Main message: '+d.message,d.details&&Object.keys(d.details).length?'Brief details: '+JSON.stringify(d.details):'','Asset-specific inputs: '+JSON.stringify(assetValues),'Delivery requirements: '+M.assetRequirementSummary(output,d).join('; '),'Explicit asset selections take priority over conflicting general notes. Inactive offer and contact details are excluded. Never invent contact details or a decorative QR pattern.',assetPlan.length?(d.intakeVersion>=2?'Requested slots and supplied instructions. Blank wording and notes are unspecified; strategy plans content. Retain required physical slot order and sizes: ':(amazon||rcs)?'Ordered image plan (visual direction is not literal wording; prior copy/description notes are retained for context, not mandatory overlay text): ':'Ordered asset plan (preserve order, wording, and per-item purpose): ')+JSON.stringify(assetPlan):'',!lean&&(amazon||email||rcs||push||retail)?'Image-only assignment. Use the selected image treatment. Native headings, paragraphs, alt text and interactive labels are a later phase. Do not invent a headline, CTA, button, hotspot marker or promotional copy overlay. Preserve genuine product markings. If the current user brief explicitly requests artwork wording, keep its wording and qualifiers.': '',brandOnly?'Brand-only assignment. Use this brand’s own saved guidance and references; no selected SKU, invented products or borrowed product facts.':'',...['people','lighting','setting'].filter(k=>d[k]&&d[k]!=='Decide from the brief').map(k=>k+': '+d[k]),selectedReferenceIds.length?'Use the saved verbal interpretation of these references; do not reattach inspiration pixels: '+selectedReferenceIds.join(', '):'', `Audience is defined by this brief, not verified consumer research. Use saved official product identity and approved brand assets. Do not ask again for identity or website freshness. Do not invent offers, prices or stronger product claims. ${(profile.unitCount||profile.carouselSlideCount||1)>1?`Produce ${optionWords} of the complete ordered asset set. Each option must include every listed item in order, at that item’s own specified dimensions.`:`Produce ${optionWords} for this one ${profile.label} (${profile.width} × ${profile.height}).`}`].filter(Boolean).join('\n\n');
 let request={brandId:brand.id,brandUrl:brand.brandUrl,researchId:brand.latestResearchId,...(product?{productPageUrl:product.pageUrl,productName:product.name,productVariantId:String(d.variant),productAssetId:hero.id}:{}),focusType:brandOnly?'brand':'product',creativeType:'auto',objective:({TOFU:'awareness',MOFU:'consideration',BOFU:'action'})[d.funnelStage]||({Awareness:'awareness',Consideration:'consideration',Conversion:'action',Purchase:'action'})[d.objective]||'consideration',conceptRoutes:count===1?['continuity']:['continuity','exploration'],language:d.outputs[0].language||d.language||'English',...(d.audience?{audience:d.audience}:{}),desiredAction:lean?'Choose the next action appropriate to this asset’s purpose and supplied brief; honour any explicit CTA, and omit a CTA where the placement calls for image-only artwork.':(amazon||email||rcs||push||retail)?'Help shoppers understand the selected visual subject. No added CTA is required.':'Explore this product on its official product page.',...(!amazon&&!email&&!rcs&&!push&&!retail&&product&&!recipeIntent(output,values)?{landingPageUrl:product.pageUrl}:{}),...(!retail||lean?recipeIntent(output,values):null),brief,...(d.briefDocuments?.length?{briefDocuments:require('./brief-document-context').sources(d)}:{}),editableCanvas:true,editableTextVersion:1,composedTextVersion:1,strategyReasoningEffort:'medium',selectedReferenceIds,sourceStudioDraftId:d.id,sourceStudioDraftHash:draftHash(d),campaignName:d.name,studioProjectNameMode:d.manualName?'manual':'automatic',placementIds,...(profile.customProfiles?{customProfiles:profile.customProfiles}:{}),...(profile.printOptions?{printOptions:profile.printOptions}:{}),...(profile.omitLogo?{logoTreatmentByPlacement:Object.fromEntries(placementIds.map(id=>[id,'omit']))}:{}),...(profile.carouselSlideCount?{carouselSlideCount:profile.carouselSlideCount}:{}),placementLogoPolicyVersion:1,placementPublishing:{[placementId]:{...(d.outputs[0].staticValues?.publishing?{publishing:d.outputs[0].staticValues.publishing.toLowerCase()}:{}),...(d.outputs[0].staticValues?.brandedHost?{brandedHost:d.outputs[0].staticValues.brandedHost==='Yes'}:{})}}};
 request=require('./campaign-input').normalize(require('./original-delivery').prepare(runtime.root,request));require('./output-formats').validate(request);const selection=require('./placements').resolve(request).selections,selected=selection[0];
 const canvasAssets=await require(lean?'./lean-context':'./editable').prerequisites(runtime,request,selection);
 const logo=lean?(canvasAssets.logo||null):await require('./approved-identity').snapshot(runtime,{brandId:brand.id});
 if(!lean&&!logo)throw Error('Save the approved brand logo before generating.');
 // An omit-logo placement still validates the saved production choice against
 // approved metadata; unused logo pixels are not a generation prerequisite.
 const campaignClarification=product?await require('./production-scope').prepare(runtime,brand,product,research,logo||brand.canvasAssets?.logo||{}):null;
 if(campaignClarification)request.campaignClarification=campaignClarification;
 const dimensions=selected.description.dimensions;
 const token=fingerprint({request,canvasAssets,brandRevision:runtime.brands.revision(brand),page:product?.pageHash||null,hero:hero?.sha256||null,logo:logo?.sha256||null,references:selectedReferenceIds.map(id=>fingerprint(research.dossier.assets.find(a=>a.id===id).imageData))});
 request.requestKey=('studio-'+placementId.replace('custom:studio-','').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,28)+'-')+token;request.studioReadinessToken=token;
 return {token,request,checks:[...(product?['Saved product and exact variant','Product photograph integrity']:['Brand-only image scope']),'Current brand guidance',selected.jobInputs.logoPolicy.treatment==='omit'?'Added logo omitted for this publishing context':'Approved logo · usable top-left or top-right corner','Selected visual references',lean?'Complete artwork · named brand fonts':'Editable text · saved brand fonts','Dimensions and brief inputs'].map(label=>({label,status:'passed'})),summary:{brand:brand.name,product:product?.name||'Brand-led imagery',variant:product?d.variant:null,width:dimensions.width,height:dimensions.height,options:count,unitsPerOption:profile.unitCount||profile.carouselSlideCount||1},cost:await require('./studio-estimate').estimateBrief(runtime,brand.id,profile,count)};
}
async function prepareCampaign(runtime,d){
 const outputs=d.outputs;
 const unsupported=outputs.filter(o=>!M.generationProfile({...d,outputs:[o]}));
 if(unsupported.length)throw Error('Check settings or remove unavailable assets: '+unsupported.map(o=>o.name||o.id).join(', '));
 if(new Set(outputs.map(o=>o.id)).size!==outputs.length||outputs.some(o=>!o.id))throw Error('Each campaign asset must have a distinct saved ID.');
 const children=[];
 for(const output of outputs){
  try{const child={...d,id:d.id+'-asset-'+output.id,outputs:[output],name:(d.name||'Campaign')+' · '+output.name};
   children.push({outputId:output.id,name:output.name,prepared:await prepare(runtime,child)});
  }catch(e){throw Error((output.name||'Asset')+': '+e.message);}
 }
 const token=fingerprint({draftHash:draftHash(d),children:children.map(c=>[c.outputId,c.prepared.token])});
 const known=children.every(c=>c.prepared.cost.status==='historical-estimate');
 const low=children.reduce((n,c)=>n+(c.prepared.cost.low||0),0),high=children.reduce((n,c)=>n+(c.prepared.cost.high||0),0);
 return {token,request:{campaignChildren:children},checks:[{label:outputs.length+' asset types validated, with every set page retained',status:'passed'}],summary:{...children[0].prepared.summary,assets:outputs.length,unitsPerOption:children.reduce((n,c)=>n+c.prepared.summary.unitsPerOption,0)},cost:known?{currency:'INR',status:'historical-estimate',low,high,message:'Estimated ₹'+low+'–'+high+' across '+outputs.length+' asset jobs. Actual usage may differ.'}:{currency:'INR',status:'unavailable',message:'Full campaign estimate unavailable: some assets have no comparable completed runs. '+outputs.length+' separate asset jobs will use the existing queues and budget checks.'}};
}
async function submitCampaign(runtime,draft,token){
 return require('./submission-lock')(runtime,'studio:'+draft.brandId+':'+token,async()=>{
  const prepared=await prepareCampaign(runtime,draft);if(prepared.token!==token)throw Error('The brief or references changed. Run readiness again.');
  const ids=[],errors=[];
  for(const child of prepared.request.campaignChildren){
   try{ids.push(await runtime.create(child.prepared.request));}
   catch(e){errors.push({outputId:child.outputId,name:child.name,message:e.message});}
  }
  if(!ids.length)throw Error(errors.map(e=>e.name+': '+e.message).join(' '));
  return {id:ids[0],ids,errors};
 });
}
async function submit(runtime,{draft,token}){
 if(!/^[a-f0-9]{64}$/.test(token||''))throw Error('Run the readiness check first.');
 if(draft?.outputs?.length>1)return submitCampaign(runtime,draft,token);
 return require('./submission-lock')(runtime,'studio:'+draft.brandId+':'+token,async()=>{
 const hash=draftHash(draft),existing=(await runtime.store.list({metadataOnly:true})).find(j=>j.intake.brandId===draft.brandId&&j.intake.sourceStudioDraftId===draft.id&&j.intake.studioReadinessToken===token);
 if(existing){if(existing.intake.sourceStudioDraftHash!==hash)throw Error('The brief changed. Run readiness again.');return {id:existing.id,reused:true};}
 const prepared=await prepare(runtime,draft);if(prepared.token!==token)throw Error('The brief or saved references changed. Run readiness again.');
 return {id:await runtime.create(prepared.request)};
 });
}
module.exports={prepare,submit,supported,draftHash,recipeIntent};
