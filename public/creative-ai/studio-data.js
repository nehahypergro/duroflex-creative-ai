'use strict';
window.StudioData = (() => {
  async function responseJson(response,{allowError=false}={}) {
    let value;try{value=await response.json();}catch{throw Object.assign(Error(response.status===413?'This upload is too large. Choose a smaller file.':'The server returned an unreadable response. Your saved work is preserved; try again.'),{status:response.status});}
    if(!response.ok&&!allowError)throw Object.assign(Error(value?.error||'The request could not finish. Your saved work is preserved.'),{status:response.status,code:value?.code,clientCode:value?.clientCode,reference:value?.reference});
    return value;
  }
  async function get(path,{signal,timeout=20000}={}) {
    const controller=new AbortController(),abort=()=>controller.abort();
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,timeout);
    try{const response=await fetch('/creative-ai/api/'+path,{cache:'no-store',signal:controller.signal});
      return await responseJson(response);
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
  // Creative reference v1 (10 Nov 2026): studio.js adds the chosen reference picture (kept on this device)
  // to the brief just before readiness and generation, so saved drafts stay small.
  let augmentDraft=async d=>d;
  // For a minute after any change sent from this page (Re-run check, Continue, a restart …), every project or design
  // opened is read again: the work it started may still be changing the project (23 Nov 2026).
  async function post(path,body) {try{const response=await fetch('/creative-ai/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return await responseJson(response);}finally{changedAt=Date.now();confirmed.clear();}}
  async function designDetails(job,id,signal){
    if(!job.results.some(r=>r.imageUrl))return;
    try{const data=await get('jobs/'+encodeURIComponent(id)+'/details',{signal});if(!Array.isArray(data.units))throw Error('Saved design details are unavailable.');job.designDetails=data;}
    catch(e){if(signal?.aborted)return;job.designDetailsError='Saved design details could not load.';}
  }
  const fingerprints=new Map(),cache=new Map(),workspaces=new Map(),workspaceLoads=new Map(),projectLoads=new Map();
  let version=0;
  // Clicks re-read nothing new (23 Nov 2026, live speed check: opening a project made 3 requests and a design 4, every
  // time, even right after the list had loaded it). A finished project that the server confirmed in the last minute
  // (by the list's freshness stamp or by its own read) is used as it is; a running one is always read again, and any
  // save or clear starts over (version).
  const SETTLED_MS=60000,confirmed=new Map();let changedAt=-Infinity;
  function confirm(key){confirmed.set(key,{at:Date.now(),version});}
  function settled(key){const job=cache.get(key),seen=confirmed.get(key);return !!(job&&seen&&seen.version===version&&Date.now()-seen.at<SETTLED_MS&&Date.now()-changedAt>=SETTLED_MS&&!['queued','preparing','running'].includes(job.status)&&!job.loadError&&!job.editLookupFailed&&!(job.componentRecovery?.repairing>0));}
  const diskPrefix='creative-ai-workspace-v2:';
  function disk(action,key,value){return new Promise(done=>{let finished=false;const timer=setTimeout(()=>resolve(null),1500),resolve=value=>{if(finished)return;finished=true;clearTimeout(timer);done(value);};try{const request=indexedDB.open(window.CreativeAccount?.cacheName||'creative-ai-workspace-cache',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);request.onsuccess=()=>{const db=request.result;if(finished){db.close();return;}const tx=db.transaction('snapshots',action==='get'?'readonly':'readwrite'),store=tx.objectStore('snapshots'),r=action==='get'?store.get(key):action==='put'?store.put(value,key):action==='delete'?store.delete(key):store.clear();r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();};}catch{resolve(null);}});}
  function persist(brandId,snapshot){disk('put',brandId,{...snapshot,brandId,visibilityVersion:1});try{const text=JSON.stringify({...snapshot,brandId,visibilityVersion:1});if(text.length<3500000)(window.CreativeAccount?.sessionStorage||window.sessionStorage).setItem(diskPrefix+brandId,text);}catch{/* Storage is optional; live loading remains available. */}}
  function forget(brandId){disk('delete',brandId);try{(window.CreativeAccount?.sessionStorage||window.sessionStorage).removeItem(diskPrefix+brandId);}catch{}}
  function restore(brandId){
    if(workspaces.has(brandId))return workspaces.get(brandId);
    try{const saved=JSON.parse((window.CreativeAccount?.sessionStorage||window.sessionStorage).getItem(diskPrefix+brandId)||'null');
      if(!saved)return;
      if(saved?.visibilityVersion!==1||saved?.brandId!==brandId||Date.now()-saved.at>1800000||!Array.isArray(saved.value)||saved.value.length!==3||!saved.value.every(r=>r.status==='fulfilled')||!saved.value[0].value.projects.every(p=>p.brandId===brandId)){forget(brandId);return;}
      // Restored snapshots paint immediately but always refresh in the background.
      saved.at=0;workspaces.set(brandId,saved);return saved;
    }catch{return;}
  }
  // 18 Nov 2026 (Neha: "cant it be in cache"): the product list is kept in this browser for 7 days, per brand and
  // signed-in account. A kept list is used at once and refreshed from the server in the background; the fresh list
  // replaces it (and the saved workspace copy) and is announced with the 'studio:products' event. Every kept product
  // must belong to the brand it is kept for, or the copy is not used.
  const PRODUCT_KEEP_MS=7*24*3600*1000,productKey=id=>'products:'+id,productRefresh=new Map();
  const ownProducts=(brandId,rows)=>Array.isArray(rows)&&rows.every(p=>p?.brandId===brandId);
  async function fetchProducts(brandId){const rows=await get('brands/'+encodeURIComponent(brandId)+'/products?view=studio',{timeout:60000});if(ownProducts(brandId,rows))await disk('put',productKey(brandId),{brandId,at:Date.now(),rows});return rows;}
  async function keptProducts(brandId){const saved=await disk('get',productKey(brandId));return saved?.brandId===brandId&&Date.now()-saved.at<PRODUCT_KEEP_MS&&ownProducts(brandId,saved.rows)?saved.rows:null;}
  function refreshProducts(brandId,kept){if(productRefresh.has(brandId))return productRefresh.get(brandId);const started=version;const r=fetchProducts(brandId).then(rows=>{if(started!==version)return;
    // Same products as the kept copy (readiness check times aside): nothing to redraw, so an open picker is left alone.
    const same=(a,b)=>JSON.stringify(a,(k,v)=>k==='checkedAt'?undefined:v)===JSON.stringify(b,(k,v)=>k==='checkedAt'?undefined:v);if(kept&&same(kept,rows))return;const snap=workspaces.get(brandId);if(snap?.value?.[1]?.status==='fulfilled'){snap.value[1]={status:'fulfilled',value:rows};persist(brandId,snap);}window.dispatchEvent(new CustomEvent('studio:products',{detail:{brandId,rows}}));},()=>{}).finally(()=>productRefresh.delete(brandId));productRefresh.set(brandId,r);return r;}
  return {
    responseJson,
    get version(){return version;},
    async restoreWorkspace(brandId){if(restore(brandId))return;const started=version,saved=await disk('get',brandId);if(started!==version)return;if(saved?.visibilityVersion===1&&saved?.brandId===brandId&&Date.now()-saved.at<1800000&&saved.value?.length===3&&saved.value.every(r=>r.status==='fulfilled')&&saved.value[0].value.projects.every(p=>p.brandId===brandId)){saved.at=0;workspaces.set(brandId,saved);}},
    peekWorkspace:brandId=>restore(brandId)?.value,
    // The other brand is warmed only when this tab has no copy of it yet (23 Nov 2026, live speed check: switching
    // brand also re-read the brand just left, 3 of 7 requests). A brand with a copy opens from it at once and is
    // refreshed when it is opened, as before.
    warmWorkspace(brandId){return restore(brandId)?Promise.resolve(null):this.workspace(brandId);},
    invalidateWorkspace(brandId){version++;forget(brandId);workspaces.delete(brandId);workspaceLoads.delete(brandId);for(const key of cache.keys())if(key.startsWith(brandId+':'))cache.delete(key);},
    async workspace(brandId,{onLibrary,onProjects}={}){
      const saved=restore(brandId);
      if(saved&&Date.now()-saved.at<30000)return saved.value;
      if(workspaceLoads.has(brandId))return workspaceLoads.get(brandId);
      const started=version;
      const productLoad=this.products(brandId),assetLoad=this.assets(brandId);
      if(onLibrary)Promise.allSettled([productLoad,assetLoad]).then(rows=>{if(started===version)onLibrary(rows);}).catch(()=>{});
      const pending=Promise.allSettled([this.projects(brandId,!!saved,{onPartial:rows=>{if(started===version)onProjects?.(rows);}}),productLoad,assetLoad]).then(value=>{
        // Cache complete snapshots only; failed reads must remain retryable.
        if(started===version&&value.every(r=>r.status==='fulfilled')&&!value[0].value.errors.length){const snapshot={at:Date.now(),value};workspaces.set(brandId,snapshot);persist(brandId,snapshot);}
        return value;
      }).finally(()=>{if(workspaceLoads.get(brandId)===pending)workspaceLoads.delete(brandId);});
      workspaceLoads.set(brandId,pending);return pending;
    },
    brands:()=>get('brands'),
    resumePreview:id=>get('jobs/'+encodeURIComponent(id)+'/resume-work').catch(e=>{if(e.status===404)return null;throw e;}),
    reconcileImages:(id,input)=>post('jobs/'+encodeURIComponent(id)+'/reconcile-images',input),
    resumeWork:(id,input)=>post('jobs/'+encodeURIComponent(id)+'/resume-work',input),
    restartPreview:id=>get('jobs/'+encodeURIComponent(id)+'/restart'),
    restart:(id,input)=>post('jobs/'+encodeURIComponent(id)+'/restart',input),
    preflight:async draft=>post('studio/preflight',{draft:await augmentDraft(draft)}),
    generate:async(draft,token)=>post('studio/generate',{draft:await augmentDraft(draft),token}),
    setDraftAugmenter(fn){augmentDraft=typeof fn==='function'?fn:async d=>d;},
    // Resolve only metadata already accessible through the authenticated jobs index.
    // Never fetch an unlisted project's private detail to guess its owner or visibility.
    async projectLocation(id){const jobs=await get('jobs');const row=jobs.find(j=>j.id===id);return row?{brandId:row.brandId||row.intake?.brandId}:null;},
    // 18 Nov 2026 (Neha: opening the Studio and switching brands was slow; Duroflex has 61 projects, 183 requests,
    // about 9 s on the hosted Studio): newest projects load first, eight at a time; once the newest 12 (or all, if
    // fewer) are ready, onPartial shows them while the rest load. Design details (rationale and scores, used only on
    // a design's own page, which loads them itself if missing) are fetched in the background after the list.
    // 21 Nov 2026 (speed review): the page asked for every project and its saved edits one by one (about 230
    // requests per load, and again on each status refresh). Now: the short list (with each project's freshness),
    // then ONE request for the projects that are new or changed (in groups of 100), with their saved edits.
    // Unchanged projects come from memory. A server without the bulk route falls back to projectsOneByOne.
    // Calls that overlap (start-up and the status refresh) share one load instead of fetching the projects twice.
    projects(brandId,fresh=false,options={}){
      const running=projectLoads.get(brandId);if(running&&running.version===version)return running.promise;
      const promise=this.loadProjects(brandId,fresh,options).finally(()=>{if(projectLoads.get(brandId)?.promise===promise)projectLoads.delete(brandId);});
      projectLoads.set(brandId,{version,promise});return promise;
    },
    async loadProjects(brandId,fresh=false,options={}){
      const started=version,all=await get('jobs?brandId='+encodeURIComponent(brandId)),stamp=j=>String(j.updatedAt||j.createdAt||''),jobs=all.filter(j=>j.brandId===brandId).sort((a,b)=>stamp(b).localeCompare(stamp(a)));
      const changed=jobs.filter(j=>{const key=brandId+':'+j.id,previous=cache.get(key);return !(j.freshness&&fingerprints.get(key)===j.freshness&&previous&&!previous.editLookupFailed);});
      const fetched=new Map();
      for(let i=0;i<changed.length;i+=100){const ids=changed.slice(i,i+100).map(j=>j.id);let bulk=null;
        try{bulk=await get('jobs?brandId='+encodeURIComponent(brandId)+'&include=projects&ids='+ids.join(','),{timeout:60000});if(bulk?.version!==1||bulk.brandId!==brandId||!Array.isArray(bulk.projects))bulk=null;}catch(e){if(e?.status&&e.status!==404)throw e;bulk=null;}
        if(!bulk)return this.projectsOneByOne(brandId,fresh,options);
        for(const v of bulk.projects)fetched.set(v.id,v);}
      const projects=jobs.map(j=>{const key=brandId+':'+j.id,v=fetched.get(j.id);
        if(!v){const previous=cache.get(key);if(previous&&started===version)confirm(key);return previous||{...j,brandId,local:false,name:'Project temporarily unavailable',updatedAt:j.createdAt,results:[],loadError:'This project could not load.',status:'unavailable'};}
        if(v.loadError)return {...j,...v,brandId,local:false,name:'Project temporarily unavailable',results:[],status:'unavailable'};
        const {edits,editLookupFailed,...view}=v,job=StudioModel.normalizeJob(view,brandId);
        if(Array.isArray(edits)){job.results=job.results.map(r=>({...r,latestEdit:edits.find(e=>e.route===r.route&&e.placementId===r.placementId&&(!e.sourceImageUrl||e.sourceImageUrl===r.imageUrl))||null}));job.updatedAt=[job.updatedAt,...edits.map(e=>e.updatedAt)].filter(Boolean).sort().at(-1);}else job.editLookupFailed=true;
        const previous=cache.get(key);if(previous?.designDetails&&!job.designDetails)job.designDetails=previous.designDetails;
        if(started===version){cache.set(key,job);confirm(key);if(j.freshness)fingerprints.set(key,j.freshness);}return job;});
      const result={projects,errors:projects.filter(p=>p.loadError).map(p=>({item:p,error:p.loadError}))};
      const saved=workspaces.get(brandId);if(started===version&&saved&&!result.errors.length)saved.value[0]={status:'fulfilled',value:result};
      return result;
    },
    async projectsOneByOne(brandId,fresh=false,{onPartial}={}){
      const started=version,all=await get('jobs'),stamp=j=>String(j.updatedAt||j.createdAt||''),jobs=all.filter(j=>j.brandId===brandId).sort((a,b)=>stamp(b).localeCompare(stamp(a)));
      const FIRST=Math.min(12,jobs.length),done=new Array(jobs.length);let firstDone=0,partialSent=false;
      const values=await mapLimit(jobs,async j=>{const i=jobs.indexOf(j);try{const key=brandId+':'+j.id,previous=cache.get(key),unchanged=j.freshness&&fingerprints.get(key)===j.freshness&&previous&&!previous.editLookupFailed&&!previous.designDetailsError;const project=await this.project(j.id,brandId,(fresh||!!j.freshness)&&!unchanged,{details:false});if(started===version&&j.freshness)fingerprints.set(key,j.freshness);done[i]=project;return project;}
        finally{if(i<FIRST)firstDone++;if(!partialSent&&firstDone===FIRST&&FIRST<jobs.length&&onPartial&&started===version){partialSent=true;try{onPartial({projects:done.filter(Boolean),errors:[],partial:{loaded:done.filter(Boolean).length,total:jobs.length}});}catch{}}}},8);
      const result={projects:values.map(v=>v.value||{
        ...v.item,brandId,local:false,name:'Project temporarily unavailable',
        updatedAt:v.item.createdAt,results:[],loadError:v.error,status:'unavailable'
      }),errors:values.filter(v=>v.error)};
      const saved=workspaces.get(brandId);if(started===version&&saved&&!result.errors.length)saved.value[0]={status:'fulfilled',value:result};
      return result;
    },
    // Design details (rationale and scores) are shown nowhere since the rationale panel was removed, so a project
    // read no longer fetches them (23 Nov 2026); details() still reads them on request.
    async project(id,brandId,fresh=false,{details=false}={}){
      const k=brandId+':'+id,started=version;if(!fresh&&cache.has(k))return cache.get(k);
      const job=StudioModel.normalizeJob(await get('jobs/'+encodeURIComponent(id)),brandId);
      const detailsReady=details?designDetails(job,id):Promise.resolve();
      try{const edits=await get('jobs/'+encodeURIComponent(id)+'/edits');if(!Array.isArray(edits))throw Error('Invalid saved edits');job.results=job.results.map(r=>({...r,latestEdit:edits.find(e=>e.route===r.route&&e.placementId===r.placementId&&(!e.sourceImageUrl||e.sourceImageUrl===r.imageUrl))||null}));job.updatedAt=[job.updatedAt,...edits.map(e=>e.updatedAt)].filter(Boolean).sort().at(-1);}catch{job.editLookupFailed=true;}
      await detailsReady;if(started===version){cache.set(k,job);confirm(k);}return job;
    },
    async details(id,brandId){await this.project(id,brandId);return get('jobs/'+encodeURIComponent(id)+'/details');},
    async progress(id,brandId,signal,{force=false}={}){
      const started=version,key=brandId+':'+id;if(!force&&settled(key))return cache.get(key);
      const job=StudioModel.normalizeJob(await get('jobs/'+encodeURIComponent(id),{signal}),brandId);
      if(!['queued','preparing','running'].includes(job.status))try{const edits=await get('jobs/'+encodeURIComponent(id)+'/edits',{signal});if(!Array.isArray(edits))throw Error('Invalid saved edits');job.results=job.results.map(r=>({...r,latestEdit:edits.find(e=>e.route===r.route&&e.placementId===r.placementId&&(!e.sourceImageUrl||e.sourceImageUrl===r.imageUrl))||null}));job.updatedAt=[job.updatedAt,...edits.map(e=>e.updatedAt)].filter(Boolean).sort().at(-1);}catch(e){if(signal?.aborted)throw e;job.editLookupFailed=true;}
      if(started===version&&!signal?.aborted){cache.set(key,job);confirm(key);const saved=workspaces.get(brandId);if(saved)saved.value[0].value.projects=saved.value[0].value.projects.map(p=>p.id===id?job:p);}
      return job;
    },
    resumePdp:id=>post('jobs/'+encodeURIComponent(id)+'/pdp/resume',{}),
    componentRepairPlan:(id,scope)=>get('jobs/'+encodeURIComponent(id)+'/component-recovery?route='+encodeURIComponent(scope.route)+'&placementId='+encodeURIComponent(scope.placementId)),
    componentRepair:(id,input)=>post('jobs/'+encodeURIComponent(id)+'/component-recovery',input),
    retryImageChecks:(id,scope)=>post('jobs/'+encodeURIComponent(id)+'/retry-checks',scope),leanRecheck:(id,body)=>post('jobs/'+encodeURIComponent(id)+'/lean-recheck',body),
    // 18 Nov 2026: a large product list may take longer than other reads; give it a minute before giving up.
    async products(brandId){const kept=await keptProducts(brandId);if(!kept)return fetchProducts(brandId);void refreshProducts(brandId,kept);return kept;},
    freshProducts:fetchProducts,
    // One small paid reasoning call; the result only fills the appreciation page for confirmation.
    readBrief:(brand,body)=>post('brands/'+encodeURIComponent(brand.id)+'/brief-read',{...body,brandName:brand.name}),
    async saveProduct(brand,url,refresh=false){const result=await post('brands/'+encodeURIComponent(brand.id)+'/products',{brandName:brand.name,url,refresh});productRefresh.delete(brand.id);await disk('delete',productKey(brand.id));this.invalidateWorkspace(brand.id);return result;},
    assets:brandId=>get('brands/'+encodeURIComponent(brandId)+'/assets'),
    product:(brandId,id)=>get('brands/'+encodeURIComponent(brandId)+'/products/'+encodeURIComponent(id)),
    rebuildPrint:(id,body)=>post('jobs/'+encodeURIComponent(id)+'/print-proofs/rebuild',body),
    deliveryCandidates:id=>get('jobs/'+encodeURIComponent(id)+'/delivery-packages'),
    packageSet:(id,body)=>post('jobs/'+encodeURIComponent(id)+'/delivery-packages',body),
    costs:()=>get('costs'),
    clear(){version++;disk('clear');cache.clear();fingerprints.clear();confirmed.clear();try{for(let i=(window.CreativeAccount?.sessionStorage||window.sessionStorage).length-1;i>=0;i--){const k=(window.CreativeAccount?.sessionStorage||window.sessionStorage).key(i);if(k?.startsWith(diskPrefix))(window.CreativeAccount?.sessionStorage||window.sessionStorage).removeItem(k);}}catch{}workspaces.clear();workspaceLoads.clear();}
  };
})();
