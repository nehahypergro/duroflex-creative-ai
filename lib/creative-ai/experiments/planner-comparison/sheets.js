'use strict';
// Comparison sheets for the plan-to-image follow-up: per packet, the three
// images stacked with the planning model, headline, plan time and plan ₹.
const path=require('node:path'),fs=require('node:fs');
const sharp=require('sharp');
const root=path.resolve(__dirname,'../../../..');
const OUT=path.join(root,'work/planner-comparison-20261108'),IMAGES=path.join(OUT,'images');
const MODELS=['sol','luna','argon'];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const results=JSON.parse(fs.readFileSync(path.join(OUT,'results.json'),'utf8'));
const images=JSON.parse(fs.readFileSync(path.join(IMAGES,'images.json'),'utf8'));
const W=1744,BAND=96,HEAD=104,GAP=16;
function band(lines,width,height,{bg='#f4f4f2',size=30}={}){
 const text=lines.map((l,i)=>`<text x="24" y="${40+i*(size+12)}" font-family="Helvetica, Arial, sans-serif" font-size="${i?size-6:size}" font-weight="${i?400:700}" fill="${i?'#444':'#111'}">${esc(l)}</text>`).join('');
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${bg}"/>${text}</svg>`);
}
async function sheet(label){
 const packet=results.packets.find(p=>p.label.startsWith(label));
 const parts=[{input:band([packet.label+' — one gpt-image-2 (high) image per plan; only the plan differs',`Source job ${packet.sourceJobId} · no review or correction pass · ₹ are estimates at ${results.fx.usdToInr} INR/USD (${results.fx.rateDate})`],W,HEAD,{bg:'#20242a',size:32}).toString().replace(/#111/g,'#fff').replace(/#444/g,'#cfd3d8'),top:0,left:0}];
 let y=HEAD+GAP;
 for(const m of MODELS){
  const run=packet.runs[m],img=images.results.find(r=>r.label===label&&r.planModel===run.model);
  const headline=run.summary.pages[0].copy.find(c=>/^headline:/.test(c))?.replace(/^headline:\s*/,'').replace(/\s*\n\s*/g,' ')||'(no headline)';
  parts.push({input:band([`${run.model} (${run.reasoningEffort}) — “${headline}”`,`Plan: ${Math.round(run.seconds)} s, ₹${run.inr.toFixed(2)}${run.firstAttemptValid?'':' (needed one repair)'} · Image: ${Math.round(img.seconds)} s, ₹${img.inr.toFixed(2)}${img.earlierTransportFailure?' (2nd send; 1st upload dropped, charge unknown)':''}`],W,BAND),top:y,left:0});
  y+=BAND;parts.push({input:path.join(root,img.image),top:y,left:0});y+=592+GAP;
 }
 parts[0].input=Buffer.from(parts[0].input);
 const file=path.join(IMAGES,label+'-sheet.png');
 await sharp({create:{width:W,height:y,channels:3,background:'#ffffff'}}).composite(parts).png({compressionLevel:9}).toFile(file);
 return file;
}
(async()=>{
 const files=[];for(const l of ['D2','S3'])files.push(await sheet(l));
 const width=1200,scaled=await Promise.all(files.map(f=>sharp(f).resize({width}).png().toBuffer({resolveWithObject:true})));
 const height=scaled.reduce((n,s)=>n+s.info.height,0)+24;
 const all=path.join(IMAGES,'all-sheet.png');
 await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite([{input:scaled[0].data,top:0,left:0},{input:scaled[1].data,top:scaled[0].info.height+24,left:0}]).png({palette:true,quality:90,compressionLevel:9}).toFile(all);
 for(const f of [...files,all])console.log(path.relative(root,f),(fs.statSync(f).size/1048576).toFixed(2)+' MB');
})().catch(e=>{console.error(e);process.exitCode=1;});
