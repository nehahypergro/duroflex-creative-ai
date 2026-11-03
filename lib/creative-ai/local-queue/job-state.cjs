'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {withLock}=require('../runtime/file-lock');
// Update only orchestration metadata; retain raw raster references and all budgets.
async function interrupted(root,id,state,reason){if(!id||!/^creative-[a-z0-9-]+$/.test(id))return;
 const dir=path.join(root,'output/creative-ai/jobs',id);
 await withLock(path.join(dir,'.update.lock'),async()=>{let j;try{j=JSON.parse(await fs.readFile(path.join(dir,'job.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(!['running','queued','preparing'].includes(j.status))return;
 j.localExecution={...j.localExecution,status:state,reason,interruptedAt:new Date().toISOString()};j.status=state==='held'?'needs-input':'queued';j.stage=state==='held'?'needs-input':'recovering';j.activeStages=[];j.error=reason;
 const temp=path.join(dir,'job.json.'+crypto.randomUUID()+'.pending');await fs.writeFile(temp,JSON.stringify(j,null,2)+'\n');await fs.rename(temp,path.join(dir,'job.json'));
 });
}
module.exports={interrupted};
