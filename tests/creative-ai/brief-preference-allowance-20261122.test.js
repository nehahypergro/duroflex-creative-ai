'use strict';
// Regression (22 Nov 2026, paid local brochure test). After the planner-ID fix, the Sleepyhead Original A4 bi-fold
// stopped with "Execution brief exceeds compact 19,000-character ceiling": its saved logo, wardrobe and room-look
// preferences (692 + 949 + 959 characters) go into every page's image brief, and the inside face came to 19,369.
// The limit now counts the planner's writing; applied brand preferences get their own allowance of at most 3,000
// characters. No paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const planning=require('../../lib/creative-ai/lean/planning');
const {fixture,square}=require('./lean-marketing-fixture');
const ceilingOf=(plan,input,page)=>{try{planning.imagePrompt(plan,input,page);}catch(e){const m=/exceeds compact ([\d,]+)-character/.exec(e.message);if(m)return Number(m[1].replace(/,/g,''));throw e;}return null;};
async function planned(t,brand){
 const f=await fixture(t,{brand,selection:[square(1)]});assert.equal(f.planError,null);
 const input=structuredClone(f.calls.find(c=>c.kind==='lean-planning').input);
 const name=(await fs.readdir(f.dir)).find(n=>/^lean-plan-/.test(n)),plan=JSON.parse(await fs.readFile(path.join(f.dir,name),'utf8'));
 return {input,plan,page:plan.pages[0]};
}
// Brand preferences the planner applied, as saved named-brand training (each at most 1,000 characters).
function withPreferences(input,plan,lengths){
 const prefs=lengths.map((n,i)=>({id:'preference-test-'+i,text:('Look rule '+i+': ').padEnd(n,'x')}));
 input.brand.preferences=[...input.brand.preferences,...prefs];plan.guidanceDecisions=[...plan.guidanceDecisions,...prefs.map(p=>({id:p.id,decision:'apply',reason:'Applied'}))];return prefs;
}
// Pad the planner's own creative direction so the brief sits just under its old ceiling.
function padTo(plan,input,page,target){
 const key=Object.keys(page).filter(k=>typeof page[k]==='string').sort((a,b)=>page[b].length-page[a].length)[0];
 const now=planning.imagePrompt(plan,input,page).length;page[key]=page[key]+' '+'y'.repeat(Math.max(0,target-now-1));return key;
}
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': saved look rules no longer push a brief over the limit',async t=>{
  const {input,plan,page}=await planned(t,brand);
  const base=ceilingOf({...plan,pages:plan.pages.map(p=>({...p}))},input,page)??(()=>{const big=structuredClone(plan);padTo(big,input,big.pages[0],60000);return ceilingOf(big,input,big.pages[0]);})();
  padTo(plan,input,page,base-500);assert.ok(planning.imagePrompt(plan,input,page).length<base,'just under the old limit');
  withPreferences(input,plan,[700,950,960]);
  const prompt=planning.imagePrompt(plan,input,page);
  assert.ok(prompt.length>base,'the saved rules take it past the old limit: '+prompt.length+' > '+base);
  assert.match(prompt,/Look rule 2: /,'every applied rule reaches the brief');
 });
 test(brand+': the planner\'s own writing is still limited, and the allowance stops at 3,000',async t=>{
  const {input,plan,page}=await planned(t,brand);
  const big=structuredClone(plan);padTo(big,input,big.pages[0],60000);const base=ceilingOf(big,input,big.pages[0]);
  padTo(plan,input,page,base+200);assert.throws(()=>planning.imagePrompt(plan,input,page),/exceeds compact/,'planner overflow still fails');
  const many=await planned(t,brand);withPreferences(many.input,many.plan,[1000,1000,1000,1000,1000]);
  const capped=structuredClone(many.plan);padTo(capped,many.input,capped.pages[0],60000);
  assert.equal(ceilingOf(capped,many.input,capped.pages[0]),base+3000,'never more than 3,000 extra');
 });
}
