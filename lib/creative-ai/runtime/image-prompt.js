'use strict';
// Remove redundant serialization only. Never truncate instructions or copy.
function compact(prompt){
 const dedupe=value=>{if(Array.isArray(value))return value.map(dedupe);if(!value||typeof value!=='object')return value;const out=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,dedupe(v)]));if(typeof out.text==='string'&&out.value===out.text)delete out.value;return out;};
 return prompt.split('\n').map(line=>{const start=line.search(/[\[{]/);if(start<0)return line;try{return line.slice(0,start)+JSON.stringify(dedupe(JSON.parse(line.slice(start))));}catch{return line;}}).join('\n');
}
function renderProjection(prompt){
 const metadata=new Set(['sourceIds','ruleIds','sourceHash','brandHash','copyHash','conceptHash','placementHash','identityId','productId']);
 const project=v=>Array.isArray(v)?v.map(project):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!metadata.has(k)).map(([k,x])=>[k,project(x)])):v;
 const lines=prompt.split('\n'),locked=lines.find(l=>l.startsWith('Locked brand execution rules: '));let rules=[];try{rules=JSON.parse(locked.slice('Locked brand execution rules: '.length));}catch{}
 return lines.map(line=>{
  // Keep each full rule in the authoritative list. Later verbatim repetitions
  // become explicit references; no instruction, qualifier or exact copy is cut.
  if(line!==locked&&!/^(Exact embedded text|FINAL VISIBLE COPY ALLOWLIST|Case-sensitive glyph checks)/.test(line))for(const r of rules)for(const text of new Set([r.text,r.value].filter(t=>typeof t==='string'&&t.length>=80)))line=line.replaceAll(text,'Apply locked rule '+r.id+' above.');
  const start=line.search(/[\[{]/);if(start<0)return line;try{return line.slice(0,start)+JSON.stringify(project(JSON.parse(line.slice(start))));}catch{return line;}
 }).join('\n');
}
function prepare(prompt){let text=compact(prompt);if([...text].length>32000)text=renderProjection(text);if([...text].length>32000){const error=Error('Image prompt exceeds the 32,000-character provider limit after lossless deduplication; revise the planning handoff before generation. No image request was dispatched.');error.code='IMAGE_PROMPT_LIMIT';throw error;}return {text,originalCharacters:prompt.length,wireCharacters:text.length};}
module.exports={compact,prepare,renderProjection};
