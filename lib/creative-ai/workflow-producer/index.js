'use strict';
const fs=require('fs/promises'),path=require('path');const {check}=require('../marketing-strategist/schema-validator');const {fingerprint,same}=require('../art-director');const {replay,scopeKey,sameScope}=require('./projection');
const agent=require('./agent.json'),inputSchema=require('./event-input.schema.json'),eventSchema=require('./event.schema.json'),jobSchema=require('./job.schema.json');const authority=Symbol('review-ledger-association');
const agents={'research':'brand-researcher','guardian':'brand-guardian','strategy':'marketing-strategist','concepts':'creative-director','copy':'copywriter','art':'art-director','reconciliation':'workflow-producer','generation':'graphic-designer','review':'creative-reviewer'};
const requiredArtifact={research:'dossier',guardian:'brand-guide',strategy:'strategy',concepts:'concept',copy:'copy',art:'art',generation:'image',review:'review'};
const protectedType=t=>t.startsWith('review.')||t.startsWith('correction.')||t.startsWith('delivery.');
const cleanId=id=>{if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(id))throw Error('Invalid stable ID');return id;};
function fail(errors){if(errors.length)throw Error(errors.join('\n'));}
function validateJob(config){fail(check(jobSchema,config));cleanId(config.jobId);if(config.concepts.length!==2||new Set(config.concepts.map(c=>c.id)).size!==2||new Set(config.concepts.map(c=>c.route)).size!==2)throw Error('Exactly two distinct continuity/exploration concepts required');if(new Set(config.placements.map(p=>p.id)).size!==config.placements.length)throw Error('Duplicate selected placement');return config;}
function validateEvent(input,events,{trusted=false}={}){
 fail(check(inputSchema,input));cleanId(input.jobId);cleanId(input.idempotencyKey);
 if(protectedType(input.type)&&!trusted)throw Error('Review/correction/delivery events require association with the existing ReviewLedger');
 const text=[input.description,input.outcome,input.evidence.adapterId,input.evidence.receiptId,...input.artifactRefs,...input.sourceRefs,...input.unresolvedIssueRefs,input.details.artifact?.reference||''].join(' ');
 if(/(?:sk-[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{10,}|(?:api[_ -]?key|password|credential|secret)\s*[:=]|-----BEGIN.*PRIVATE KEY)/i.test(text))throw Error('Secrets/credentials are not activity content');
 if(!events.length){if(input.type!=='job.created')throw Error('First event must create the job');validateJob(input.details.config);if(input.details.config.jobId!==input.jobId)throw Error('Job identity mismatch');}
 else if(input.type==='job.created')throw Error('Job already exists');
 const config=events.length?events[0].details.config:input.details.config;
 if(config.mode==='demo'?(input.evidence.mode!=='synthetic-fixture'):(input.evidence.mode!=='production-adapter'))throw Error('Demo/production evidence must remain explicitly separated');
 const scope=input.scope,fields=Object.keys(scope);if(fields.length){const concept=config.concepts.find(c=>c.id===scope.conceptId&&c.route===scope.route);if(!concept||(!config.placements.some(p=>p.id===scope.placementId)&&!(input.type==='artifact.saved'&&input.details.artifact?.kind==='concept'&&fields.length===2)))throw Error('Unknown concept/selected placement coverage');}
 const view=replay(events),d=input.details;
 const applicable={};if(input.type==='job.created')applicable.config=true;
 if(input.type.startsWith('task.')){applicable.taskId=true;applicable.taskKind=true;}
 if(input.type.startsWith('handoff.')){applicable.handoffId=true;applicable.taskKind=true;applicable.targetAgent=true;}
 if(input.type.startsWith('dependency.')){applicable.dependencyId=true;applicable.targetAgent=true;}
 if(input.type==='artifact.saved')applicable.artifact=true;
 if(input.type==='version.superseded'){applicable.artifactId=true;applicable.replacementArtifactId=true;}
 if(protectedType(input.type))applicable.reviewLink=true;
 if(Object.keys(d).some(k=>!applicable[k]))throw Error('Event details do not match event type');
 for(const k of Object.keys(applicable))if(d[k]===undefined)throw Error('Missing '+k+' event detail');
 if(input.artifactRefs.some(id=>!view.artifacts?.[id]||view.artifacts[id].supersededBy))throw Error('Unknown or superseded artifact version');
 if(input.sourceRefs.some(id=>view.artifacts?.[id]?.kind!=='source'))throw Error('Source reference must identify saved source metadata');
 if(input.upstreamHandoffIds.some(id=>!view.handoffs?.[id]))throw Error('Unknown upstream handoff');
 if(input.dependencyIds.some(id=>!view.dependencies?.[id]))throw Error('Unknown dependency link');
 if(input.type.startsWith('task.')){
  if(input.agent!==agents[d.taskKind])throw Error('Task owner does not match named agent');
  if(['research','guardian','strategy','concepts'].includes(d.taskKind)?fields.length!==0:fields.length!==3)throw Error('Task must use its global or per-output scope');
  if(input.type==='task.started'){if(view.tasks?.[d.taskId])throw Error('Task ID already started; record a new versioned task');}
  else {const t=view.tasks?.[d.taskId];if(!t||t.status!=='running'||t.kind!==d.taskKind||!sameScope(t.scope,input.scope))throw Error('Task not running or scope/version mismatch');if(t.artifactRefs.some(id=>view.artifacts[id]?.supersededBy))throw Error('Task inputs superseded; reject late completion');if(input.type==='task.completed'){if(input.dependencyIds.some(id=>view.dependencies[id].status==='waiting'))throw Error('Task still depends on unresolved input');const kind=requiredArtifact[d.taskKind];if(kind&&!input.artifactRefs.some(id=>view.artifacts[id].kind===kind))throw Error('Completion requires a saved '+kind+' artifact');if(d.taskKind==='concepts'&&input.artifactRefs.filter(id=>view.artifacts[id].kind==='concept').length!==2)throw Error('Concept completion requires exactly two saved cards');}}
 }
 if(input.type==='artifact.saved'){cleanId(d.artifact.id);if(view.artifacts?.[d.artifact.id])throw Error('Artifact IDs are immutable; save a new version ID');if(!/^(none|[a-f0-9]{64})$/.test(d.artifact.hash))throw Error('Invalid artifact hash');if(/^(data:|javascript:)/i.test(d.artifact.reference))throw Error('Activity stores references, not image/body/prompt payloads');}
 if(input.type==='version.superseded'){const old=view.artifacts?.[d.artifactId],next=view.artifacts?.[d.replacementArtifactId];if(!old||!next||old.supersededBy||next.supersededBy||old.kind!==next.kind||!sameScope(old.scope,next.scope)||d.artifactId===d.replacementArtifactId||next.sequence<=old.sequence)throw Error('Invalid artifact supersession');}
 if(input.type.startsWith('handoff.')){if(input.type==='handoff.sent'){if(view.handoffs?.[d.handoffId])throw Error('Handoff ID already exists');}else {const h=view.handoffs?.[d.handoffId];if(!h||h.targetAgent!==input.agent||h.taskKind!==d.taskKind||h.targetAgent!==d.targetAgent||!sameScope(h.scope,scope)||h.status!==(input.type==='handoff.accepted'?'sent':'accepted'))throw Error('Handoff transition mismatch');if(input.type==='handoff.completed'&&!Object.values(view.tasks).some(t=>t.status==='completed'&&t.handoffIds.includes(h.id)))throw Error('Handoff completion needs actual recorded task completion');}}
 if(input.type.startsWith('dependency.')){if(input.type==='dependency.waiting'){if(view.dependencies?.[d.dependencyId])throw Error('Dependency ID already exists');}else if(!view.dependencies?.[d.dependencyId]||view.dependencies[d.dependencyId].status!=='waiting'||!sameScope(view.dependencies[d.dependencyId].scope,scope))throw Error('Dependency transition mismatch');}
 if(protectedType(input.type)&&fields.length!==3)throw Error('Reviewer association requires exact output scope');
 return input;
}
class ActivityLedger{
 constructor(directory){if(!path.isAbsolute(directory))throw Error('Absolute activity ledger directory required');this.directory=directory;}
 folder(jobId){return path.join(this.directory,cleanId(jobId));}
 async read(jobId){const dir=this.folder(jobId);let files;try{files=(await fs.readdir(dir)).filter(f=>/^\d{8}\.json$/.test(f)).sort();}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const events=[];for(const file of files){const e=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));fail(check(eventSchema,e));const {eventHash,...body}=e;if(fingerprint(body)!==eventHash||e.previousHash!==(events.at(-1)?.eventHash||'genesis')||e.sequence!==events.length+1||e.jobId!==jobId||file!==String(e.sequence).padStart(8,'0')+'.json'||!Number.isFinite(Date.parse(e.recordedAt))||(events.length&&Date.parse(e.recordedAt)<Date.parse(events.at(-1).recordedAt)))throw Error('Activity journal integrity/sequence mismatch');
   const {eventId,sequence,recordedAt,previousHash,...input}=body;if(eventId!=='event-'+fingerprint({jobId:input.jobId,idempotencyKey:input.idempotencyKey}).slice(0,32))throw Error('Stable event ID mismatch');validateEvent(input,events,{trusted:protectedType(e.type)});
   if(protectedType(e.type)){const snapshot=JSON.parse(await fs.readFile(path.join(dir,'review-links',e.details.reviewLink.reviewerStateHash+'.json'),'utf8'));if(fingerprint(snapshot)!==e.details.reviewLink.reviewerStateHash)throw Error('Reviewer snapshot integrity mismatch');verifyReviewLink(e,snapshot);}
   events.push(e);
  }return events;
 }
 async append(input,token){const dir=this.folder(input.jobId);await fs.mkdir(dir,{recursive:true});let lock;try{lock=await fs.open(path.join(dir,'.append.lock'),'wx');}catch(e){if(e.code==='EEXIST')throw Error('Activity job is busy; retry callback with the same idempotency key');throw e;}
  try{const events=await this.read(input.jobId),duplicate=events.find(e=>e.idempotencyKey===input.idempotencyKey);if(duplicate){const {eventId,sequence,recordedAt,previousHash,eventHash,...prior}=duplicate;if(!same(prior,input))throw Error('Idempotency key reused with different event payload');return duplicate;}
   validateEvent(input,events,{trusted:token===authority});const eventId='event-'+fingerprint({jobId:input.jobId,idempotencyKey:input.idempotencyKey}).slice(0,32),sequence=events.length+1,recordedAt=new Date(Math.max(Date.now(),Date.parse(events.at(-1)?.recordedAt||'1970-01-01'))).toISOString();const body={...structuredClone(input),eventId,sequence,recordedAt,previousHash:events.at(-1)?.eventHash||'genesis'},event={...body,eventHash:fingerprint(body)};
   const target=path.join(dir,String(sequence).padStart(8,'0')+'.json'),temp=target+'.tmp';const handle=await fs.open(temp,'w');try{await handle.writeFile(JSON.stringify(event,null,2)+'\n');await handle.sync();}finally{await handle.close();}await fs.rename(temp,target);return event;
  }finally{await lock.close();await fs.unlink(path.join(dir,'.append.lock'));}
 }
 async project(jobId){return replay(await this.read(jobId));}
 async query(jobId,{agent,type,conceptId,placementId,afterSequence=0}={}){return (await this.read(jobId)).filter(e=>e.sequence>afterSequence&&(!agent||e.agent===agent)&&(!type||e.type===type)&&(!conceptId||e.scope.conceptId===conceptId)&&(!placementId||e.scope.placementId===placementId));}
 async appendReviewer(input,{reviewLedger,unitKey}={}){
  if(!protectedType(input.type)||!(reviewLedger instanceof require('../creative-reviewer/lifecycle').ReviewLedger))throw Error('Existing reviewer ledger adapter required');
  const prior=(await this.read(input.jobId)).find(e=>e.idempotencyKey===input.idempotencyKey);if(prior){if(prior.details.reviewLink.unitKey!==unitKey)throw Error('Duplicate callback unit mismatch');const {reviewLink,...details}=prior.details;const candidate={...input,details:{...input.details,reviewLink}};return this.append(candidate,authority);}
  const state=await reviewLedger.read(unitKey);fail(check(require('../creative-reviewer/state.schema.json'),state));const link=reviewLinkFor(state);const linked={...input,details:{...input.details,reviewLink:link}};verifyReviewLink(linked,state);
  const events=await this.read(input.jobId);const view=replay(events);if(!input.artifactRefs.some(id=>view.artifacts[id]?.kind==='package'&&view.artifacts[id].hash===state.currentPackageHash&&sameScope(view.artifacts[id].scope,input.scope)))throw Error('Reviewer event requires matching saved package version');if(['delivery.ready','delivery.flagged'].includes(input.type)&&!input.artifactRefs.some(id=>view.artifacts[id]?.kind==='image'&&view.artifacts[id].hash===(state.currentArtifactHash==='missing'?state.lastAvailable?.artifactHash:state.currentArtifactHash)&&sameScope(view.artifacts[id].scope,input.scope)))throw Error('Delivery event requires matching saved available image');if(input.agent!==(input.type==='review.decision'?'creative-reviewer':'workflow-producer'))throw Error('Reviewer event owner mismatch');if(!events.length||state.assignmentId!==events[0].details.config.assignmentId)throw Error('Reviewer assignment does not match job');
  const dir=path.join(this.folder(input.jobId),'review-links');await fs.mkdir(dir,{recursive:true});const file=path.join(dir,link.reviewerStateHash+'.json');try{await fs.writeFile(file,JSON.stringify(state,null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;const existing=JSON.parse(await fs.readFile(file,'utf8'));if(!same(existing,state))throw Error('Reviewer snapshot collision');}
  return this.append(linked,authority);
 }
}
function reviewLinkFor(state){return {unitKey:state.unitKey,reviewerStateHash:fingerprint(state),packageHash:state.currentPackageHash,artifactHash:state.currentArtifactHash,reviewHash:state.verificationRecovery?.status==='complete'?state.verificationRecovery.reportHash:state.finalReportHash!=='none'?state.finalReportHash:state.initialReportHash,phase:state.phase,correctionCycles:state.correctionCycles,delivery:state.delivery,decision:state.history.at(-1)?.decision||'pending'};}
function verifyReviewLink(event,state){const l=event.details.reviewLink;if(!same(l,reviewLinkFor(state))||state.maxCorrectionCycles!==1||![0,1].includes(state.correctionCycles)||state.route!==event.scope.route||state.placementId!==event.scope.placementId||state.unitKey!==fingerprint({assignmentId:state.assignmentId,route:state.route,placementId:state.placementId}))throw Error('Reviewer unit/version/cap association mismatch');if(event.type==='review.decision'&&!state.history.length)throw Error('No recorded review decision');if(event.type==='correction.planned'&&(state.phase!=='correction-planned'||state.correctionCycles!==1))throw Error('No authoritative correction plan');if(event.type==='correction.used'&&(!['final-review','terminal'].includes(state.phase)||state.correctionCycles!==1))throw Error('Correction not used in authoritative ledger');const deliveries={'delivery.ready':'ready','delivery.flagged':'flagged-cap-reached','delivery.no-output':'no-output'};if(deliveries[event.type]&&(state.phase!=='terminal'||state.delivery!==deliveries[event.type]&&!(event.type==='delivery.flagged'&&state.delivery==='verification-pending')))throw Error('Delivery does not match authoritative reviewer status');}
module.exports={agent,inputSchema,eventSchema,jobSchema,ActivityLedger,validateJob,validateEvent,replay,reviewLinkFor};
