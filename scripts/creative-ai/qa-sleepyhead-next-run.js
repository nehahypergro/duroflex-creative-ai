#!/usr/bin/env node
'use strict';
const run=()=>require('./qa-brand-next-run').run({jobId:'creative-0c9b259c-56af-4380-a33b-5f9e398d417f',brandName:'Sleepyhead'});
if(require.main===module){global.fetch=async()=>{throw Error('External network forbidden during next-run QA');};run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={run};
