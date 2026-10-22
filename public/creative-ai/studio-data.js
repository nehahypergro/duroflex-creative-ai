'use strict';
window.StudioData = (() => {
  async function get(path,{signal}={}) {
    const controller=new AbortController(),abort=()=>controller.abort();
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,20000);
    try{const response=await fetch('/creative-ai/api/'+path,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('Could not load saved work. Retry when the studio is available.');
      return await response.json();
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function mapLimit(items,task,limit=4) {
    const result=new Array(items.length);let next=0;
    await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
      while(next<items.length){
        const i=next++;
        try{result[i]={value:await task(items[i])};}
        catch(error){result[i]={error:error.message,item:items[i]};}
      }
    }));
    return result;
  }
  async function post(path,body) {const response=await fetch('/creative-ai/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json();if(!response.ok)throw Error(value.error||'The request could not finish. Your saved brief is preserved.');return value;}
  async function designDetails(job,id,signal){
    if(!job.results.some(r=>r.imageUrl))return;
    try{const data=await get('jobs/'+encodeURIComponent(id)+'/details',{signal});if(!Array.isArray(data.units))throw Error('Saved design details are unavailable.');job.designDetails=data;}
    catch(e){if(signal?.aborted)return;job.designDetailsError='Saved design details could not load.';}
  }
  const cache=new Map(),workspaces=new Map(),workspaceLoads=new Map();
  let version=0;
  return {
    get version(){return version;},
    peekWorkspace:brandId=>workspaces.get(brandId)?.value,
    invalidateWorkspace(brandId){version++;workspaces.delete(brandId);workspaceLoads.delete(brandId);},
    async workspace(brandId){
      const saved=workspaces.get(brandId);
      if(saved&&Date.now()-saved.at<30000)return saved.value;
      if(workspaceLoads.has(brandId))return workspaceLoads.get(brandId);
      const started=version;
      const pending=Promise.allSettled([this.projects(brandId,!!saved),this.products(brandId),this.assets(brandId)]).then(value=>{
        // Cache complete snapshots only; failed reads must remain retryable.
        if(started===version&&value.every(r=>r.status==='fulfilled')&&!value[0].value.errors.length)workspaces.set(brandId,{at:Date.now(),value});
        return value;
      }).finally(()=>{if(workspaceLoads.get(brandId)===pending)workspaceLoads.delete(brandId);});
      workspaceLoads.set(brandId,pending);return pending;
    },
    brands:()=>get('brands'),
    restartPreview:id=>get('jobs/'+encodeURIComponent(id)+'/restart'),
    restart:(id,input)=>post('jobs/'+encodeURIComponent(id)+'/restart',input),
    preflight:draft=>post('studio/preflight',{draft}),
    generate:(draft,token)=>post('studio/generate',{draft,token}),
    async projects(brandId,fresh=false){
      const started=version,all=await get('jobs'),jobs=all.filter(j=>j.brandId===brandId);
      const values=await mapLimit(jobs,j=>this.project(j.id,brandId,fresh));
      const result={projects:values.map(v=>v.value||{
        ...v.item,brandId,local:false,name:'Project temporarily unavailable',
        updatedAt:v.item.createdAt,results:[],loadError:v.error,status:'unavailable'
      }),errors:values.filter(v=>v.error)};
      const saved=workspaces.get(brandId);if(started===version&&saved&&!result.errors.length)saved.value[0]={status:'fulfilled',value:result};
      return result;
    },
    async project(id,brandId,fresh=false){
      const k=brandId+':'+id,started=version;if(!fresh&&cache.has(k))return cache.get(k);
      const job=StudioModel.normalizeJob(await get('jobs/'+encodeURIComponent(id)),brandId);
      const detailsReady=designDetails(job,id);
      try{const edits=await get('jobs/'+encodeURIComponent(id)+'/edits');if(!Array.isArray(edits))throw Error('Invalid saved edits');job.results=job.results.map(r=>({...r,latestEdit:edits.find(e=>e.route===r.route&&e.placementId===r.placementId&&(!e.sourceImageUrl||e.sourceImageUrl===r.imageUrl))||null}));job.updatedAt=[job.updatedAt,...edits.map(e=>e.updatedAt)].filter(Boolean).sort().at(-1);}catch{job.editLookupFailed=true;}
      await detailsReady;if(started===version)cache.set(k,job);return job;
    },
    async details(id,brandId){await this.project(id,brandId);return get('jobs/'+encodeURIComponent(id)+'/details');},
    async progress(id,brandId,signal){
      const started=version;
      const job=StudioModel.normalizeJob(await get('jobs/'+encodeURIComponent(id),{signal}),brandId);
      const detailsReady=designDetails(job,id,signal);
      if(!['queued','preparing','running'].includes(job.status))try{const edits=await get('jobs/'+encodeURIComponent(id)+'/edits',{signal});if(!Array.isArray(edits))throw Error('Invalid saved edits');job.results=job.results.map(r=>({...r,latestEdit:edits.find(e=>e.route===r.route&&e.placementId===r.placementId&&(!e.sourceImageUrl||e.sourceImageUrl===r.imageUrl))||null}));job.updatedAt=[job.updatedAt,...edits.map(e=>e.updatedAt)].filter(Boolean).sort().at(-1);}catch(e){if(signal?.aborted){await detailsReady;throw e;}job.editLookupFailed=true;}
      await detailsReady;
      if(started===version&&!signal?.aborted){cache.set(brandId+':'+id,job);const saved=workspaces.get(brandId);if(saved)saved.value[0].value.projects=saved.value[0].value.projects.map(p=>p.id===id?job:p);}
      return job;
    },
    products:brandId=>get('brands/'+encodeURIComponent(brandId)+'/products'),
    async saveProduct(brand,url,refresh=false){const result=await post('brands/'+encodeURIComponent(brand.id)+'/products',{brandName:brand.name,url,refresh});this.invalidateWorkspace(brand.id);return result;},
    assets:brandId=>get('brands/'+encodeURIComponent(brandId)+'/assets'),
    product:(brandId,id)=>get('brands/'+encodeURIComponent(brandId)+'/products/'+encodeURIComponent(id)),
    deliveryCandidates:id=>get('jobs/'+encodeURIComponent(id)+'/delivery-packages'),
    packageSet:(id,body)=>post('jobs/'+encodeURIComponent(id)+'/delivery-packages',body),
    costs:()=>get('costs'),
    clear(){version++;cache.clear();workspaces.clear();workspaceLoads.clear();}
  };
})();
