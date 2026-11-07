'use strict';
// Derived inspection views retain provenance. Enlarging pixels never establishes
// legibility or repairs lettering; the final export remains review authority.
const sharp=require('sharp'),crypto=require('crypto');
const bytes=data=>Buffer.from(data.split(',')[1],'base64');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const uri=b=>'data:image/png;base64,'+b.toString('base64');
const instructions='REFERENCE INSPECTION: The reference inventory identifies each exact attached asset and its hash. Compare the actual visible region with that named image, not its filename or a neighbouring source. Detail panels show top-left, top-right, bottom-left, bottom-right quadrants in that order. Enlarging pixels cannot recover missing detail. The native render, when present, is diagnostic only: it can locate whether lettering was damaged before export, but cannot establish a pass for unreadable or altered pixels in the final target. Do not use source labels or a planning claim as proof of what a reference depicts. Inspect the supplied pixels, including any visible cutaway. Target and display preview remain authoritative for artwork/readability. An unresolved comparison stays unknown; a failure needs a visible mismatch in the final target and the named original.';
async function detail(imageData){
 const b=bytes(imageData),m=await sharp(b,{limitInputPixels:40000000}).metadata();
 if(m.width<2||m.height<2)return imageData;
 const x=Math.floor(m.width/2),y=Math.floor(m.height/2),regions=[{left:0,top:0,width:x,height:y},{left:x,top:0,width:m.width-x,height:y},{left:0,top:y,width:x,height:m.height-y},{left:x,top:y,width:m.width-x,height:m.height-y}];
 const tiles=await Promise.all(regions.map(r=>sharp(b).extract(r).resize(768,768,{fit:'contain',background:'#808080'}).png().toBuffer()));
 return uri(await sharp({create:{width:1536,height:1536,channels:3,background:'#808080'}}).composite(tiles.map((input,i)=>({input,left:(i%2)*768,top:Math.floor(i/2)*768}))).png().toBuffer());
}
function selected(record){
 const manifest=record.attachmentManifest||[],ids=new Set([record.productReference?.sourceAssetId,...(record.artDirection?.product?.assetIds||[]),...(record.productReference?.referenceAssetIds||[])]);
 const rank=a=>a.assetId===record.productReference?.sourceAssetId?0:record.artDirection?.product?.assetIds?.includes(a.assetId)?1:2;
 // Required product references never disappear behind the old six-image cap.
 const product=manifest.filter(a=>ids.has(a.assetId)).sort((a,b)=>rank(a)-rank(b));
 return [...product,...manifest.filter(a=>!ids.has(a.assetId)).slice(0,Math.max(0,6-product.length))];
}
async function build(record,target,{master}={}){
 const sources=selected(record),images=sources.map(a=>({id:a.assetId,label:'Original source '+a.assetId+'; roles: '+a.roles.join(', '),imageData:a.imageData}));
 const limit=require('./deterministic-preflight').DEFAULT_IMAGE_LIMIT,reserved=2,omittedDerivedIds=[];
 // The final export and its display preview occupy two slots. Original
 // identity evidence outranks optional enlarged views; never trim it to fit.
 if(sources.length+reserved>limit)throw Object.assign(Error('Required review originals plus final target and display preview exceed attachment capacity; explicitly scope the source references before review.'),{code:'REFERENCE_CAPACITY',requiredCount:sources.length+reserved,limit,referenceIds:sources.map(a=>a.assetId)});
 async function derived(id,label,load){if(images.length+reserved>=limit){omittedDerivedIds.push(id);return;}images.push({id,label,imageData:await load()});}
 const references=sources.map(a=>({assetId:a.assetId,roles:a.roles,sha256:hash(bytes(a.imageData))}));
 if(record.productReference){
  await derived('actual-target-detail','Quadrants of the FINAL TARGET, enlarged for comparison only; no recovered detail or readability proof',()=>detail(target));
  for(const a of sources.filter(a=>record.productReference.referenceAssetIds.includes(a.assetId)).slice(0,2))await derived(a.assetId+'-detail','Quadrants of original '+a.assetId+'; derived from reference hash '+hash(bytes(a.imageData)),()=>detail(a.imageData));
 }
 if(master){
  if(master.proof.compositing||hash(bytes(target))!==master.proof.exportHash||hash(bytes(master.imageData))!==master.proof.sourceImageHash)throw Error('Native-render diagnostic hash or transformation mismatch');
  await derived('native-render-diagnostic','Verified PRE-EXPORT native render; diagnostic only. It is NOT the final target and cannot prove final readability or missing detail.',()=>master.imageData);
 }
 return {images,references,instructions,selection:{limit,reserved,originalCount:sources.length,attachedCount:images.length+reserved,omittedDerivedIds}};
}
const generationInstructions='EXACT-SKU VISUAL AUTHORITY: Original exact-SKU photographs determine silhouette, proportions, fabric, stripe pattern and authentic physical labels. Catalogue names and source-backed facts identify the selected SKU; they are not a transcription of wording printed on it. Do not rewrite physical labels from catalogue names, feature names, campaign copy or brief claims. Preserve actual visible product wording and its placement from the photographs; do not invent lettering when it is unreadable. Reference captions and infographic annotations outside the physical product are not product markings and must not be transferred onto it. Product-detail attachments are enlarged quadrants of their named source: top-left, top-right, bottom-left, bottom-right. They are inspection views, not additional products or a collage to reproduce. Use them with the original to inspect construction, fabric, stripes and labels. Enlarging pixels cannot recover missing detail. Product-reference room styling is not SKU identity; follow the supplied scene direction.';
async function generationReferences(record,{primaryFirst=false}={}){
 const originals=record.attachmentManifest||[];if(!record.productReference)return originals;
 const selectedIds=new Set([record.productReference.sourceAssetId,...(record.artDirection?.product?.assetIds||[])]);
 const candidates=originals.filter(a=>selectedIds.has(a.assetId));
 if(primaryFirst)candidates.sort((a,b)=>Number(b.assetId===record.productReference.sourceAssetId)-Number(a.assetId===record.productReference.sourceAssetId));
 const details=await Promise.all(candidates.slice(0,2).map(async a=>({assetId:a.assetId+'-detail',roles:['product-detail'],derivation:{kind:'source-quadrants-v1',sourceAssetId:a.assetId,sourceHash:hash(bytes(a.imageData))},imageData:await detail(a.imageData)})));
 return [...originals,...details];
}
async function verifyDerived(asset,sources){
 if(asset.derivation?.kind!=='source-quadrants-v1'||asset.roles?.length!==1||asset.roles[0]!=='product-detail'||asset.assetId!==asset.derivation.sourceAssetId+'-detail')throw Error('Invalid derived product detail contract');
 const source=sources.find(a=>(a.id||a.assetId)===asset.derivation.sourceAssetId&&hash(bytes(a.imageData))===asset.derivation.sourceHash);
 if(!source)throw Error('Derived product detail source is not collected for this brand and job');
 if(asset.imageData!==await detail(source.imageData))throw Error('Derived product detail pixels do not match the original');
 return true;
}
async function loadNative(dir,proofName){
 const fs=require('./artifact-fs'),path=require('path');
 let proof;try{proof=JSON.parse(await fs.readFile(path.join(dir,proofName)));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(!proof.nativeRenderFile)return null;
 if(path.basename(proof.nativeRenderFile)!==proof.nativeRenderFile)throw Error('Invalid native render path');
 return {proof,imageData:uri(await fs.readFile(path.join(dir,proof.nativeRenderFile)))};
}
module.exports={verifyDerived,loadNative,build,detail,generationReferences,generationInstructions,selected,instructions};
