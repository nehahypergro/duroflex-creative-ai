'use strict';
const reader=require('./readability');
function assess(deck,selected){
 const policy=reader.pinnedPolicy(selected?.expanded?.rules||selected?.rules||[]);if(!policy||policy.version!=='2026-10-09.2')return null;
 const fields=deck.fields.filter(f=>f.delivery==='embedded'),latin=fields.every(f=>!/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{M}\p{S}\r\n\t]/u.test(f.text));
 const count=s=>s.trim()?s.trim().split(/\s+/u).length:0;
 const counts={headline:fields.filter(f=>f.role==='headline').reduce((n,f)=>n+count(f.text),0),support:fields.filter(f=>f.role==='body').reduce((n,f)=>n+count(f.text),0),total:fields.reduce((n,f)=>n+count(f.text),0)};
 const issues=[];
 const optionalBody=fields.filter(f=>f.role==='body'&&f.requirement==='optional'&&f.text.trim());
 if(policy.body===0&&optionalBody.length)issues.push({code:'optional-body-not-suited',fieldIds:optionalBody.map(f=>f.id),action:'Omit optional embedded body copy before locking. Essential supplied wording and qualifiers stay intact.'});
 if(policy.classId==='folded')issues.push({code:'panel-allocation-needed',fieldIds:fields.map(f=>f.id),action:'Allocate copy per panel in the art specification; whole-face totals cannot prove panel fit.'});
 else if(latin&&policy.total!==null&&policy.total!==0){for(const [k,target] of [['headline',policy.headline],['support',policy.body],['total',policy.total]])if(counts[k]>target)issues.push({code:k+'-target-exceeded',fieldIds:fields.filter(f=>k==='total'||f.role===(k==='support'?'body':k)).map(f=>f.id),action:'Above the editorial '+target+'-word starting target. Simplify optional content before locking; preserve mandatory wording. If still necessary, flag fit risk and choose a larger/split layout.'});}
 if(policy.total===0&&fields.length)issues.push({code:'overlay-destination-check',fieldIds:fields.map(f=>f.id),action:'Check the exact destination overlay policy; a product gallery asset is distinct from a primary product image.'});
 if(!latin)issues.push({code:'script-layout-review',fieldIds:fields.map(f=>f.id),action:'English word targets cannot determine this script’s capacity; inspect actual glyphs, line lengths and layout.'});
 return {version:policy.version,conceptId:deck.conceptId,placementId:deck.placementId,classId:policy.classId,status:issues.length?'needs-layout-review':'within-drafting-targets',counts:latin?counts:null,mandatoryFieldIds:fields.filter(f=>f.requirement==='mandatory'||f.role==='disclaimer').map(f=>f.id),issues,limits:'Drafting assessment only; never establishes rendered readability or publisher acceptance.'};
}
function assessAll(decks,selections){return decks.map(d=>assess(d,selections.find(s=>s.id===d.placementId))).filter(Boolean);}
function validateOmissions(out,input){for(const d of out.decks){const report=assess(d,input.placements.find(s=>s.id===d.placementId));if(report?.issues.some(i=>i.code==='optional-body-not-suited'))throw Error('Studio reading policy for '+d.placementId+' omits optional embedded body copy. Remove optional paragraphs; preserve mandatory qualifiers and explicit required text, and put longer explanation in an allowed native field or a separate format.');}}
module.exports={assess,assessAll,validateOmissions};
