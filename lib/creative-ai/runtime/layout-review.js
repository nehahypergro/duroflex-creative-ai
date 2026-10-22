'use strict';
const {requiredFields}=require('./copy-checks');
// Only explicit bounds in the current brief are binding. No platform margins
// are inferred. Coordinates refer to the final raster, after generation.
function contract(record){
 const rule=record.lockedRules?.find(r=>r.id==='current-campaign-brief');if(!rule)return null;
 const text=rule.text||rule.value||'',pattern=/all\s+(?:promotional\s+)?copy\s+and\s+(?:the\s+)?complete\s+logo\s+inside\s+x\s*=\s*(\d+)\s*[–—-]\s*(\d+)\s+and\s+y\s*=\s*(\d+)\s*[–—-]\s*(\d+)/gi;
 const matches=[...text.matchAll(pattern)].map(m=>({left:+m[1],top:+m[3],right:+m[2],bottom:+m[4]}));if(!matches.length)return null;
 const unique=[...new Map(matches.map(b=>[JSON.stringify(b),b])).values()],bounds=unique[0],valid=unique.length===1&&validBox(bounds,record.canvas);
 return {status:valid?'explicit':'ambiguous',bounds:valid?bounds:null,ruleId:rule.id,sourceIds:rule.sourceIds||[],ids:[...requiredFields(record).map(f=>f.id),...(record.artDirection?.logo?.assetIds?.length?['logo']:[])]};
}
function validBox(b,canvas){return b&&['left','top','right','bottom'].every(k=>Number.isFinite(b[k]))&&b.left>=0&&b.top>=0&&b.right>b.left&&b.bottom>b.top&&b.right<=canvas.width&&b.bottom<=canvas.height;}
function schema(c){return {type:'array',minItems:c.ids.length,maxItems:c.ids.length,items:{type:'object',additionalProperties:false,required:['elementId','box','confidence','observation'],properties:{elementId:{type:'string',enum:c.ids},box:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['left','top','right','bottom'],properties:Object.fromEntries(['left','top','right','bottom'].map(k=>[k,{type:'number'}]))}]},confidence:{type:'number',minimum:0,maximum:1},observation:{type:'string',minLength:1}}}};}
const instructions='For layoutMeasurements, inspect the ACTUAL final raster and return the complete visible bounds of each named copy field and logo in original canvas PIXELS. Include all lines and the complete logo symbol/wordmark. Do not copy planned positions or the allowed bounds. Use null and low confidence if not locatable. Code compares your observed coordinates to the explicitLayoutContract; your prose pass cannot override coordinates. This checks placement only, not logo identity. Never fabricate measurement precision; these boxes are visual estimates.';
function apply(record,evidence,observations,ocr){
 const c=contract(record);if(!c)return [];
 if(!Array.isArray(observations)||observations.length!==c.ids.length||new Set(observations.map(o=>o.elementId)).size!==c.ids.length||observations.some(o=>!c.ids.includes(o.elementId)))throw Error('Layout measurements must cover every requested element exactly once.');
 const check=evidence.critical.find(c=>c.criterion==='mandatory-brand-rules');if(!check)throw Error('Mandatory brand rules criterion missing.');
 const reports=observations.map(o=>({...o,method:'vision-attestation'}));
 // Only unique, exact-matched marketing fields are considered. Product labels,
 // books and unrelated scene lettering cannot create layout findings.
 if(ocr?.status==='measured'){
  const rows=ocr.rows||[],matches=require('./editor-ocr').select(rows,requiredFields(record)).matches;
  for(const m of matches)if(m.lines.every(r=>r.confidence>=.7))reports.push({elementId:m.fieldId,box:{left:m.box.x*record.canvas.width,top:m.box.y*record.canvas.height,right:(m.box.x+m.box.width)*record.canvas.width,bottom:(m.box.y+m.box.height)*record.canvas.height},confidence:Math.min(...m.lines.map(r=>r.confidence)),observation:'Independent OCR bounds for uniquely matched requested copy.',method:'ocr-attestation'});
 }
 const confident=reports.filter(o=>validBox(o.box,record.canvas)&&o.confidence>=.7),failed=c.bounds?confident.filter(o=>o.box.left<c.bounds.left||o.box.top<c.bounds.top||o.box.right>c.bounds.right||o.box.bottom>c.bounds.bottom):[];
 const unknown=c.status!=='explicit'||c.ids.some(id=>!confident.some(o=>o.elementId===id));
 if(failed.length){
  check.status='fail';check.confidence=Math.max(...failed.map(o=>o.confidence));check.evidence.observation+=' Explicit brief bounds violated: '+failed.map(o=>o.elementId+' '+JSON.stringify(o.box)).join('; ');
  evidence.findings=evidence.findings.filter(f=>!f.id.startsWith('runtime-layout-'));
  for(const id of [...new Set(failed.map(o=>o.elementId))]){const o=failed.find(o=>o.elementId===id),expected=JSON.stringify(c.bounds),location=id+' '+JSON.stringify(o.box);evidence.findings.push({id:'runtime-layout-'+id,criterion:'mandatory-brand-rules',severity:'critical',authority:'explicit',defect:id+' extends outside explicit brief bounds '+expected,location,confidence:o.confidence,evidence:{method:o.method,observation:o.observation+' Observed bounds '+JSON.stringify(o.box),expected,location,sourceIds:c.sourceIds,ruleIds:[c.ruleId]},correction:'Move the complete '+id+' inside x='+c.bounds.left+'–'+c.bounds.right+' and y='+c.bounds.top+'–'+c.bounds.bottom+' on the '+record.canvas.width+'×'+record.canvas.height+' raster. Current bounds: '+JSON.stringify(o.box)+'. Resolve this exact overflow; do not replace the scene or change wording.',preserve:['Exact requested copy','Approved logo artwork and proportions','Product identity and scene'],cause:'art-direction-ignored',comparison:[{stage:'artwork',observation:location,referenceId:c.ruleId},{stage:'art',observation:'Current brief requires complete copy and logo inside '+expected,referenceId:c.ruleId}]});}
 }else if(unknown&&check.status==='pass'){check.status='unknown';check.confidence=Math.min(check.confidence,.65);check.evidence.observation+=' Explicit layout bounds or observed element positions remain unverified.';}
 return reports;
}
module.exports={contract,schema,instructions,apply,validBox};
