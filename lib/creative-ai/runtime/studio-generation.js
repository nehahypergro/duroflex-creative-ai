'use strict';
const path=require('path'),fs=require('./artifact-fs');
const M=require('../../../public/creative-ai/studio-model'),{fingerprint}=require('../art-director');
function draftHash(d){const copy=structuredClone(d);for(const key of ['updatedAt','revision','status','submission'])delete copy[key];return fingerprint(copy);}
function supported(d){return !!M.generationProfile(d);}
async function prepare(runtime,d){
 const profile=M.generationProfile(d);if(!profile)throw Error('Choose a connected static recipe and its exact supported dimensions. Square posts, Stories, LinkedIn, website banners, WhatsApp, 2–6-slide carousels, a single product gallery image and blog graphics are supported; other sets need their complete module or print contract.');
 const {placementId}=profile, placementIds=profile.placementIds||[placementId];
 if(placementIds.length>runtime.config.maxPlacements)throw Error('Choose up to '+runtime.config.maxPlacements+' placements per generation. Split this module set into smaller briefs.');
 const output=d.outputs[0], values=output.staticValues||{};
 const required={2:['technology','source'],3:['offer','terms','offerStart','offerEnd','destination'],4:['claim','proof'],6:['marketplace','template','eligibility'],10:['storeName','address','destination'],12:['partner','partnerAsset','lockup','reviewer'],15:['articleTitle','facts']};
 for(const key of required[output.featureId]||[])if(typeof values[key]!=='string'||!values[key].trim())throw Error('Complete '+key+' before generating this recipe. Missing facts must not be invented.');
 if(output.featureId===12)throw Error('Partner generation requires a verified attached partner asset and lockup contract in advanced tools. A text asset name is not enough.');

 const brand=await runtime.brands.read(d.brandId),product=await runtime.brands.products.read(brand.id,d.productId);
 if(product.brandId!==brand.id)throw Error('Product belongs to another brand.');
 const errors=M.validateBrief(d,{brand,products:[product]});if(Object.keys(errors).length)throw Error(Object.values(errors).join(' '));
 if(!brand.latestResearchId)throw Error('Complete this brand’s research before generating.');
 await runtime.researchSessions.prepare({brandId:brand.id,brandUrl:brand.brandUrl,researchId:brand.latestResearchId});
 const page=await runtime.brands.products.savedSource(brand.id,product.pageUrl);if(!page)throw Error('Saved product snapshot unavailable.');
 const candidates=product.assets.filter(a=>a.status==='stored'&&a.group==='product-images'&&a.type==='image');
 const hero=d.productAssetId?candidates.find(a=>a.id===d.productAssetId):candidates[0];if(!hero)throw Error('Choose a saved product photograph.');
 await runtime.brands.products.savedImage(brand.id,product,hero.url);
 const logo=await require('./approved-identity').snapshot(runtime,{brandId:brand.id});if(!logo)throw Error('Save the approved brand logo before generating.');
 const research=JSON.parse(await fs.readFile(path.join(runtime.researchSessions.store.dir(brand.latestResearchId),'research-product-evidence.json'),'utf8'));
 const campaignClarification=await require('./production-scope').prepare(runtime,brand,product,research,logo);
 const selectedReferenceIds=[];
 for(const ref of d.references||[]){if(ref.kind==='device-file')throw Error('This reference is only stored on this device. Add it to the brand library and process it before generation.');const id=String(ref.id||'').startsWith('supplied-asset-library-')?ref.id:'supplied-asset-library-'+ref.id;const a=research.dossier.assets.find(a=>a.id===id);if(!a||typeof a.imageData!=='string'||!a.imageData.startsWith('data:image/'))throw Error('Selected reference is not available in this brand’s saved research.');selectedReferenceIds.push(id);}
 if(selectedReferenceIds.length>3)throw Error('Select up to three visual references for this creative.');
 const brief=[d.brief,d.message&&'Main message: '+d.message,d.details&&Object.keys(d.details).length?'Brief details: '+JSON.stringify(d.details):'',d.outputs[0].staticValues&&'Asset-specific inputs: '+JSON.stringify(d.outputs[0].staticValues),M.staticParts(output).length?'Ordered asset plan (preserve order, wording, and per-item purpose): '+JSON.stringify(M.staticParts(output).map(({id,name,copy,alt,width,height},i)=>({index:i+1,id,name,copy,alt,width,height}))):'',...['people','lighting','setting'].filter(k=>d[k]&&d[k]!=='Decide from the brief').map(k=>k+': '+d[k]),selectedReferenceIds.length?'Use these selected saved visual references for spatial composition, architecture and colour zoning: '+selectedReferenceIds.join(', '):'', `Audience is defined by this brief, not verified consumer research. Use saved official product identity and approved brand assets. Do not ask again for identity or website freshness. Do not invent offers, prices or stronger product claims. ${(profile.unitCount||profile.carouselSlideCount||1)>1?"Produce two distinct options of the complete ordered asset set. Each option must include every listed item in order, at that item’s own specified dimensions.":`Produce two distinct options for this one ${profile.label} (${profile.width} × ${profile.height}).`}`].filter(Boolean).join('\n\n');
 const request={brandId:brand.id,brandUrl:brand.brandUrl,researchId:brand.latestResearchId,productPageUrl:product.pageUrl,productName:product.name,productVariantId:String(d.variant),productAssetId:hero.id,focusType:'product',creativeType:'auto',objective:({Awareness:'awareness',Consideration:'consideration',Conversion:'conversion'})[d.objective]||'consideration',language:d.outputs[0].language||d.language||'English',...(d.audience?{audience:d.audience}:{}),desiredAction:'Explore this product on its official product page.',landingPageUrl:product.pageUrl,brief,editableCanvas:false,strategyReasoningEffort:'medium',selectedReferenceIds,sourceStudioDraftId:d.id,sourceStudioDraftHash:draftHash(d),campaignName:d.name,placementIds,...(profile.customProfiles?{customProfiles:profile.customProfiles}:{}),...(profile.omitLogo?{logoTreatmentByPlacement:Object.fromEntries(placementIds.map(id=>[id,'omit']))}:{}),...(profile.carouselSlideCount?{carouselSlideCount:profile.carouselSlideCount}:{}),placementLogoPolicyVersion:1,placementPublishing:{[placementId]:{...(d.outputs[0].staticValues?.publishing?{publishing:d.outputs[0].staticValues.publishing.toLowerCase()}:{}),...(d.outputs[0].staticValues?.brandedHost?{brandedHost:d.outputs[0].staticValues.brandedHost==='Yes'}:{})}}};
 if(campaignClarification)request.campaignClarification=campaignClarification;
 require('./campaign-input').normalize(request);require('./output-formats').validate(request);const selected=require('./placements').resolve(request).selections[0];
 const token=fingerprint({request,brandRevision:runtime.brands.revision(brand),page:product.pageHash,hero:hero.sha256,logo:logo.sha256,references:selectedReferenceIds.map(id=>fingerprint(research.dossier.assets.find(a=>a.id===id).imageData))});
 request.requestKey=('studio-'+placementId.replace('custom:studio-','').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,28)+'-')+token;request.studioReadinessToken=token;
 return {token,request,checks:['Saved product and exact variant','Product photograph integrity','Current brand guidance',selected.jobInputs.logoPolicy.treatment==='omit'?'Added logo omitted for this publishing context':'Approved logo · usable top-left or top-right corner','Selected visual references','Dimensions and brief inputs'].map(label=>({label,status:'passed'})),summary:{brand:brand.name,product:product.name,variant:d.variant,width:profile.width,height:profile.height,options:2,unitsPerOption:profile.unitCount||profile.carouselSlideCount||1},cost:await require('./studio-estimate').estimateBrief(runtime,brand.id,profile)};
}
async function submit(runtime,{draft,token}){
 if(!/^[a-f0-9]{64}$/.test(token||''))throw Error('Run the readiness check first.');
 const hash=draftHash(draft),existing=(await runtime.store.list()).find(j=>j.intake.brandId===draft.brandId&&j.intake.sourceStudioDraftId===draft.id&&j.intake.studioReadinessToken===token);
 if(existing){if(existing.intake.sourceStudioDraftHash!==hash)throw Error('The brief changed. Run readiness again.');return {id:existing.id,reused:true};}
 const prepared=await prepare(runtime,draft);if(prepared.token!==token)throw Error('The brief or saved references changed. Run readiness again.');
 return {id:await runtime.create(prepared.request)};
}
module.exports={prepare,submit,supported,draftHash};
