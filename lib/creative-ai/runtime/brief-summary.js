'use strict';
// The brief the design page shows beside each design (job view `briefSummary`). The full submitted brief is not sent
// (it carries pictures, readings and internal pins); this copies only the fields the brief form asks the user for.
// 21 Nov 2026 (Neha: "the entire brief is not captured … i want all the fields to be here"): before, only the brief
// text, product, audience, objective, language, message type and offer reached the page.
const text=(v,n=2000)=>typeof v==='string'?v.slice(0,n):v==null?null:String(v).slice(0,n);
const list=(v,n=20)=>Array.isArray(v)?v.slice(0,n).map(x=>text(x,300)).filter(Boolean):typeof v==='string'&&v.trim()?text(v,600):null;
const plain=(o,n=40)=>Object.fromEntries(Object.entries(o&&typeof o==='object'&&!Array.isArray(o)?o:{}).slice(0,n).filter(([,v])=>['string','number','boolean'].includes(typeof v)).map(([k,v])=>[k,typeof v==='string'?text(v,1200):v]));
const FIELDS=['funnelStage','message','customerAge','markets','occasion','backgroundBrief','mandatoryInfo','suppliedWording','desiredAction','landingPageUrl','productUrl','productPageUrl','focus','people','setting','lighting'];
function summary(j){
 const b=j.submittedBrief||{},i=j.intake||{};
 const out={brief:text(b.brief||i.brief||''),productId:b.productId||null,productName:b.productName||i.productName||'',variant:b.variant||i.productVariantId||null,audience:b.audience||i.audience||'',objective:b.objective||i.objective||'',language:b.language||i.language||'',messageType:b.messageType||null,offer:(b.outputs||[]).map(o=>o?.staticValues?.offer).find(Boolean)||null,ask:text(b.briefReading?.result?.ask||'',300)||null};
 for(const k of FIELDS)if(b[k]!=null&&b[k]!=='')out[k]=text(b[k]);
 for(const k of ['selectedRtbs','rtbs','productIds'])if(list(b[k]))out[k]=list(b[k]);
 if(b.details&&typeof b.details==='object')out.details=plain(b.details);
 if(b.creativeReference?.name)out.creativeReference={name:text(b.creativeReference.name,200),use:Array.isArray(b.creativeReference.use)?b.creativeReference.use.slice(0,5).map(x=>text(x,40)):[]};
 if(Array.isArray(b.references)&&b.references.length)out.references=b.references.slice(0,30).map(r=>({id:text(r?.id,120),name:text(r?.name||r?.filename||r?.title||'',200)}));
 if(Array.isArray(b.outputs))out.outputs=b.outputs.slice(0,40).map(o=>({id:text(o?.id,120),featureId:o?.featureId??null,formatId:text(o?.formatId,120),name:text(o?.name||'',200),width:o?.width??null,height:o?.height??null,slides:o?.slides??null,language:text(o?.language||'',60),staticValues:plain(o?.staticValues,60),...(Array.isArray(o?.staticParts)?{staticParts:o.staticParts.slice(0,20).map(p=>({id:text(p?.id,120),name:text(p?.name||'',200),copy:text(p?.copy||'',600),visualIntent:text(p?.visualIntent||'',600),alt:text(p?.alt||'',200),width:p?.width??null,height:p?.height??null}))}:{})}));
 const p=b.planning;if(p&&typeof p==='object')out.planning={strategy:{proposition:text(p.strategy?.proposition||'',1200),approach:text(p.strategy?.approach||'',1200)},concepts:Array.isArray(p.concepts)?p.concepts.slice(0,10).map(c=>typeof c==='string'?text(c,300):text(c?.name||c?.title||'',300)).filter(Boolean):[],team:text(p.team||'',300),deadline:text(p.deadline||'',100)};
 return out;
}
module.exports={summary,FIELDS};
