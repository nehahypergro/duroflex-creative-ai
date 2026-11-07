'use strict';
const crypto=require('node:crypto');
function validate(result,canvas){
 if(!result.complete||!result.regions.some(r=>r.kind==='product'))throw Error('Actual source product boundaries remain unverified');
 for(const r of result.regions)if(!['product','person','face'].includes(r.kind)||![r.left,r.top,r.width,r.height].every(Number.isFinite)||r.left<0||r.top<0||r.width<=0||r.height<=0||r.left+r.width>canvas.width||r.top+r.height>canvas.height||!r.evidence?.trim())throw Error('Invalid observed source region');
 return result.regions;
}
async function recover(runtime,id,k,source,doc,rows,fields,budget){
 const select=require('./saved-copy-layout').select;
 // Only request localization when saved copy is unambiguous outside a planned
 // envelope. OCR words still never replace the authoritative saved wording.
 const unprotected=select(rows,fields,{...doc,protectedRegions:[]});
 if(unprotected.issues.length||unprotected.matches.length!==fields.length)return null;
 const schema={type:'object',properties:{complete:{type:'boolean'},regions:{type:'array',items:{type:'object',properties:{id:{type:'string'},kind:{type:'string',enum:['product','person','face']},left:{type:'number'},top:{type:'number'},width:{type:'number'},height:{type:'number'},evidence:{type:'string'}},required:['id','kind','left','top','width','height','evidence'],additionalProperties:false}}},required:['complete','regions'],additionalProperties:false};
 const result=await runtime.provider.reason({contextKind:'canvas-layout-review',strictSchema:true,inlineImageInput:true,reasoningEffort:'low',maxOutputTokens:2000,maxProviderRequests:2,instructions:'Locate ALL visible product parts and people/faces in this actual generated artwork. Return tight protective rectangles in canvas pixels around the full visible subjects, including legs, arms, head and physical markings. Several rectangles may approximate a silhouette. Do not include empty wall merely because an earlier plan expected a product there. Campaign text on wall is not a subject. Never omit subject pixels to accommodate text. If complete localization is uncertain set complete=false. This is localization only, not product identity or quality approval.',input:{canvas:doc.canvas},images:[{id:'source-artwork',label:'Actual source artwork',imageData:'data:image/png;base64,'+source.toString('base64')}],schema,validate:r=>{const errors=require('../marketing-strategist/schema-validator').check(schema,r);if(errors.length)throw Error(errors.join('; '));validate(r,doc.canvas);}},budget);
 const regions=validate(result,doc.canvas),candidate={...doc,protectedRegions:regions},selected=select(rows,fields,candidate);
 await runtime.store.save(id,'observed-source-regions-'+k+'.json',{sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),plannedRegions:doc.protectedRegions,observedRegions:regions,selectedIssues:selected.issues});
 if(selected.issues.length||selected.matches.length!==fields.length)return null;
 return {document:candidate,selected};
}
async function selectWithRecovery(runtime,id,k,source,doc,rows,fields,budget,{requireObserved=false}={}){
 // Enlarging/reflowing type can cross a subject that the original small text
 // did not touch. Planned boxes cannot authorize this different composition.
 if(requireObserved){
  const observed=await recover(runtime,id,k,source,doc,rows,fields,budget);
  if(!observed)throw Error('Actual source product boundaries or campaign lettering remain ambiguous; no paid image repair was dispatched');
  return observed;
 }
 const selected=require('./saved-copy-layout').select(rows,fields,doc);
 if(!selected.issues.length&&selected.matches.length===fields.length)return {document:doc,selected};
 return await recover(runtime,id,k,source,doc,rows,fields,budget)||{document:doc,selected};
}
module.exports={recover,validate,selectWithRecovery};
