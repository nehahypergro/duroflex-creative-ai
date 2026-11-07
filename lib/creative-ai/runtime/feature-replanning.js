'use strict';
const {check}=require('../marketing-strategist/schema-validator');
const instructions='VISUAL FEATURE RECOVERY: The director could not execute the previous chosen demonstration with the supplied references. This is one upstream strategy revision, not permission to waive missing evidence. Decide whether the missing dependency is a visual reference for a feature YOU chose and whether the unchanged user brief permits a different feature. If so, choose a different supported product feature that can be depicted using the existing selected product assets. Cite its fact IDs and actual reference asset IDs in featureRecoveryDecision. Preserve exact SKU, explicit user feature requests, wording, claim qualifiers, guardian requirements, placements and product source policy. Never invent a demonstration, cutaway, asset or technical proof; follow the pinned technical treatment; legacy original technical artwork remains reuse-only. Do not promise unchanged pixel reuse from a generative render. If the feature was explicitly required, the dependency is not visual, or no supported alternative exists, set the relevant decision false and keep strategy research_required. Do not silently replace a user requirement or mark missing evidence available. The director will independently recheck the replacement before dispatch.';
function inventory(input,scope={}){
 return {facts:input.strategyInput.facts.filter(f=>f.kind==='product'&&f.status==='supported'&&(!scope.factIds||scope.factIds.includes(f.id))),assets:input.strategyInput.research.assets.filter(a=>a.kind==='product'&&a.imageData&&(!scope.assetIds||scope.assetIds.includes(a.id)))};
}
function feedback(input,output,scope){
 if(output.status==='ready'||input.strategyInput.assignment.focusType!=='product')return null;
 const {facts,assets}=inventory(input,scope);
 const questions=output.workflow?.internalQuestions||[];
 if(!facts.length||!assets.length||!questions.length||questions.some(q=>q.target!=='brand-researcher')||!questions.some(q=>q.relatedIds?.some(id=>facts.some(f=>f.id===id))))return null;
 return {version:1,previousProposition:input.strategy.brief.primaryProposition,questions,missingAssets:(output.concepts||[]).flatMap(c=>(c.requiredAssets||[]).filter(a=>a.essential&&a.status==='missing')),candidateFactIds:facts.map(f=>f.id),availableProductAssetIds:assets.map(a=>a.id),availableProductReferences:assets.map(({id,label,sourceIds})=>({id,label,sourceIds})),instructions};
}
const decisionSchema={type:'object',additionalProperties:false,required:['optionalFeature','visualReferenceMissing','reason','factIds','referenceAssetIds'],properties:{optionalFeature:{type:'boolean'},visualReferenceMissing:{type:'boolean'},reason:{type:'string',minLength:1},factIds:{type:'array',items:{type:'string'}},referenceAssetIds:{type:'array',items:{type:'string'}}}};
function validateDecision(result,input,scope){
 const {strategy,decision}=result;
 const errors=check(decisionSchema,decision);if(errors.length)throw Error('Invalid feature recovery decision: '+errors.join('; '));
 if(strategy.status!=='ready'||!decision.optionalFeature||!decision.visualReferenceMissing)throw Error('Feature recovery remains blocked: the required feature or evidence cannot be replaced. '+decision.reason);
 const {facts,assets}=inventory(input,scope);
 const chosen=strategy.brief.primaryProposition.factIds||[];
 if(!decision.factIds.length||decision.factIds.some(id=>!facts.some(f=>f.id===id))||!chosen.length||chosen.some(id=>!facts.some(f=>f.id===id))||!decision.factIds.every(id=>chosen.includes(id)))throw Error('Feature recovery requires supported selected product facts in the new proposition');
 if(!decision.referenceAssetIds.length||decision.referenceAssetIds.some(id=>!assets.some(a=>a.id===id)))throw Error('Feature recovery requires existing selected product reference assets');
 if(strategy.brief.primaryProposition.text===input.strategy.brief.primaryProposition.text)throw Error('Feature recovery must change the unexecutable proposition');
 return result;
}
async function replan(input,feedback,provider,budget,options={}){
 let decision;
 const scopedProvider={reason:async(request,b)=>{
  const original=request.wire,wire={...original,schema:structuredClone(original.schema),input:{...original.input,featureRecovery:feedback},instructions:original.instructions+'\n'+instructions};
  wire.schema.properties.featureRecoveryDecision=structuredClone(decisionSchema);wire.schema.required.push('featureRecoveryDecision');
  wire.decode=out=>{const {featureRecoveryDecision,...rest}=out;const errors=check(decisionSchema,featureRecoveryDecision);if(errors.length)throw Error(errors.join('; '));decision=structuredClone(featureRecoveryDecision);return original.decode(rest);};
  return provider.reason({...request,wire},b);
 }};
 const strategy=await require('./agents').strategist(input.strategyInput,scopedProvider,budget,options);
 return {strategy,decision};
}
async function recover(input,output,{stage,replan:runStrategy,concepts,evidenceScope,returnBlocked=false}){
 const context=feedback(input,output,evidenceScope);if(!context)return null;
 const result=await stage('feature-replan.json',()=>runStrategy(input,context));
 if(returnBlocked&&(result.strategy.status!=='ready'||result.decision.optionalFeature!==true||result.decision.visualReferenceMissing!==true))return {directorInput:input,directorOutput:output,decision:result.decision,feedback:context,unresolved:true};
 validateDecision(result,input,evidenceScope);
 const directorInput={...input,strategy:result.strategy};
 const directorOutput=await stage('feature-replanned-concepts.json',()=>concepts(directorInput));
 if(!returnBlocked)require('./agents').requireConceptDispatch(directorOutput);
 return {directorInput,directorOutput,decision:result.decision,feedback:context};
}
module.exports={feedback,validateDecision,replan,recover,decisionSchema,instructions};
