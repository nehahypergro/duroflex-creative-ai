'use strict';
// Trusted local format knowledge. Brief/source text cannot choose a different
// destination, alter a rule tier, or supply executable retrieval instructions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const placement=require('../placement-knowledge');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function loadPack(id){
 if(id!=='owned-pdp')throw Error('Unknown treatment pack');
 const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'owned-pdp.json'),'utf8'));
 if(pack.id!==id||![1,2,3,4].includes(pack.version))throw Error('Unsupported treatment pack');
 const sourceIds=new Set(pack.sources.map(s=>s.id)),ids=new Set();
 for(const rule of pack.rules){if(ids.has(rule.id)||!rule.statement||!['contract','recommendation'].includes(rule.tier)||!rule.sourceIds.length||rule.sourceIds.some(id=>!sourceIds.has(id)))throw Error('Invalid treatment rule/source');ids.add(rule.id);}
 return pack;
}
function capture({selections,catalog}){
 const packs=selections.some(s=>s.description.pdp)?[loadPack('owned-pdp')]:[];
 const playbooks=require('./format-playbooks'),library=playbooks.load();
 if(selections.length)packs.push(playbooks.common(library));
 // A family can materialize several treatments (e.g. standee and wall).
 // Disambiguate only collisions in this new snapshot; historical snapshots
 // and single-treatment IDs retain their existing contracts.
 const selectedPacks=selections.map(s=>s.description.pdp?[]:playbooks.select(library,s));
 const identities=new Map();
 for(const selected of selectedPacks)for(const pack of selected){
  if(!identities.has(pack.id))identities.set(pack.id,new Set());
  identities.get(pack.id).add(hash(pack));
 }
 for(const selected of selectedPacks)for(const pack of selected)if(identities.get(pack.id).size>1){
  const familyId=pack.id,identity=hash(pack).slice(0,16);
  pack.id=familyId+':'+(pack.selectedFormat||'general')+':'+identity;
  pack.familyId=familyId;
  pack.rules=pack.rules.map(rule=>({...rule,id:pack.id+rule.id.slice(familyId.length)}));
 }
 const placements=selections.map((s,index)=>{
  const expanded=placement.resolvePin(s.pin,catalog);
  const reviewProfile=require('../creative-reviewer/profiles').forRecord({placementContext:{selection:s}});
  const selected=selectedPacks[index];
  for(const pack of selected)if(!packs.some(p=>p.id===pack.id))packs.push(pack);
  return {placementId:s.id,pin:structuredClone(s.pin),...expanded,
   ...(reviewProfile.id==='pdp'?{reviewProfile:{id:reviewProfile.id,version:reviewProfile.version,qualityGuidance:reviewProfile.qualityGuidance,excludedQualityCriteria:reviewProfile.policy.excludedQualityCriteria,instructions:reviewProfile.instructions}}:{}),
   missingInputs:expanded.profile.requiredJobInputs.filter(k=>s.jobInputs?.[k]===undefined||s.jobInputs[k]===null||s.jobInputs[k]===''),
   treatmentIds:[...(s.description.pdp?['owned-pdp']:selected.map(p=>p.id)), 'format-common'],
   treatmentCoverage:s.description.pdp||selected.length?'authored-guidance':'placement-rules-only',
   treatmentLimitations:s.description.pdp||selected.length?[]:['No dedicated treatment is mapped to this exact destination. Use its selected placement rules; do not infer a route or family from its ratio or brief keywords.'],
   slot:s.description.pdp?structuredClone(s.description.pdp):null};
 });
 const data={version:1,placements,packs,limits:'Shared format guidance is not product/brand/customer evidence. Destination identity comes from selected placements, not keyword or ratio guesses. Preserve rule tiers, source limitations and unknowns.'};
 return {...data,hash:hash(data)};
}
function validate(snapshot,selections){
 if(!snapshot)return null;const {hash:expected,...data}=snapshot;
 if(snapshot.version!==1||hash(data)!==expected)throw Error('Treatment knowledge hash mismatch');
 if(snapshot.placements.length!==selections.length||snapshot.placements.some((p,i)=>p.placementId!==selections[i].id||hash(p.pin)!==hash(selections[i].pin)))throw Error('Treatment knowledge selection mismatch');
 return structuredClone(snapshot);
}
function constraints(snapshot,id){
 const p=snapshot.placements.find(p=>p.placementId===id);if(!p)throw Error('Missing treatment format');
 const rows=['TREATMENT KNOWLEDGE '+snapshot.hash+'. '+snapshot.limits,
  ...p.rules.map(r=>'PLACEMENT RULE '+r.id+' ['+r.tier+'; '+r.evidenceStatus+']: '+r.statement+' Rationale: '+r.rationale+' Check: '+JSON.stringify(r.check)+' Limits: '+r.limits+' Sources: '+r.sourceIds.join(', ')),
  ...p.sources.map(s=>'PLACEMENT SOURCE '+s.id+': '+s.url+' ['+s.accessStatus+']. '+JSON.stringify(s.limitations)),
  ...(p.profile.unknowns||[]).map(x=>'PLACEMENT UNKNOWN: '+x),
  ...(p.treatmentLimitations||[]).map(x=>'TREATMENT LIMITATION: '+x),
  ...p.missingInputs.map(k=>'PLACEMENT INPUT NEEDED: '+k),
  ...(p.sourceConflicts||[]).map(c=>'SOURCE CONFLICT: '+JSON.stringify(c))];
 for(const id of p.treatmentIds){const pack=snapshot.packs.find(p=>p.id===id);if(!pack)throw Error('Missing pinned treatment pack');
  rows.push('TREATMENT PACK '+pack.id+' v'+pack.version+': '+pack.authority,
   ...pack.rules.map(r=>'TREATMENT RULE '+r.id+' ['+r.tier+']: '+r.statement+' Sources: '+r.sourceIds.join(', ')),
   ...pack.sources.map(s=>'TREATMENT SOURCE '+s.id+': '+s.url+' ['+(s.accessStatus||'see source basis')+']. '+s.basis));
 }
 if(p.slot)rows.push('ASSIGNED PDP SLOT '+p.slot.index+'/'+p.slot.count+' '+p.slot.key+': '+p.slot.direction);
 if(p.reviewProfile)rows.push('FORMAT REVIEW PURPOSE '+JSON.stringify(p.reviewProfile));
 // The existing strategist contract bounds each constraint. Preserve all text;
 // split long records rather than silently dropping provenance or rules.
 return rows.flatMap(row=>Array.from({length:Math.ceil(row.length/1900)},(_,i)=>row.slice(i*1900,(i+1)*1900)));
}
function apply(input,snapshot,selections){
 if(!snapshot)return structuredClone(input);validate(snapshot,selections);
 const formats=input.assignment.formats;
 if(formats.length!==snapshot.placements.length||new Set(formats.map(f=>f.id)).size!==formats.length||formats.some(f=>!snapshot.placements.some(p=>p.placementId===f.id)))throw Error('Treatment knowledge format mismatch');
 const out=require('./brief-evidence').apply(structuredClone(input),snapshot);
 for(const f of out.assignment.formats){f.constraints=[...f.constraints,...constraints(snapshot,f.id)];if(f.constraints.length>100)throw Error('Selected treatment context exceeds format constraint capacity; no rules were truncated');}
 return out;
}
function forPlacement(snapshot,id){
 return context(snapshot,[id]);
}
function context(snapshot,ids=snapshot?.placements.map(p=>p.placementId)){
 if(!snapshot)return null;
 const selected=snapshot.placements.filter(p=>ids.includes(p.placementId));
 if(selected.length!==new Set(ids).size)throw Error('Missing treatment format');
 const profileIds=new Set(selected.map(p=>p.profile.id)),rules=new Map(),sources=new Map();
 for(const p of selected){for(const r of p.rules)rules.set(r.id,{...r,scope:{...r.scope,profileIds:r.scope.profileIds.filter(id=>profileIds.has(id))}});for(const s of p.sources)sources.set(s.id,s);}
 // Keep the full immutable snapshot on disk, but send shared rules/sources only
 // once. Unselected catalogue scopes are not useful prompt context.
 return structuredClone({snapshotHash:snapshot.hash,version:snapshot.version,
  placements:selected.map(({rules,sources,...p})=>({...p,ruleIds:rules.map(r=>r.id),sourceIds:sources.map(s=>s.id)})),
  rules:[...rules.values()],sources:[...sources.values()],
  packs:snapshot.packs.filter(pack=>selected.some(p=>p.treatmentIds.includes(pack.id))),limits:snapshot.limits});
}
function forJob(job){
 if(job.treatmentKnowledgeVersion===1&&!job.treatmentKnowledge)throw Error('Pinned treatment knowledge is missing');
 return validate(job.treatmentKnowledge,job.selection);
}
function execution(snapshot,id='owned-pdp'){
 return snapshot?.packs.find(p=>p.id===id)?.executionInstructions||loadPack(id).executionInstructions;
}
module.exports={loadPack,capture,validate,constraints,apply,forPlacement,forJob,execution,context};
