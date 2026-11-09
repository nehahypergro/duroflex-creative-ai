'use strict';
// Builds work/planner-comparison-20261108/comparison.md from results.json.
// Optional observations.json ({overall:[...], packets:{D1:[...]}}) adds human notes.
const fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(__dirname,'../../../../work/planner-comparison-20261108');
const results=JSON.parse(fs.readFileSync(path.join(OUT,'results.json'),'utf8'));
let notes={overall:[],packets:{}};try{notes=JSON.parse(fs.readFileSync(path.join(OUT,'observations.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const NAMES={sol:'gpt-6.1-sol high',luna:'gpt-6-luna high',argon:'gemini-4-argon high'};
const inr=v=>v==null?'unknown':'₹'+v.toFixed(2),sec=v=>v==null?'–':Math.round(v)+' s',pct=(a,b)=>b?Math.round(100*a/b)+'%':'–';
const median=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!s.length)return null;const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const cell=s=>String(s??'').replace(/\|/g,'/').replace(/\n/g,' ');
const lines=[];
lines.push('# Planner model comparison — 8 November 2026','');
lines.push('8 saved main-Studio lean planning packets (4 Duroflex, 4 Sleepyhead) replayed through the same planning request, schema and validator. Each run gets the first try plus at most one repair.','');
lines.push('Costs are estimates at standard list prices. INR uses '+results.fx.usdToInr+' per USD (RBI reference rate dated '+results.fx.rateDate+', source in output/cost-tracking/currency.json). They are not invoices.','');
lines.push('**gpt-6.1-sol baseline:** S1–S4 reuse the original jobs\' first-try receipts and responses, so they cost nothing new. Those calls were background requests with photos sent as CDN links, so their timings include OpenAI queue time. D1–D4 were planned before today\'s planner code change, so they were re-run fresh like Luna and Argon (direct requests, photos sent inline).','');
lines.push('## Overall','','| Model | Plans | Valid first try | Valid after ≤1 repair | Median s | Max s | Median ₹ per plan | New spend ₹ |','|---|---|---|---|---|---|---|---|');
let grand=0;
for(const m of ['sol','luna','argon']){
 const runs=results.packets.map(p=>p.runs[m]).filter(Boolean),fresh=runs.filter(r=>r.source==='fresh');
 const spend=fresh.reduce((n,r)=>n+(r.inr||0),0);grand+=spend;
 lines.push('| '+NAMES[m]+' | '+runs.length+' | '+pct(runs.filter(r=>r.firstAttemptValid).length,runs.length)+' ('+runs.filter(r=>r.firstAttemptValid).length+'/'+runs.length+') | '+pct(runs.filter(r=>r.validAfterRepair).length,runs.length)+' ('+runs.filter(r=>r.validAfterRepair).length+'/'+runs.length+') | '+sec(median(runs.map(r=>r.seconds)))+' | '+sec(Math.max(...runs.map(r=>r.seconds||0)))+' | '+inr(median(runs.map(r=>r.inr)))+' | '+inr(spend)+(runs.some(r=>r.unknownReceipts)?' (+ unknown)':'')+' |');
}
lines.push('','Total new spend in this experiment (estimate): **'+inr(grand)+'**. This excludes the one tiny Argon access-check call (about ₹0.12, also in the ledger). Fresh timings only, Sol: median '+sec(median(results.packets.map(p=>p.runs.sol).filter(r=>r?.source==='fresh').map(r=>r.seconds)))+'.','');
if(notes.overall?.length)lines.push('## What stood out','',...notes.overall.map(n=>'- '+n),'');
lines.push('## Per packet','');
for(const p of results.packets){
 lines.push('### '+p.label,'','Source job `'+p.sourceJobId+'` · packet `'+p.packetKey+'` · '+p.format+' · '+p.pages.join(', ')+' · language '+p.language,'');
 lines.push('| Model | First try | After repair | Seconds | Tokens in / out | ₹ | First-try problem |','|---|---|---|---|---|---|---|');
 for(const m of ['sol','luna','argon']){const r=p.runs[m];if(!r)continue;lines.push('| '+NAMES[m]+(r.source==='fresh'?'':' (saved)')+' | '+(r.firstAttemptValid?'valid':'invalid')+' | '+(r.validAfterRepair?'valid':'**failed**')+' | '+sec(r.seconds)+' | '+r.inputTokens.toLocaleString('en-IN')+' / '+r.outputTokens.toLocaleString('en-IN')+' | '+inr(r.inr)+' | '+cell((r.firstAttemptProblem||'').slice(0,180))+' |');}
 lines.push('');
 for(const m of ['sol','luna','argon']){const r=p.runs[m];if(!r?.summary)continue;
  lines.push('**'+NAMES[m]+(r.rejectedOutput?' — rejected final output, shown for reading only':'')+'**: '+cell(r.summary.concept));
  for(const pg of r.summary.pages){lines.push('- Copy: '+pg.copy.map(c=>'“'+cell(c)+'”').join(' · '));lines.push('- Visual: '+cell(pg.artDirection).slice(0,400));lines.push('- Layout: '+cell(pg.layout).slice(0,300));}
  lines.push('');
 }
 if(notes.packets?.[p.label.slice(0,2)]?.length)lines.push('Notes:',...notes.packets[p.label.slice(0,2)].map(n=>'- '+n),'');
}
fs.writeFileSync(path.join(OUT,'comparison.md'),lines.join('\n'));
console.log('Saved',path.join(OUT,'comparison.md'));
