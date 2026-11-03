'use strict';
const {fingerprint}=require('../art-director');
function scope(base,placements){const ids=new Set(placements.map(p=>p.id));return {...base,placements,...(base.input?{input:{...base.input,placements,copy:base.input.copy.filter(d=>ids.has(d.placementId))}}:{}),...(base.drafts?{drafts:{...base.drafts,drafts:base.drafts.drafts.filter(d=>ids.has(d.placementId))}}:{}),...(base.copy?{copy:base.copy.filter(d=>ids.has(d.placementId))}:{}),carouselPlan:base.carouselPlan?{...base.carouselPlan,sets:base.carouselPlan.sets.map(s=>({...s,slides:s.slides.filter(x=>ids.has(x.placementId))})).filter(s=>s.slides.length)}:null,pdpPlan:require('./pdp').scope(base.pdpPlan,ids)};}
function validate(output,key,part){const actual=output?.[key]?.map(d=>d.conceptId+'|'+d.placementId)||[],expected=(part.concepts||part.directorOutput?.concepts||[]).flatMap(c=>part.placements.map(p=>c.conceptId+'|'+p.id));if(actual.length!==expected.length||new Set(actual).size!==expected.length||expected.some(k=>!actual.includes(k)))throw Error('Invalid planning checkpoint unit bindings');}
async function run(base,key,request,cache,{concurrency=1}={}){
 const parts=[];for(let i=0;i<base.placements.length;i+=3)parts.push(scope(base,base.placements.slice(i,i+3)));
 const execute=async(part)=>{
  const inputHash=fingerprint({version:1,key,input:part}),name='planning-'+key+'-'+inputHash+'.json';
  let checkpoint=cache?await cache.read(name):null;
  if(checkpoint){if(checkpoint.inputHash!==inputHash||fingerprint(checkpoint.output)!==checkpoint.outputHash)throw Error('Saved planning checkpoint hash mismatch');validate(checkpoint.output,key,part);}
  else{const output=await request(part);validate(output,key,part);checkpoint={version:1,inputHash,outputHash:fingerprint(output),output};if(cache)await cache.save(name,checkpoint);}
  return checkpoint.output;
 };
 let outputs=[];if(concurrency===1){for(const part of parts)outputs.push(await execute(part));}else{const settled=await require('./unit-scheduler').run(parts.map((part,i)=>({conceptId:'planning',placementId:String(i),part})),{limit:concurrency,execute:({part})=>execute(part)});const failure=settled.find(r=>r.status==='rejected');if(failure)throw failure.reason;outputs=settled.map(r=>r.value);}
 if(outputs.length===1)return outputs[0];
 const items=outputs.flatMap(o=>o[key]);
 return key==='decks'?{version:1,agentId:'copywriter',decks:items,rationale:outputs.map(o=>o.rationale).filter(Boolean).join('\n'),unknowns:[...new Set(outputs.flatMap(o=>o.unknowns||[]))]}:{version:1,[key]:items};
}
module.exports={run,scope,validate};
