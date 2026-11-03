'use strict';
// Read-only dataset inspection. No generation runtime, learning promotion or DB writes.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{fail}=require('./accounts');
const ID=/^feedback-[a-f0-9-]{36}$/,JOB=/^[a-zA-Z0-9_-]+$/;
function admin(actor){if(actor?.role!=='admin')throw fail('Administrator access required.',403);}
function base(requests,brand,job){if(!requests.brands.some(b=>b.id===brand)||!/^brand-[a-zA-Z0-9_-]+$/.test(brand)||!JOB.test(job))throw fail('Feedback not found.',404);return path.join(requests.root,'output/creative-ai/feedback',brand,job);}
async function children(dir){try{return await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}}
function valid(row,brand,job,id){return row?.id===id&&row.brandId===brand&&row.jobId===job&&['like','dislike'].includes(row.rating)&&typeof row.reason==='string'&&Number.isFinite(Date.parse(row.createdAt))&&/^[a-f0-9]{64}$/.test(row.artifactHash);}
async function read(requests,brand,job,id){if(!ID.test(id))throw fail('Feedback not found.',404);const dir=base(requests,brand,job),row=JSON.parse(await fs.readFile(path.join(dir,id+'.json'),'utf8'));if(!valid(row,brand,job,id))throw fail('Feedback identity does not match its saved record.',409);return row;}
async function list(requests,actor,params=new URLSearchParams()){
 admin(actor);const brand=params.get('brand')||'',rating=params.get('rating')||'',query=(params.get('q')||'').trim().slice(0,200).toLowerCase(),from=params.get('from')||'',to=params.get('to')||'',page=Number(params.get('page')||0),limit=24;
 if(brand&&!requests.brands.some(b=>b.id===brand)||rating&&!['like','dislike'].includes(rating)||!Number.isInteger(page)||page<0)throw fail('Choose valid feedback filters.');
 for(const value of [from,to])if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw fail('Choose valid feedback dates.');if(from&&to&&from>to)throw fail('The start date must precede the end date.');
 const rows=[];let unreadable=0;
 for(const b of requests.brands.filter(b=>!brand||b.id===brand)){
  const dir=path.join(requests.root,'output/creative-ai/feedback',b.id);
  for(const job of await children(dir)){if(!job.isDirectory()||!JOB.test(job.name))continue;
   for(const file of await children(path.join(dir,job.name))){if(!file.isFile()||!/^feedback-[a-f0-9-]{36}\.json$/.test(file.name))continue;
    try{const row=await read(requests,b.id,job.name,file.name.slice(0,-5)),day=new Date(Date.parse(row.createdAt)+330*60000).toISOString().slice(0,10);if(rating&&row.rating!==rating||from&&day<from||to&&day>to)continue;if(query&&!JSON.stringify([row.reason,row.jobId,row.placementId,row.productUrl,row.brief,b.name]).toLowerCase().includes(query))continue;
     rows.push({id:row.id,jobId:row.jobId,brandId:row.brandId,brand:b.name,rating:row.rating,reason:row.reason,createdAt:row.createdAt,route:row.route,placementId:row.placementId,creativeVersionId:row.creativeVersionId,editRevision:row.editRevision,width:row.width,height:row.height,artifactHash:row.artifactHash,brief:row.brief||null,trainingStatus:row.trainingStatus||'unreviewed',actor:row.actor?.attribution||'Not recorded',previewUrl:'/admin/api/creative-feedback/'+b.id+'/'+job.name+'/'+row.id+'/image'});
    }catch{unreadable++;}
   }
  }
 }
 rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
 return {items:rows.slice(page*limit,(page+1)*limit),total:rows.length,page,limit,brands:requests.brands.map(b=>({id:b.id,name:b.name})),metrics:{records:rows.length,likes:rows.filter(r=>r.rating==='like').length,dislikes:rows.filter(r=>r.rating==='dislike').length,creatives:new Set(rows.map(r=>[r.brandId,r.jobId,r.route,r.placementId,r.creativeVersionId,r.editRevision,r.artifactHash].join('|'))).size},warning:unreadable?unreadable+' unreadable feedback record(s) were omitted; saved files were not changed.':null,refreshedAt:new Date().toISOString()};
}
async function image(requests,actor,brand,job,id){admin(actor);const row=await read(requests,brand,job,id);if(!new RegExp('^'+id+'\\.(png|jpg|webp)$').test(row.imageSnapshot||''))throw fail('Feedback snapshot is unavailable.',404);const dir=base(requests,brand,job),file=path.join(dir,row.imageSnapshot),real=await fs.realpath(file);if(!real.startsWith(await fs.realpath(dir)+path.sep))throw fail('Feedback snapshot is unavailable.',404);const bytes=await fs.readFile(real);if(crypto.createHash('sha256').update(bytes).digest('hex')!==row.artifactHash)throw fail('The feedback snapshot changed. Preview was blocked.',409);return {bytes,mime:row.imageSnapshot.endsWith('.png')?'image/png':row.imageSnapshot.endsWith('.webp')?'image/webp':'image/jpeg'};}
module.exports={list,image};
