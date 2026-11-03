'use strict';
// Plan independently; dispatch ready outputs without a global planning barrier.
// All output identities and carousel dependencies are validated before starting.
async function run(groups,{planningLimit=2,unitLimit=2,prepare,execute,carouselPlan,prerequisite}){
 for(const n of [planningLimit,unitLimit])if(!Number.isInteger(n)||n<1||n>16)throw Error('Invalid pipeline concurrency');
 const key=u=>JSON.stringify([u.conceptId,u.placementId]),units=groups.flatMap(g=>g.units),index=new Map(units.map((u,i)=>[key(u),i]));
 if(index.size!==units.length||new Set(groups.map(g=>g.id)).size!==groups.length)throw Error('Duplicate pipeline identity');
 const dependencies=new Map();for(const set of carouselPlan?.sets||[]){const anchor=index.get(key({conceptId:set.conceptId,placementId:set.slides[0]?.placementId}));for(const s of set.slides.slice(1)){const i=index.get(key({conceptId:set.conceptId,placementId:s.placementId}));if(i===undefined)continue;if(anchor===undefined||i===anchor||dependencies.has(i))throw Error('Invalid carousel dependency');dependencies.set(i,anchor);}}
 for(const i of dependencies.keys()){let n=i;const seen=new Set();while(dependencies.has(n)){if(seen.has(n))throw Error('Cyclic pipeline dependency');seen.add(n);n=dependencies.get(n);}}
 const results=Array(units.length),ready=new Map();let pendingPrerequisites=prerequisite?groups.length:0,planning=0,executing=0;const available=prerequisite?[]:[...groups];
 if(!units.length)return results;
 return new Promise(resolve=>{
 function pump(){
  while(available.length&&planning<planningLimit){const group=available.shift();planning++;
   Promise.resolve().then(()=>prepare(group)).then(records=>{
    const expected=new Set(group.units.map(key));if(!Array.isArray(records)||records.length!==expected.size||new Set(records.map(key)).size!==expected.size||records.some(r=>!expected.has(key(r))))throw Error('Planning returned different output bindings');
    for(const record of records)ready.set(index.get(key(record)),record);
   }).catch(reason=>{for(const u of group.units)results[index.get(key(u))]={status:'rejected',reason,unit:u};}).finally(()=>{planning--;pump();});
  }
  while(executing<unitLimit){const entry=[...ready.entries()].find(([i])=>!dependencies.has(i)||results[dependencies.get(i)]!==undefined);if(!entry)break;const [i,record]=entry;ready.delete(i);executing++;
   Promise.resolve().then(()=>execute(record)).then(value=>{results[i]={status:'fulfilled',value,unit:units[i]};},reason=>{results[i]={status:'rejected',reason,unit:units[i]};}).finally(()=>{executing--;pump();});
  }
  if(!pendingPrerequisites&&!available.length&&!planning&&!executing&&!ready.size)resolve(results);
 }
 if(prerequisite)for(const group of groups)Promise.resolve().then(()=>prerequisite(group)).then(()=>available.push(group),reason=>{for(const u of group.units)results[index.get(key(u))]={status:'rejected',reason,unit:u};}).finally(()=>{pendingPrerequisites--;pump();});
 pump();
 });
}
module.exports={run};
