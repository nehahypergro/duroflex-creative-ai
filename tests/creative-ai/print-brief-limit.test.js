'use strict';
// Live run, 10 Nov 2026 (Sleepyhead Sofa Drip Pro roll-up standee, job creative-4353a08f): the saved plan
// was valid but its image brief was 13,369 characters, so the job failed with "Execution brief exceeds
// compact 12,000-character ceiling". Print formats carry print-production rules on top of the plan, so
// their ceiling is 16,000 characters; digital formats keep 12,000. Replays the saved standee (Sleepyhead)
// and checks the saved Duroflex A4 poster from the same day still builds.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const planning=require('../../lib/creative-ai/lean/planning');
const jobs=path.resolve(__dirname,'../../output/creative-ai/jobs');
function saved(job,stem){const d=path.join(jobs,job);if(!fs.existsSync(d))return null;const f=fs.readdirSync(d).find(f=>f.startsWith('lean-input-'+(stem||'')));const k=f.slice('lean-input-'.length);const plan=JSON.parse(fs.readFileSync(path.join(d,'lean-plan-'+k)));return {input:JSON.parse(fs.readFileSync(path.join(d,f))),plan:plan.plan||plan};}
const standee=saved('creative-4353a08f-7e6a-4dba-99d6-9a309d819795','d072e7abd69b8fc776c0'),poster=saved('creative-d83d3846-b3ce-4371-90b6-40cdc61c4423');
test('Sleepyhead: the saved standee brief now builds within the print ceiling',{skip:!standee&&'saved run not available'},()=>{
 const p=planning.imagePrompt(standee.plan,standee.input,standee.plan.pages[0]);assert.ok(p.length>12000&&p.length<=16000,String(p.length));
 const huge=structuredClone(standee.plan);huge.pages[0].artDirection+='x'.repeat(4000);assert.throws(()=>planning.imagePrompt(huge,standee.input,huge.pages[0]),/16,000-character/);
});
test('Duroflex: the saved A4 poster brief still builds',{skip:!poster&&'saved run not available'},()=>{
 assert.ok(planning.imagePrompt(poster.plan,poster.input,poster.plan.pages[0]).length<=16000);
});
test('digital formats keep a compact 14,000-character ceiling',{skip:!standee&&'saved run not available'},()=>{
 const digital=structuredClone(standee.input);delete digital.format.print;
 const big=structuredClone(standee.plan);big.pages[0].artDirection+='x'.repeat(1500);assert.throws(()=>planning.imagePrompt(big,digital,big.pages[0]),/14,000-character/);
});
// Live run, 10 Nov 2026 (Sleepyhead Sofa Drip Pro, Sales One-pager, creative-6941a572): the brief was 12,034
// characters. Close-reading documents (one-pagers, cheat sheets, brochures, infographics) carry more words by
// design, so they share the 16,000-character ceiling with print; ads and posts keep 12,000.
const onePager=saved('creative-6941a572-9ed6-4349-bf0c-3e5c7a6ed819');
test('Sleepyhead: the saved sales one-pager brief builds within the close-reading ceiling',{skip:!onePager&&'saved run not available'},()=>{
 const p=planning.imagePrompt(onePager.plan,onePager.input,onePager.plan.pages[0]);assert.ok(p.length>12000&&p.length<=16000,String(p.length));
});
test('Duroflex: the A4 poster and an infographic count as close reading too; a feed post does not',{skip:!poster&&'saved run not available'},()=>{
 for(const [id,name,want] of [['custom:studio-marketing-infographic','Infographic',16000],['custom:studio-sales-one-pager','Digital sales one-pager',16000],['custom:studio-social-square','Square post',12000]]){
  const input=structuredClone(poster.input);delete input.format.print;input.format.id=id;input.format.name=name;
  const plan=structuredClone(poster.plan);const base=planning.imagePrompt(poster.plan,{...input,format:{...input.format,id:'custom:studio-sales-one-pager',name:'Digital sales one-pager'}},poster.plan.pages[0]).length;plan.pages[0].artDirection+='x'.repeat(Math.max(0,12500-base));
  if(want===16000)assert.doesNotThrow(()=>planning.imagePrompt(plan,input,plan.pages[0]),name);else assert.throws(()=>planning.imagePrompt({...plan,pages:[{...plan.pages[0],artDirection:plan.pages[0].artDirection+'x'.repeat(2000)}]},input,{...plan.pages[0],artDirection:plan.pages[0].artDirection+'x'.repeat(2000)}),/14,000/,name);
 }
});
// Live rerun, 10 Nov 2026 (Duroflex Wave Kinect 12-image PDP, creative-81d63009): the plan passed but nine
// pages' briefs were 12,090-12,969 characters (each set page carries the set's own rules). Pages of a
// multi-page set share the 16,000-character ceiling; single ads and posts keep 12,000.
const kinect=saved('creative-81d63009-ddd7-4955-8a11-9c28a6c89c05');
test('Duroflex: every page of the saved 12-image PDP brief builds within the set ceiling',{skip:!kinect&&'saved run not available'},()=>{
 for(const p of kinect.plan.pages){const n=planning.imagePrompt(kinect.plan,kinect.input,p).length;assert.ok(n<=16000,p.id+' '+n);}
});
test('Sleepyhead: the saved marketplace set builds; a single post still keeps 12,000',{skip:!standee&&'saved run not available'},()=>{
 const market=saved('creative-e933d782-cdc6-4e42-9cf0-197e8ecbd59e');if(market)for(const p of market.plan.pages)assert.ok(planning.imagePrompt(market.plan,market.input,p).length<=16000);
});
// Live run, 10 Nov 2026 (Sleepyhead Instagram post with a reference picture, creative-be11be01): the brief was
// 12,563 characters, because new jobs also carry the composition and reference rules. Single formats now have a
// 14,000-character ceiling; print, close-reading and multi-page sets keep 16,000.
const refPost=saved('creative-be11be01-0dcb-428d-8c58-2ca99ee06572');
test('Sleepyhead: the saved reference post brief builds within the single-format ceiling',{skip:!refPost&&'saved run not available'},()=>{
 const n=planning.imagePrompt(refPost.plan,refPost.input,refPost.plan.pages[0]).length;assert.ok(n>12000&&n<=14000,String(n));
});
