'use strict';
const fs=require('fs/promises'),path=require('path');const {fingerprint}=require('../art-director');const {inspectArtifact}=require('../graphic-designer/results');const {consolidatedPlan}=require('./routing');
const clone=structuredClone;
function assertPackage(record){const {packageHash,...body}=record;if(fingerprint(body)!==packageHash)throw Error('Lifecycle package integrity mismatch');}
const unitKey=record=>fingerprint({assignmentId:record.assignmentId,route:record.route,placementId:record.placementId});
function verifyReport(report){const {reviewHash,...body}=report;if(fingerprint(body)!==reviewHash)throw Error('Review report integrity mismatch');const policy=report.policy?.version===3?require('./policy-pdp-v1.json'):report.policy?.version===2?require('./policy-v2.json'):require('./policy.json');if(fingerprint(report.policy)!==fingerprint(policy))throw Error('Review policy changed');if(report.criticalChecks.length!==policy.criticalCriteria.length||policy.criticalCriteria.some(id=>!report.criticalChecks.some(c=>c.criterion===id)))throw Error('Critical review criteria incomplete');if(report.decision==='ready'&&(!report.artifactAvailable||!report.qualityVerified||report.score<policy.threshold||report.evidenceMode==='pending'||report.criticalChecks.some(c=>['fail','unknown'].includes(c.status))))throw Error('Failed/unverified review cannot be marked ready');}
async function createState(record,imageData){assertPackage(record);let artifactHash='missing';try{artifactHash=(await inspectArtifact(imageData)).artifactHash;}catch{}return {version:1,unitKey:unitKey(record),assignmentId:record.assignmentId,route:record.route,placementId:record.placementId,phase:'initial-review',correctionCycles:0,maxCorrectionCycles:1,currentPackageHash:record.packageHash,currentArtifactHash:artifactHash,authorizationId:'none',initialReportHash:'none',finalReportHash:'none',delivery:'none',lastAvailable:artifactHash==='missing'?null:{packageHash:record.packageHash,artifactHash},history:[]};}
function consumeReview(state,report,{technicalFailure=false}={}){
 verifyReport(report);if(!['initial-review','final-review'].includes(state.phase))throw Error('Review not expected; unit is terminal or correction already planned');
 if(report.assignmentId!==state.assignmentId||report.route!==state.route||report.placementId!==state.placementId||report.packageHash!==state.currentPackageHash||report.artifactHash!==state.currentArtifactHash)throw Error('Review/image/version does not match lifecycle unit');
 const next=clone(state);next.history.push({phase:state.phase,packageHash:report.packageHash,artifactHash:report.artifactHash,reviewHash:report.reviewHash,decision:report.decision});
 if(report.artifactAvailable)next.lastAvailable={...next.lastAvailable,reviewEvidenceMode:report.evidenceMode};
 if(state.phase==='initial-review')next.initialReportHash=report.reviewHash;else next.finalReportHash=report.reviewHash;
 if(!report.artifactAvailable){next.phase='terminal';next.delivery=state.phase==='final-review'&&state.lastAvailable?'flagged-cap-reached':'no-output';}
 else if(technicalFailure&&report.evidenceMode==='pending'){next.phase='terminal';next.delivery=state.phase==='initial-review'?'verification-pending':'flagged-cap-reached';}
 else if(report.decision==='ready'){next.phase='terminal';next.delivery='ready';}
 else if(state.phase==='final-review'){next.phase='terminal';next.delivery='flagged-cap-reached';}
 // Unknown evidence and low quality without an observed cause are verification
 // work, not permission to redraw the artwork or spend its correction cycle.
 else if(!hasConfirmedDefect(report)){next.phase='terminal';next.delivery='verification-pending';}
 else {if(state.correctionCycles!==0)throw Error('Correction cycle already spent');next.phase='correction-planned';next.correctionCycles=1;next.authorizationId=fingerprint({unitKey:state.unitKey,initialReview:report.reviewHash,cycle:1});}
 return {state:next,plan:next.phase==='correction-planned'?consolidatedPlan(report,next):null};
}
function hasConfirmedDefect(report){return report.decision==='revise'&&(report.criticalChecks.some(c=>c.status==='fail')||report.routing.some(r=>r.status==='targeted-correction'));}
function reserveVerification(state,previousReport){
 verifyReport(previousReport);
 if(state.phase!=='terminal'||state.delivery==='ready'||state.currentArtifactHash==='missing'||previousReport.evidenceMode!=='pending'||previousReport.reviewHash!==(state.finalReportHash!=='none'?state.finalReportHash:state.initialReportHash))throw Error('Only a terminal unavailable review of the same saved image can be recovered');
 if(state.verificationRecovery)throw Error('Verification recovery is already reserved; resume the existing check');
 return {...clone(state),verificationRecovery:{status:'reserved',previousReportHash:previousReport.reviewHash,reportHash:'none'}};
}
function consumeVerification(state,report){
 verifyReport(report);const recovery=state.verificationRecovery;
 if(state.phase!=='terminal'||recovery?.status!=='reserved')throw Error('Verification recovery not reserved');
 if(report.assignmentId!==state.assignmentId||report.route!==state.route||report.placementId!==state.placementId||report.packageHash!==state.currentPackageHash||report.artifactHash!==state.currentArtifactHash)throw Error('Verification recovery cannot change image/package identity');
 const next=clone(state);next.verificationRecovery={...recovery,status:'complete',reportHash:report.reviewHash};next.history.push({phase:'verification-recovery',packageHash:report.packageHash,artifactHash:report.artifactHash,reviewHash:report.reviewHash,decision:report.decision});
 next.delivery=report.decision==='ready'?'ready':state.delivery;if(next.lastAvailable)next.lastAvailable.reviewEvidenceMode=report.evidenceMode;return next;
}
async function bindCorrection(state,record,imageData,{authorizationId}={}){
 assertPackage(record);
 if(state.phase!=='correction-planned'||state.correctionCycles!==1||authorizationId!==state.authorizationId)throw Error('Exactly one authorized correction binding allowed');
 if(unitKey(record)!==state.unitKey)throw Error('Correction cannot change stable lifecycle unit');
 let artifactHash='missing';try{artifactHash=(await inspectArtifact(imageData)).artifactHash;}catch{}
 return {...clone(state),phase:'final-review',currentPackageHash:record.packageHash,currentArtifactHash:artifactHash,lastAvailable:artifactHash==='missing'?state.lastAvailable:{packageHash:record.packageHash,artifactHash}};
}
function reservePreflightGeneration(state,report,original,repaired){
 assertPackage(original);assertPackage(repaired);verifyReport(report);
 if(state.phase!=='terminal'||state.delivery!=='no-output'||state.currentArtifactHash!=='missing'||state.correctionCycles!==0||state.preflightRecovery||state.currentPackageHash!==original.packageHash||state.initialReportHash!==report.reviewHash||report.artifactAvailable||report.evidenceMode!=='pending'||original.status!=='blocked'||repaired.status!=='request-ready'||repaired.dependencies.length||unitKey(original)!==unitKey(repaired)||unitKey(repaired)!==state.unitKey)throw Error('Only a never-rendered blocked package can recover initial generation');
 if(!original.dependencies.length||original.dependencies.some(d=>d.reason!=='Exact SKU source must remain an attached product reference.'))throw Error('Preflight recovery is limited to the recorded identity attachment defect');
 for(const key of ['artHash','copyHash','conceptHash','brandHash','placementHash'])if(original[key]!==repaired[key])throw Error('Preflight recovery cannot alter creative decisions');
 return {...clone(state),phase:'preflight-generation',preflightRecovery:{status:'reserved',previousPackageHash:original.packageHash,previousReportHash:report.reviewHash,packageHash:repaired.packageHash},history:[...clone(state.history),{phase:'preflight-generation-reserved',packageHash:original.packageHash,artifactHash:'missing',reviewHash:report.reviewHash,decision:'Original no-output retained; first image generation may proceed after identity attachment repair.'}]};
}
async function bindPreflightGeneration(state,record,imageData){
 assertPackage(record);if(state.phase!=='preflight-generation'||state.preflightRecovery?.status!=='reserved'||state.preflightRecovery.packageHash!==record.packageHash||unitKey(record)!==state.unitKey||state.correctionCycles!==0)throw Error('Preflight generation recovery is not reserved for this exact package');
 const {artifactHash}=await inspectArtifact(imageData);if(!artifactHash||artifactHash==='missing')throw Error('Actual generated pixels required');
 return {...clone(state),phase:'initial-review',currentPackageHash:record.packageHash,currentArtifactHash:artifactHash,initialReportHash:'none',delivery:'none',lastAvailable:{packageHash:record.packageHash,artifactHash},preflightRecovery:{...state.preflightRecovery,status:'generated'}};
}
// Persisted compare-and-swap ledger. Atomic writes plus an exclusive lock prevent two workers spending the same cycle.
// Future producer owns this durable path. Never create a new ledger to reset an existing assignment unit.
class ReviewLedger {
 constructor(directory){if(!path.isAbsolute(directory))throw Error('Absolute ledger directory required');this.directory=directory;}
 async transact(key,mutate){
  if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid unit key');await fs.mkdir(this.directory,{recursive:true});const file=path.join(this.directory,key+'.json'),lock=file+'.lock',release=await require('../runtime/file-lock').acquire(lock);
  try{let previous=null;try{previous=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}const next=await mutate(previous);if(next.unitKey!==key)throw Error('Ledger unit identity mismatch');const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(next,null,2)+'\n');await fs.rename(temp,file);return clone(next);}finally{await release();}
 }
 async start(record,imageData){const proposed=await createState(record,imageData);return this.transact(proposed.unitKey,old=>old||proposed);}
 async review(key,report,options){return this.transact(key,old=>{if(!old)throw Error('Unit must be started before review');return consumeReview(old,report,options).state;});}
 async reserveVerification(key,report){return this.transact(key,old=>{if(!old)throw Error('Unit missing');return reserveVerification(old,report);});}
 async verification(key,report){return this.transact(key,old=>{if(!old)throw Error('Unit missing');return consumeVerification(old,report);});}
 async correction(key,record,imageData,authorizationId){return this.transact(key,old=>{if(!old)throw Error('Unit missing');return bindCorrection(old,record,imageData,{authorizationId});});}
 async reservePreflight(key,report,original,repaired){return this.transact(key,old=>reservePreflightGeneration(old,report,original,repaired));}
 async bindPreflight(key,record,imageData){return this.transact(key,old=>bindPreflightGeneration(old,record,imageData));}
 async read(key){if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid unit key');return JSON.parse(await fs.readFile(path.join(this.directory,key+'.json'),'utf8'));}
}
module.exports={unitKey,createState,consumeReview,bindCorrection,reserveVerification,consumeVerification,ReviewLedger,verifyReport,reservePreflightGeneration,bindPreflightGeneration};
