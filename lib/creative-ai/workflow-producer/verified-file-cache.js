'use strict';
const fs=require('node:fs/promises');
function stamp(s){return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');}
// ctime (not just user-restorable mtime) invalidates edited/replaced bytes.
// Full audits bypass this optimisation. Cache entries never persist across restart.
async function read(file,prior,{verifyAll=false}={}){
 for(let attempt=0;attempt<3;attempt++){
  const before=stamp(await fs.stat(file,{bigint:true}));
  if(!verifyAll&&prior?.stamp===before)return prior;
  const text=await fs.readFile(file,'utf8'),after=stamp(await fs.stat(file,{bigint:true}));
  if(before===after)return {stamp:after,text};
 }
 throw Error('Activity journal changed while reading; retry after the writer finishes.');
}
module.exports={read};
