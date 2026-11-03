'use strict';
// Model-authored lock flags cannot establish client-mandated exact wording.
function bind(field,authority){if(authority?.version!==1)return field;const canonical=s=>String(s).replace(/\s+/gu,' ').trim(),text=canonical(field.text),supplied=text&&authority.sources.some(s=>canonical(s).includes(text)),locked=field.role==='disclaimer'||!!supplied;return {...field,locked,requirement:locked?'mandatory':'optional'};}
function fromBrief(brief,rules){
 const sources=[String(brief||'')],copyRule=/(?:exact|verbatim|mandatory|required|must|use|include|preserve).*(?:wording|copy|headline|tagline|text)|(?:wording|copy|headline|tagline|text).*(?:exact|verbatim|mandatory|required|must)/is;
 for(const rule of rules||[]){const value=typeof rule==='string'?rule:rule.value||rule.text||rule.instruction||'';if(rule?.exactText)sources.push(rule.exactText);if(copyRule.test(value))sources.push(value);}
 return {version:1,sources};
}
module.exports={bind,fromBrief};
