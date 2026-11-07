'use strict';
// Compile execution context without truncating operative instructions or copy.
function compact(prompt){
 const dedupe=value=>{if(Array.isArray(value))return value.map(dedupe);if(!value||typeof value!=='object')return value;const out=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,dedupe(v)]));if(typeof out.text==='string'&&out.value===out.text)delete out.value;return out;};
 return prompt.split('\n').map(line=>{const start=line.search(/[\[{]/);if(start<0)return line;try{return line.slice(0,start)+JSON.stringify(dedupe(JSON.parse(line.slice(start))));}catch{return line;}}).join('\n');
}
function renderProjection(prompt){
 const metadata=new Set(['sourceIds','ruleIds','sourceHash','brandHash','copyHash','conceptHash','placementHash','identityId','productId']);
 const project=v=>Array.isArray(v)?v.map(project):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!metadata.has(k)).map(([k,x])=>[k,project(x)])):v;
 const lines=prompt.split('\n'),locked=lines.find(l=>/^(Locked brand execution rules|Brand locked rules): /.test(l));let rules=[];try{rules=JSON.parse(locked.slice(locked.indexOf(': ')+2));}catch{}
 const replace=text=>{for(const r of rules)for(const value of new Set([r.text,r.value].filter(t=>typeof t==='string'&&t.length>=80)))text=text.replaceAll(value,'Apply locked rule '+r.id+' above.');return text;};
 const walk=v=>typeof v==='string'?replace(v):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;
 return lines.map(line=>{
  const authoritative=line===locked||/^(Exact embedded text|Exact campaign wording and typography|FINAL VISIBLE COPY ALLOWLIST|Case-sensitive glyph checks)/.test(line),start=line.search(/[\[{]/);
  if(start<0)return authoritative?line:replace(line);
  try{let data=JSON.parse(line.slice(start));
   if(line.startsWith('Source-backed product facts: ')&&Array.isArray(data)){
    // Registry verification is retained in planning; exact production files are
    // already bound by the typography/logo execution fields. Keep every other
    // fact verbatim, including offer wording and claim qualifiers.
    data=data.filter(f=>f.id!=='campaign-production-assets').map(f=>({text:f.text,...(f.status&&f.status!=='supported'?{status:f.status}:{} )}));
   }
   if(line.startsWith('Final art direction: ')&&data&&typeof data==='object'&&!Array.isArray(data)){
    // Audit rationale stays in the source package, not the pixel execution wire.
    // Preserve operative decisions, all locked rules and actual layout fields.
    data={...data};for(const key of ['rationale','reconciliation','status','dependencies','conceptId','placementId','formatId','route'])delete data[key];
    for(const key of ['knowledgeApplications','brandGuidelineApplications'])if(Array.isArray(data[key]))data[key]=data[key].map(row=>({decision:row.decision}));
   }
   return line.slice(0,start)+JSON.stringify(project(authoritative?data:walk(data)));}catch{return authoritative?line:replace(line);}
 }).join('\n');
}
function sharePassages(prompt){
 const lines=prompt.split('\n'),parsed=lines.map(line=>{const start=line.search(/[\[{]/);if(start<0||/^(Exact embedded text|Exact campaign wording and typography|FINAL VISIBLE COPY ALLOWLIST|Case-sensitive glyph checks)/.test(line))return null;try{return {prefix:line.slice(0,start),value:JSON.parse(line.slice(start))};}catch{return null;}}),counts=new Map(),dictionary={},ids=new Map();
 function count(v){if(typeof v==='string'&&v.length>=160)counts.set(v,(counts.get(v)||0)+1);else if(v&&typeof v==='object')Object.values(v).forEach(count);}parsed.filter(Boolean).forEach(p=>count(p.value));
 function encode(v){if(typeof v==='string'&&counts.get(v)>1){if(!ids.has(v)){const id='passage-'+(ids.size+1);ids.set(v,id);dictionary[id]=v;}return {renderPassage:ids.get(v)};}if(Array.isArray(v))return v.map(encode);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));return v;}
 const out=lines.map((line,i)=>parsed[i]?parsed[i].prefix+JSON.stringify(encode(parsed[i].value)):line).join('\n');return ids.size?'Resolve every renderPassage reference to its complete text below. No rule or qualifier is omitted.\nRender passages: '+JSON.stringify(dictionary)+'\n'+out:prompt;
}
// A reversible dictionary for repeated clauses across otherwise different stage
// instructions. Literal artwork fields stay expanded. No summarisation or slicing.
const executionHeader='EXECUTION PASSAGES (expand each token to its exact text; tokens are instructions, never artwork): ';
function mapInstructionText(prompt,transform){
 const walk=v=>typeof v==='string'?transform(v):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;
 return prompt.split('\n').map(line=>{
  if(/^(Exact embedded text|Exact campaign wording and typography|FINAL VISIBLE COPY ALLOWLIST|Case-sensitive glyph checks)/.test(line))return line;
  const start=line.search(/[\[{]/);
  if(start>=0){try{return line.slice(0,start)+JSON.stringify(walk(JSON.parse(line.slice(start))));}catch{}}
  return transform(line);
 }).join('\n');
}
function shareExecutionPassages(prompt){
 if(prompt.includes('<<EXEC_'))return prompt;
 const candidates=new Set();
 mapInstructionText(prompt,text=>{if(text.length>=160)candidates.add(text);const unprefixed=text.replace(/^(?:LOCKED RULE\s*[—:-]\s*|Mandatory [^:]{1,70}:\s*)/,'');if(unprefixed.length>=160)candidates.add(unprefixed);for(const clause of text.split(/(?<=[.!?;:])/).filter(c=>c.length>=80&&/[.!?;]$/.test(c)))candidates.add(clause);return text;});
 let body=prompt;const dictionary={};let n=0;
 for(const clause of [...candidates].sort((a,b)=>b.length-a.length)){
  let count=0;mapInstructionText(body,text=>{let start=0;while((start=text.indexOf(clause,start))!==-1){count++;start+=clause.length;}return text;});
  const token='<<EXEC_'+(n+1)+'>>';if(count<2||(count-1)*clause.length<=count*token.length+JSON.stringify(clause).length-clause.length+40)continue;
  body=mapInstructionText(body,text=>text.replaceAll(clause,token));dictionary[token]=clause;n++;
 }
 if(!n)return prompt;
 const out=executionHeader+JSON.stringify(dictionary)+'\n'+body;
 if(out.length>=prompt.length||expandExecutionPassages(out)!==prompt)return prompt;
 return out;
}
function expandExecutionPassages(prompt){
 if(!prompt.startsWith(executionHeader))return prompt;
 const end=prompt.indexOf('\n'),dictionary=JSON.parse(prompt.slice(executionHeader.length,end));
 return mapInstructionText(prompt.slice(end+1),text=>text.replace(/<<EXEC_\d+>>/g,token=>dictionary[token]??token));
}
function correctionInstructions(plan){
 if(!Array.isArray(plan?.corrections))throw Error('Correction plan must contain actionable corrections');
 return JSON.stringify({preserveUnaffected:true,corrections:plan.corrections.map(c=>({correction:c.correction,preserve:c.preserve||[]}))});
}
function prepare(prompt){let text=compact(prompt);if([...text].length>28000)text=renderProjection(text);if([...text].length>28000)text=shareExecutionPassages(text);if([...text].length>28000)text=sharePassages(text);if([...text].length>28000){const seen=new Set();text=text.split('\n').filter(line=>{if(/^(Exact embedded text|Exact campaign wording and typography|FINAL VISIBLE COPY ALLOWLIST|Case-sensitive glyph checks)/.test(line)||!line.trim())return true;if(seen.has(line))return false;seen.add(line);return true;}).join('\n');}if([...text].length>32000){const error=Error('Image prompt exceeds the 32,000-character provider limit after lossless deduplication; revise the planning handoff before generation. No image request was dispatched.');error.code='IMAGE_PROMPT_LIMIT';error.promptBudget={limit:32000,originalCharacters:[...prompt].length,wireCharacters:[...text].length,sections:text.split('\n').map((line,index)=>({index,label:line.split(':',1)[0].slice(0,70),characters:[...line].length})).sort((a,b)=>b.characters-a.characters).slice(0,8)};throw error;}return {text,originalCharacters:[...prompt].length,wireCharacters:[...text].length};}
module.exports={compact,prepare,renderProjection,sharePassages,shareExecutionPassages,expandExecutionPassages,correctionInstructions};
