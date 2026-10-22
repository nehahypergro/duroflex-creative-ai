'use strict';
// Saved provider envelopes through the current shared implementation. Transport
// is mocked by the replay runner; this never generates artwork or spends credits.
const {run}=require('./qa-recorded-provider');
const fixtures=[{brand:'Duroflex',jobId:'creative-8e57a041-f219-4be2-afce-15a7a97f4b3a'},{brand:'Sleepyhead',jobId:'creative-0c9b259c-56af-4380-a33b-5f9e398d417f'}];
async function main(){
 const reports=[];
 for(const f of fixtures){process.stderr.write('Checking saved '+f.brand+' handoffs\n');const report=await run({scoped:true,jobIds:[f.jobId]});reports.push({brand:f.brand,...report});}
 return {createdAt:new Date().toISOString(),mode:'offline-both-brands',paidCalls:0,costINR:0,failedStages:reports.reduce((n,r)=>n+r.failedStages,0),reports};
}
if(require.main===module)main().then(r=>{console.log(JSON.stringify(r,null,2));if(r.failedStages)process.exitCode=1;}).catch(e=>{console.error('Both-brand regression incomplete: '+e.message);process.exitCode=1;});
module.exports={main,fixtures};
