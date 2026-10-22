'use strict';
// Explicit media transfer only. No creative/model calls and no JSON/receipt upload.
const fs=require('fs/promises'),path=require('path'),cdn=require('../../lib/creative-ai/runtime/cdn-media');
const root=path.resolve(__dirname,'../..'),args=new Set(process.argv.slice(2));
async function main(){const files=[];async function walk(dir){let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const e of entries){const file=path.join(dir,e.name);if(e.isDirectory())await walk(file);else if(e.isFile()&&cdn.scope(file)&&(!args.has('--videos')||/\.(mp4|mov|webm)$/i.test(file))){const stat=await fs.stat(file);if(stat.size)files.push({file,bytes:stat.size});}}}
 for(const kind of ['brands','jobs'])await walk(path.join(root,'output/creative-ai',kind));
 if(!args.has('--apply')){console.log(JSON.stringify({mode:'preview',files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),videos:files.filter(f=>/\.(mp4|mov|webm)$/i.test(f.file)).length}));return;}
 const result={startedAt:new Date().toISOString(),uploaded:0,failed:[],bytes:0};
 let next=0,done=0;await Promise.all(Array.from({length:4},async()=>{while(next<files.length){const f=files[next++];try{const receipt=await cdn.publish(f.file,{evictVideo:args.has('--evict-videos')});if(!receipt)throw Error('CDN storage is disabled');result.uploaded++;result.bytes+=f.bytes;}catch(e){result.failed.push({file:path.relative(root,f.file),error:e.message});}done++;if(done%25===0)console.log(JSON.stringify({progress:done,total:files.length,failed:result.failed.length}));}}));
 result.completedAt=new Date().toISOString();await fs.mkdir(path.join(root,'output/media-storage'),{recursive:true});await fs.writeFile(path.join(root,'output/media-storage/migration-'+Date.now()+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.failed.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
