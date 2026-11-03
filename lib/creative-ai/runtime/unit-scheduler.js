'use strict';
// Keep the same number of in-flight units, but refill each slot as soon as it frees.
// Carousel followers wait for their own concept's opening slide to settle so that
// decoration can attach its saved, reviewed style anchor. Failure stays a failure.
async function run(records,{limit,execute,carouselPlan}){
 if(!Number.isInteger(limit)||limit<1)throw Error('Output concurrency must be a positive integer');
 const key=r=>JSON.stringify([r.conceptId,r.placementId]),indices=new Map(records.map((r,i)=>[key(r),i]));
 if(indices.size!==records.length)throw Error('Duplicate output unit binding');
 const dependencies=new Map();
 for(const set of carouselPlan?.sets||[]){
  const anchor=indices.get(key({conceptId:set.conceptId,placementId:set.slides[0]?.placementId}));
  for(const slide of set.slides.slice(1)){
   const index=indices.get(key({conceptId:set.conceptId,placementId:slide.placementId}));
   if(index===undefined)continue;
   if(anchor===undefined)throw Error('Carousel opening output is missing from the schedule');
   if(index===anchor||dependencies.has(index))throw Error('Conflicting carousel output dependencies');
   dependencies.set(index,anchor);
  }
 }
 // Validate dependencies before any paid work can begin.
 for(const index of dependencies.keys()){
  const visited=new Set();let current=index;
  while(dependencies.has(current)){if(visited.has(current))throw Error('Cyclic carousel output dependencies');visited.add(current);current=dependencies.get(current);}
 }
 const results=new Array(records.length),pending=records.map((_,i)=>i);
 if(!pending.length)return results;
 return new Promise(resolve=>{
  let active=0;
  function pump(){
   while(active<limit){
    const position=pending.findIndex(i=>!dependencies.has(i)||results[dependencies.get(i)]!==undefined);
    if(position<0)break;
    const [index]=pending.splice(position,1);active++;
    Promise.resolve().then(()=>execute(records[index],index)).then(
     value=>{results[index]={status:'fulfilled',value};},
     reason=>{results[index]={status:'rejected',reason};}
    ).then(()=>{active--;pump();});
   }
   if(!active&&!pending.length)resolve(results);
  }
  pump();
 });
}
module.exports={run};
