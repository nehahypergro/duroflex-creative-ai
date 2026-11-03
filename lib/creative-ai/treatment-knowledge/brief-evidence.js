'use strict';
// Keep accepted client statements attached to their exact brief text. This is
// source acceptance only; it neither validates offer completeness nor authenticates a quote.
const crypto=require('node:crypto');
function extract(brief){
 if(typeof brief!=='string')return [];
 return brief.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).flatMap(text=>{
  // Do not chop a statement away from its adjacent terms or attribution.
  // A long block remains in the supplied brief; it needs deliberate extraction.
  if(text.length>2000||/^(?:example|hypothetical|do not|don't|never|avoid|no offers?\b)/i.test(text))return [];
  const offer=/\b(?:offer|price|sale|discount|cashback|emi|bank)\b|₹|\bINR\b/i.test(text)&&/(?:₹|\bINR\b|\d\s*%|\b\d[\d,.]*\b|no[- ]cost|interest[- ]free)/i.test(text);
  const expert=/\b(?:expert|quote|testimonial)\b/i.test(text)&&/["“‘][^"”’\n]{3,}["”’]/.test(text);
  if(!offer&&!expert)return [];
  return [{id:'client-brief-'+(offer?'offer-':'expert-')+crypto.createHash('sha256').update(text).digest('hex').slice(0,16),kind:offer?'offer':'product',text,status:'supported',sourceIds:['user-brief'],essential:false}];
 });
}
function apply(input,snapshot){
 const accepted=snapshot?.packs.some(p=>p.rules.some(r=>r.id==='client-brief-source-authority'&&r.tier==='contract'));
 if(!accepted)return input;
 const source=input.additionalSources?.find(s=>s.id==='user-brief'&&s.kind==='user'&&s.status==='available');
 if(!source)return input;
 const out=structuredClone(input),facts=extract(out.assignment.brief);
 for(const fact of facts){const existing=out.facts.find(f=>f.id===fact.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(fact))throw Error('Client brief evidence identity conflict');if(!existing)out.facts.push(fact);}
 const offerIds=facts.filter(f=>f.kind==='offer').map(f=>f.id);
 if(offerIds.length)out.assignment.offerFactIds=[...new Set([...(out.assignment.offerFactIds||[]),...offerIds])];
 out.additionalSources=out.additionalSources.map(s=>s.id==='user-brief'?{...s,note:'Current user-authored offer terms and attributed expert quotes are accepted by client instruction. Preserve full supplied wording, conditions and attribution; this is not independent authentication or artwork approval.'}:s);
 return out;
}
module.exports={extract,apply};
