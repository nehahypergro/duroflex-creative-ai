'use strict';
const stages=[{id:'brand',label:'Understanding your brand',kinds:['research','guardian','strategy']},{id:'concepts',label:'Developing concepts',kinds:['concepts']},{id:'statics',label:'Creating statics',kinds:['copy','art','reconciliation','generation']},{id:'quality',label:'Checking quality',kinds:['review']},{id:'ready',label:'Ready',kinds:[]}];
const sameScope=require('../art-director').same;
const scopeKey=s=>s.route?s.route+'|'+s.placementId:'job';
function replay(events){
 if(!events.length)return {job:null,events:[],tasks:{},handoffs:{},artifacts:{},dependencies:{},units:[],progress:{status:'not-created',label:'Not started'}};
 const config=events[0].details.config,tasks={},handoffs={},artifacts={},dependencies={},reviews={},deliveries={};
 for(const e of events){const d=e.details,key=scopeKey(e.scope);
  if(e.type==='task.started')tasks[d.taskId]={taskId:d.taskId,kind:d.taskKind,agent:e.agent,scope:e.scope,status:'running',artifactRefs:e.artifactRefs,handoffIds:e.upstreamHandoffIds,startSequence:e.sequence};
  if(e.type==='task.completed'||e.type==='task.failed')Object.assign(tasks[d.taskId],{status:e.type==='task.completed'?'completed':'failed',artifactRefs:[...new Set([...tasks[d.taskId].artifactRefs,...e.artifactRefs])],outcome:e.outcome,lastSequence:e.sequence});
  if(e.type==='artifact.saved')artifacts[d.artifact.id]={...d.artifact,scope:e.scope,supersededBy:null,sequence:e.sequence};
  if(e.type==='version.superseded')artifacts[d.artifactId].supersededBy=d.replacementArtifactId;
  if(e.type==='handoff.sent')handoffs[d.handoffId]={id:d.handoffId,status:'sent',agent:e.agent,targetAgent:d.targetAgent,taskKind:d.taskKind,scope:e.scope,artifactRefs:e.artifactRefs};
  if(e.type==='handoff.accepted'||e.type==='handoff.completed')handoffs[d.handoffId].status=e.type==='handoff.accepted'?'accepted':'completed';
  if(e.type==='dependency.waiting')dependencies[d.dependencyId]={id:d.dependencyId,status:'waiting',scope:e.scope,agent:d.targetAgent,description:e.description,issueRefs:e.unresolvedIssueRefs};
  if(e.type==='dependency.resolved')dependencies[d.dependencyId].status='resolved';
  if(e.type==='review.decision')reviews[key]=d.reviewLink;
  if(e.type.startsWith('delivery.'))deliveries[key]={status:e.type.slice(9),reviewLink:d.reviewLink,eventId:e.eventId,artifactRefs:e.artifactRefs};
 }
 for(const t of Object.values(tasks))if(t.artifactRefs.some(id=>artifacts[id]?.supersededBy))t.status='superseded';
 const latest=(kind,scope)=>Object.values(tasks).filter(t=>t.kind===kind&&sameScope(t.scope,scope)).sort((a,b)=>b.startSequence-a.startSequence)[0];
 const completed=(kind,scope)=>latest(kind,scope)?.status==='completed';
 const units=config.concepts.flatMap(c=>config.placements.map(p=>{const scope={conceptId:c.id,route:c.route,placementId:p.id},key=scopeKey(scope),waiting=Object.values(dependencies).filter(d=>d.status==='waiting'&&(scopeKey(d.scope)===key||scopeKey(d.scope)==='job'));return {...scope,scope,delivery:deliveries[key]?.status||'pending',review:reviews[key]||null,tasks:Object.values(tasks).filter(t=>scopeKey(t.scope)===key),waiting,staticsComplete:stages[2].kinds.every(k=>completed(k,scope))};}));
 const brandComplete=stages[0].kinds.every(k=>completed(k,{})),conceptsComplete=completed('concepts',{}),staticsComplete=units.every(u=>u.staticsComplete),terminal=units.every(u=>u.delivery!=='pending'),allReady=terminal&&units.every(u=>u.delivery==='ready');
 const historyComplete=brandComplete&&conceptsComplete&&staticsComplete;
 const confirmedReady=allReady&&historyComplete;
 const stageStates=stages.map((s,i)=>({id:s.id,label:s.label,status:(i===0?brandComplete:i===1?conceptsComplete:i===2?staticsComplete:i===3?units.every(u=>u.review!==null):confirmedReady)?'completed':'pending'}));
 let current=stageStates.find(s=>s.status!=='completed')||stageStates.at(-1);
 const waits=Object.values(dependencies).filter(d=>d.status==='waiting'),failed=Object.values(tasks).filter(t=>t.status==='failed'&&latest(t.kind,t.scope)?.taskId===t.taskId);
 if(terminal&&!allReady)current={id:'delivery',label:units.every(u=>u.delivery==='no-output')?'No output available':'Delivered with issues',status:'finished'};
 return {version:1,job:config,events,tasks,handoffs,artifacts,dependencies,units,stages:stageStates,progress:{stage:current.id,label:current.label,status:confirmedReady?'ready':terminal?(allReady?'history-incomplete':'finished-with-issues'):waits.length?'waiting':failed.length?'needs-attention':'in-progress',totalOutputs:units.length,readyOutputs:units.filter(u=>u.delivery==='ready').length,flaggedOutputs:units.filter(u=>u.delivery==='flagged').length,noOutputCount:units.filter(u=>u.delivery==='no-output').length,pendingOutputs:units.filter(u=>u.delivery==='pending').length,parallelAgents:[...new Set(Object.values(tasks).filter(t=>t.status==='running').map(t=>t.agent))],limits:'Progress uses recorded completion, not elapsed time or handoff dispatch. No ETA or live orchestration is inferred.'}};
}
module.exports={stages,replay,scopeKey,sameScope};
