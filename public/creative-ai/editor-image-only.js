'use strict';
// Image editor for simplified (lean) designs (user request, 8 Nov 2026: "The AI editor needs to
// be the one that we had in the previous iteration, where you can annotate as well").
// It opens inside the editor dialog (#editableDialog) with the earlier editor's chat panel, in
// image-only mode: the saved artwork is the canvas, with no text-layer reconstruction.
// Pins with comments (user request, 9 Nov 2026: "i dont want box. just pins/comments that act as
// edits"): clicking the design drops a numbered pin and opens a comment box beside it. Each Send is
// ONE paid gpt-image-2 edit of the version in use, guided by the pin comments and an optional note;
// the server also shows the model a copy of the design with the numbered pins drawn on it.
// Results are saved as new versions, then get one product check (9 Nov 2026; never "Ready");
// nothing is selected until the user
// chooses "Use this version". Server: lib/creative-ai/runtime/lean-edits.js (/api/jobs/:id/ai-edits…).
export async function mount({root,context,session,isCurrent,close,onChange=()=>{}}){
 await import('/creative-ai/editor-chat-tools.js');const tools=window.EditorChatTools;
 for(const [attr,href] of [['editorChatStyle','/creative-ai/editor-chat.css'],['editorImageOnlyStyle','/creative-ai/editor-image-only.css']])if(!document.head.querySelector('link[data-'+attr.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']')){const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset[attr]='';document.head.append(link);await new Promise(resolve=>{link.onload=link.onerror=resolve;setTimeout(resolve,3000);});}
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=u=>typeof u==='string'&&/^\/creative-ai\/api\/jobs\/[a-zA-Z0-9_./-]+$/.test(u)&&!u.includes('..')?u:'';
 const inr=v=>'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:2});
 const running=s=>['queued','running','preparing'].includes(s);
 const base='/creative-ai/api/jobs/'+encodeURIComponent(context.jobId)+'/ai-edits',query='?'+new URLSearchParams({route:context.route,placementId:context.placementId,brandId:context.brandId});
 const W=context.width||1080,H=context.height||1080,MAX_PINS=12,MAX_COMMENT=300;
 // Pin areas (9 Nov 2026, "Yes, protect it"): only the square around each pin can change; the
 // server (edit-pins.js AREAS/areaOf) uses the same sizes and restores everything else exactly.
 const AREAS={small:0.16,medium:0.26,large:0.42},AREA_LABEL={small:'Small',medium:'Medium',large:'Large'};
 const areaOf=p=>{const s=AREAS[p.area]*Math.min(W,H),w=Math.min(1,s/W),h=Math.min(1,s/H);return {x:Math.max(0,Math.min(1-w,p.x-w/2)),y:Math.max(0,Math.min(1-h,p.y-h/2)),width:w,height:h};};
 function areaShare(){const n=120,grid=new Uint8Array(n*n);let count=0;for(const p of pins){const a=areaOf(p);for(let y=Math.floor(a.y*n);y<Math.min(n,Math.ceil((a.y+a.height)*n));y++)for(let x=Math.floor(a.x*n);x<Math.min(n,Math.ceil((a.x+a.width)*n));x++)if(!grid[y*n+x]){grid[y*n+x]=1;count++;}}return count/(n*n);}
 const tooBig=()=>areaShare()>.34;
 let disposed=false,list=null,viewing=null,pins=[],open=null,busy=false,timer=null,draft={requestKey:null,signature:''},sequence=0;
 // Edit areas v1 (10 Nov 2026): the server works out each pin's real area (whole text line, a larger area for
 // adding or replacing) for free; the screen shows exactly that area before Send.
 let adapted=[],areaTimer=null,areaTicket=0,confirmProduct=false;
 const pinKey=p=>JSON.stringify([p.x,p.y,p.area,p.comment.trim()]);
 const shownArea=(p,i)=>{const a=adapted[i];return a&&a.key===pinKey(p)?a.box:areaOf(p);};
 const BASIS={'text-block':'Whole text line','add-or-replace':'Larger area'};
 function refreshAreas(){clearTimeout(areaTimer);if(!pins.some(p=>p.comment.trim())){adapted=[];return;}areaTimer=setTimeout(async()=>{const ticket=++areaTicket,snapshot=pins.map(p=>({...p}));
  try{const out=await api('/areas',{route:context.route,placementId:context.placementId,brandId:context.brandId,sourceVersionId:activeId(),instruction:text.value.trim(),annotations:snapshot.map(p=>({type:'pin',x:p.x,y:p.y,area:p.area,...(p.comment.trim()?{comment:p.comment.trim()}:{})}))});
   if(!active()||ticket!==areaTicket)return;adapted=snapshot.map((p,i)=>{const a=out.areas.find(x=>x.number===i+1);return a?{key:pinKey(p),box:a.box,basis:a.basis}:null;});draw();pinList();}
  catch{/* the square is shown; the server works the area out again at Send */}},450);}
 const active=()=>!disposed&&root.open&&isCurrent(session);
 async function api(path,body){const controller=new AbortController(),t=setTimeout(()=>controller.abort(),30000);try{const r=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});let data;try{data=await r.json();}catch{throw Error('AI editing is unavailable right now. Retry in a moment.');}if(!r.ok)throw Object.assign(Error(data.error||'Something went wrong. Please retry.'),data.code?{code:data.code}:{});return data;}catch(e){if(e.name==='AbortError')throw Error('The Studio did not answer in time. Retry; a repeated Send is never charged twice.');throw e;}finally{clearTimeout(t);}}
 root.classList.add('ec-image-only');root.setAttribute('aria-label','Edit '+(context.title||'design')+' with AI');
 root.innerHTML=`<div class="ec-shell ec-io">
<header class="ec-header"><button type="button" class="ec-back" data-io="close">← ${h(context.backLabel||'Back to design')}</button><div class="ec-title"><h2>${h(context.title||'Your design')}</h2><span>${context.pageLabel?h(context.pageLabel)+' · ':''}${W} × ${H} px · Image editor</span></div><span class="ec-status" data-io-header role="status">Each change is saved as a new version</span></header>
<div class="ec-main">
<section class="ec-workspace" aria-label="Artwork workspace"><div class="ec-context ec-io-context"><span class="ec-io-viewing" data-io-viewing>Loading…</span><button type="button" data-io="clear" disabled>Clear pins</button></div>
<div class="ec-stage ec-io-stage"><div class="ec-io-frame"><img data-io-image alt="Design being edited"><svg class="ec-chat-overlay ec-io-overlay" aria-label="Click the design to drop a pin" role="application" tabindex="0" preserveAspectRatio="none" viewBox="0 0 ${W} ${H}"></svg>
<div class="ec-io-pop" data-io-pop role="dialog" aria-label="Pin comment" hidden><label><span class="ec-io-pop-head"><b data-io-pop-title>Pin 1</b> · What should change here?</span><textarea data-io-comment rows="3" maxlength="${MAX_COMMENT}" placeholder="e.g. Make this vase white"></textarea></label><div class="ec-io-area" role="group" aria-label="Area that can change"><span>Area that can change</span>${Object.keys(AREAS).map(k=>'<button type="button" data-io-area="'+k+'" aria-pressed="false">'+AREA_LABEL[k]+'</button>').join('')}</div><div class="ec-io-pop-actions"><small data-io-pop-count></small><button type="button" data-io-pop-remove>Remove pin</button><button type="button" class="ec-primary" data-io-pop-done>Done</button></div></div></div></div>
<div class="ec-io-banner" data-io-banner hidden></div></section>
<aside class="ec-chat" aria-label="Edit with AI"><header><div><h3>Edit with AI</h3><p data-chat-selection></p></div></header>
<section class="ec-io-versions" aria-label="Versions"><h4>Versions</h4><div class="ec-io-strip" data-io-strip></div></section>
<div class="ec-chat-history" role="log" aria-label="Editing conversation"></div>
<div class="ec-chat-composer"><ol class="ec-io-pins" data-io-pins aria-label="Pins"></ol><form><label class="ec-chat-input-label">Anything else? (optional)<textarea data-chat-input rows="2" maxlength="1000" placeholder="e.g. Make the lighting warmer"></textarea></label><div class="ec-chat-composer-tools"><span class="ec-io-hint" data-io-hint>Click the design to drop a pin.</span><button type="submit" class="ec-primary" data-chat-send disabled>Send</button></div></form><p class="ec-chat-help">Only the dashed area around each pin can change; everything outside stays exactly the same. A pin on words covers the whole line, and adding, replacing or removing something uses a larger area. For a change to the whole picture, remove the pins and use the note. Every edit is a new version; your original is never changed.</p><p class="ec-chat-help" data-io-cost>Loading cost estimate…</p><p class="ec-chat-status" role="status"></p><button type="button" class="ec-io-confirm" data-io-confirm hidden>Send anyway</button></div></aside>
</div></div>`;
 const shell=root.querySelector('.ec-io'),q=s=>shell.querySelector(s),overlay=q('.ec-io-overlay'),img=q('[data-io-image]'),stage=q('.ec-io-stage'),frame=q('.ec-io-frame'),history=q('.ec-chat-history'),text=q('[data-chat-input]'),send=q('[data-chat-send]');
 const pop=q('[data-io-pop]'),comment=q('[data-io-comment]');
 const status=(message,error=false)=>{if(disposed)return;const el=q('.ec-chat-status');el.textContent=message;el.classList.toggle('error',error);};
 const activeId=()=>list?.activeVersionId||'original';
 const version=id=>list?.versions.find(v=>v.id===id);
 const label=id=>{if(id==='original')return 'Original';const i=list?.versions.findIndex(v=>v.id===id);return i>0?'Version '+i:'Version';};
 const busyEdit=()=>!!list?.versions.some(v=>running(v.status));
 // Product check of each new edit (9 Nov 2026): one paid check after the version is saved. A check
 // never makes a version Ready; it only reports what it saw, in plain words.
 const checking=()=>!!list?.versions.some(v=>v.result?.check==='checking');
 const checkShort=v=>({checking:'Checking product…',passed:'Product checked',unsure:'Checked, some unsure',flagged:'Check found a problem',unable:'Not checked'}[v.result?.check]||'Not checked');
 function checkText(v){const c=v.result?.productCheck||{},s=v.result?.check,angles=c.productAngles?' (compared with '+c.productAngles+' product photo'+(c.productAngles>1?'s':'')+')':'';
  if(s==='checking')return '<span class="ec-io-spinner" aria-hidden="true"></span>Checking the product, logo and wording…';
  if(s==='passed')return '<strong>Checked — product looks right</strong>'+angles+'. It is not marked Ready; still look before using it.';
  if(s==='unsure')return '<strong>Checked — no problem found</strong>'+angles+', but some details could not be confirmed: '+h((c.unverified||[]).map(u=>u.name).join(', '))+'. Look closely before using it.';
  if(s==='flagged')return '<strong>Check found a problem:</strong> '+h((c.problems||[]).map(p=>p.evidence+(p.location?' ('+p.location+')':'')).join(' · '))+' Try another edit, or keep the earlier version.';
  if(s==='unable')return '<strong>Not checked:</strong> '+h(c.error||'The product check could not run.');
  return '<strong>Not checked yet</strong>: look closely at the product, logo and text before using it.';}
 const editing=()=>viewing===activeId();
 const commented=()=>pins.filter(p=>p.comment.trim());
 const ready=()=>!!text.value.trim()||commented().length>0;
 function controls(){const ok=!!list&&editing();send.disabled=busy||!ok||busyEdit()||!ready()||tooBig();q('[data-io="clear"]').disabled=!pins.length||busy;overlay.classList.toggle('drawing',ok&&!busy);q('[data-io-hint]').textContent=!ok?'':pins.length>=MAX_PINS?'That is the most pins one edit can use.':pins.length?'Click again to add another pin.':'Click the design to drop a pin.';}
 function fitFrame(){if(disposed)return;const pad=window.innerWidth<700?12:28,aw=Math.max(40,stage.clientWidth-pad*2),ah=Math.max(40,stage.clientHeight-pad*2),scale=Math.min(aw/W,ah/H);frame.style.width=Math.floor(W*scale)+'px';frame.style.height=Math.floor(H*scale)+'px';draw();place();}
 function draw(){const scale=(frame.clientWidth||W)/W,r=13/scale,fs=12/scale;overlay.innerHTML=pins.map((p,i)=>{const a=shownArea(p,i);return '<rect class="ec-io-area-box'+(i===open?' active':'')+'" x="'+a.x*W+'" y="'+a.y*H+'" width="'+a.width*W+'" height="'+a.height*H+'"/>';}).join('')+pins.map((p,i)=>'<g class="ec-io-pin'+(i===open?' active':'')+'" data-pin="'+i+'"><circle cx="'+p.x*W+'" cy="'+p.y*H+'" r="'+r+'"/><text x="'+p.x*W+'" y="'+p.y*H+'" font-size="'+fs+'">'+(i+1)+'</text></g>').join('');}
 // The comment box sits beside its pin, inside the artwork frame.
 // Try right, left, below and above the pin; the first spot that fits without covering the pin wins.
 function place(){if(open===null||pop.hidden)return;const fw=frame.clientWidth,fh=frame.clientHeight,p=pins[open];if(!p)return;const pw=Math.min(260,Math.max(150,fw-16));pop.style.width=pw+'px';const ph=pop.offsetHeight||130,px=p.x*fw,py=p.y*fh,gap=18,cx=v=>Math.max(8,Math.min(fw-pw-8,v)),cy=v=>Math.max(8,Math.min(fh-ph-8,v));
  const spots=[[px+gap,cy(py-24)],[px-gap-pw,cy(py-24)],[cx(px-pw/2),py+gap],[cx(px-pw/2),py-gap-ph]];
  const fits=([l,t])=>l>=8&&t>=8&&l+pw<=fw-8&&t+ph<=fh-8&&!(px>l-14&&px<l+pw+14&&py>t-14&&py<t+ph+14);
  const [left,top]=spots.find(fits)||[cx(px+gap),cy(py+gap)];pop.style.left=left+'px';pop.style.top=top+'px';}
 function pinList(){const el=q('[data-io-pins]');el.innerHTML=pins.map((p,i)=>'<li class="'+(i===open?'active':'')+'"><button type="button" class="ec-io-pin-edit" data-pin-edit="'+i+'"><b>'+(i+1)+'</b><span>'+(p.comment.trim()?h(p.comment.trim()):'<em>Add a comment</em>')+'</span><small>'+(adapted[i]&&adapted[i].key===pinKey(p)&&BASIS[adapted[i].basis]||AREA_LABEL[p.area])+'</small></button><button type="button" class="ec-io-pin-remove" data-pin-remove="'+i+'" aria-label="Remove pin '+(i+1)+'">×</button></li>').join('');el.hidden=!pins.length;}
 function areaButtons(){for(const b of pop.querySelectorAll('[data-io-area]'))b.setAttribute('aria-pressed',String(open!==null&&pins[open]?.area===b.dataset.ioArea));}
 function openPin(i){open=i;pop.hidden=false;q('[data-io-pop-title]').textContent='Pin '+(i+1);comment.value=pins[i].comment;count();areaButtons();draw();pinList();place();comment.focus({preventScroll:true});}
 // Closing a comment box keeps the pin when it has a comment; an empty new pin is removed.
 function closePin({keep=false}={}){if(open===null)return false;const i=open;open=null;pop.hidden=true;if(!keep&&!pins[i]?.comment.trim())pins.splice(i,1);draw();pinList();selection();controls();sizeWarning();refreshAreas();return true;}
 function sizeWarning(){const el=q('.ec-chat-status');if(tooBig())status('The pin areas cover more than about a third of the design. Make some areas smaller, or remove a pin.',true);else if(el.classList.contains('error')&&/third/.test(el.textContent))status('');}
 function removePin(i){if(open===i){open=null;pop.hidden=true;}else if(open!==null&&open>i)open--;pins.splice(i,1);draw();pinList();place();selection();controls();sizeWarning();}
 function count(){q('[data-io-pop-count]').textContent=comment.value.length>MAX_COMMENT-40?(MAX_COMMENT-comment.value.length)+' left':'';}
 function selection(){const v=version(viewing),n=pins.length;q('[data-chat-selection]').textContent=(editing()?'Editing '+label(viewing)+' (in use)':'Viewing '+label(viewing))+' · '+(n?n+' pin'+(n>1?'s':''):'Click the design to drop a pin');q('[data-io-viewing]').textContent=label(viewing)+(viewing===activeId()?' · in use':'')+(v?.result?' · '+(v.id==='original'?(v.result.ready?'Checks passed':'Saved image'):checkShort(v)):'');}
 const point=e=>{const b=overlay.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};};
 function drop(at){
  if(!list||!editing()||busy)return;
  if(open!==null&&!pins[open].comment.trim()){pins[open]={...pins[open],...at};openPin(open);status('Pin moved. Type what should change there.');return;}
  closePin({keep:true});
  if(pins.length>=MAX_PINS){status('That is the most pins one edit can use. Remove one to add another.',true);return;}
  pins.push({type:'pin',x:at.x,y:at.y,comment:'',area:'medium'});openPin(pins.length-1);selection();controls();status('Pin '+pins.length+' dropped. Type what should change there.');
 }
 overlay.onclick=e=>{const g=e.target.closest?.('[data-pin]');if(g){closePin({keep:true});openPin(Number(g.dataset.pin));return;}drop(point(e));};
 overlay.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();drop({x:.5,y:.5});}};
 comment.oninput=()=>{if(open===null)return;pins[open].comment=comment.value;count();pinList();controls();};
 comment.onkeydown=e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();closePin({keep:true});q('form').requestSubmit();return;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();closePin();overlay.focus({preventScroll:true});}};
 function cost(v){const c=v.costs;if(running(v.status))return 'Cost: shown when the edit finishes.';if(!c)return '';if(c.estimatedTotal!=null)return 'Cost: '+inr(c.estimatedTotal)+' (estimate, '+h(c.rateDate||'dated')+' rate).';if(v.status==='failed'&&!c.unknownReceipts&&c.knownSubtotal===0)return 'No charge recorded.';return 'Cost: not known yet'+(c.unknownReceipts?' (usage not confirmed; counted as unknown, not zero).':'.');}
 function request(v){const marks=v.annotations||[],boxes=marks.filter(a=>a.type==='box').length,pinned=marks.filter(a=>a.type==='pin');return (v.instruction?'<p class="ec-chat-user">'+h(v.instruction)+'</p>':'')+(pinned.some(p=>p.comment)?'<ol class="ec-chat-user ec-io-turn-pins">'+pinned.map(p=>'<li><b>'+h(p.number)+'</b> '+(p.comment?h(p.comment):'<em>Marked spot</em>')+'</li>').join('')+'</ol>':'')+(boxes?'<p class="ec-chat-user"><small>'+boxes+' box'+(boxes>1?'es':'')+' (only marked areas changed)</small></p>':'');}
 function scope(v){const m=v.annotations||[];return m.some(a=>a.type==='box'||a.type==='pin'&&a.area)?' · only the marked areas could change':m.length?' · whole picture':'';}
 function render(){
  if(!list||disposed)return;const inUse=activeId(),edits=list.versions.slice(1);
  q('[data-io-strip]').innerHTML=list.versions.map((v,i)=>{const url=safe(v.result?.imageUrl),use=v.id===inUse,done=v.status==='finished'&&url;return '<button type="button" class="ec-io-version'+(use?' in-use':'')+(v.id===viewing?' viewing':'')+'" data-io-view="'+h(v.id)+'" '+(done?'':'disabled')+' aria-pressed="'+(v.id===viewing)+'">'+(url?'<img src="'+h(url)+'" alt="">':'<span class="ec-io-thumb-empty">'+(v.status==='failed'?'Not made':'Creating…')+'</span>')+'<strong>'+(i?'Version '+i:'Original')+'</strong><small>'+(use?'In use':v.status==='failed'?'Didn’t work':!done?'Creating…':v.id==='original'?(v.result.ready?'Checks passed':'Saved image'):checkShort(v))+'</small></button>';}).join('');
  const scroll=history.scrollHeight-history.scrollTop-history.clientHeight<80;
  history.innerHTML=edits.length?edits.map(v=>{const i=list.versions.indexOf(v),pinned=(v.annotations||[]).filter(a=>a.type==='pin').length,before=safe(version(v.sourceVersionId)?.result?.imageUrl),after=safe(v.result?.imageUrl);
   return '<article class="ec-chat-turn" data-chat-row="'+h(v.id)+'">'+request(v)+'<div class="ec-chat-result">'+(running(v.status)?'<p role="status"><span class="ec-io-spinner" aria-hidden="true"></span>Making your edit… This usually takes about a minute.</p>':v.status==='finished'?'<p'+(v.result?.check==='checking'?' role="status"':'')+'>Version '+i+' is ready. '+checkText(v)+'</p>':'<p class="error">'+h(v.error||'This edit did not work. Your design is unchanged.')+'</p>')+'<small>From '+h(label(v.sourceVersionId))+(pinned?' · '+pinned+' pin'+(pinned>1?'s':''):'')+scope(v)+'</small>'+(v.status==='finished'&&after?'<div class="ec-chat-previews">'+(before?'<a href="'+h(before)+'" target="_blank" rel="noopener"><img src="'+h(before)+'" alt="Before edit" loading="lazy"><span>Before</span></a>':'')+'<a href="'+h(after)+'" target="_blank" rel="noopener"><img src="'+h(after)+'" alt="After edit" loading="lazy"><span>Version '+i+'</span></a></div><div class="ec-io-actions">'+(v.id===viewing?'':'<button type="button" data-io-view="'+h(v.id)+'">View</button>')+(v.id===inUse?'<span class="ec-chat-applied">In use</span>':'<button type="button" class="ec-primary" data-io-use="'+h(v.id)+'">Use this version</button>')+'</div>':'')+'<small>'+cost(v)+'</small></div></article>';}).join(''):'<div class="ec-chat-welcome"><h4>What would you like to change?</h4><p>Click anywhere on the design to drop a pin, then type what should change there. Add as many pins as you need, then Send.</p><ul><li>Pin on the wall: “Make this wall soft blue”</li><li>Pin on a lamp: “Remove this lamp”</li><li>No pin: use the note, e.g. “Make the lighting warmer”</li></ul></div>';
  if(scroll)history.scrollTop=history.scrollHeight;
  const e=list.estimate;q('[data-io-cost]').textContent=e?.perEdit!=null?'Each Send is one paid image edit, about '+inr(e.perEdit)+(e.perCheck!=null?', plus one product check, about '+inr(e.perCheck)+' (estimates). ':' (estimate). ')+e.basis:'Each Send is one paid image edit. The actual usage is recorded after it runs.';
  const v=version(viewing),url=safe(v?.result?.imageUrl);if(url&&img.getAttribute('src')!==url)img.src=url;img.alt=label(viewing)+' of the design';
  const banner=q('[data-io-banner]');banner.hidden=editing();if(!editing())banner.innerHTML='<span>Viewing '+h(label(viewing))+'. Edits start from the version in use ('+h(label(inUse))+').</span><button type="button" class="ec-primary" data-io-use="'+h(viewing)+'">Use this version</button><button type="button" data-io-view="'+h(inUse)+'">Back to version in use</button>';
  overlay.hidden=!editing();if(!editing()&&open!==null)closePin({keep:true});selection();controls();
 }
 async function load(){const ticket=++sequence;try{const next=await api(query);if(!active()||ticket!==sequence)return;const was=list?.versions.filter(v=>running(v.status)).map(v=>v.id)||[];list=next;if(!viewing||!version(viewing)||version(viewing).status!=='finished')viewing=activeId();const finished=was.map(version).find(v=>v?.status==='finished');if(finished){viewing=finished.id;onChange();status(label(finished.id)+' is ready. It is not in use yet; choose “Use this version” to keep it.');}else{const failed=was.map(version).find(v=>v?.status==='failed');if(failed)status('The edit did not work. Your design is unchanged.',true);}render();if(busyEdit()||checking())schedule();}catch(e){if(active()){status(e.message,true);schedule(8000);}}}
 function schedule(ms=4000){clearTimeout(timer);timer=setTimeout(()=>{if(active())load();},ms);}
 async function submit(event){event.preventDefault();closePin({keep:true});const value=text.value.trim();if(!ready()||busy||busyEdit()||!editing()||tooBig())return;busy=true;controls();status('Sending your edit…');
  const annotations=pins.map(p=>({type:'pin',x:p.x,y:p.y,area:p.area,...(p.comment.trim()?{comment:p.comment.trim()}:{})}));tools.annotations(annotations);
  const payload={route:context.route,placementId:context.placementId,brandId:context.brandId,...(value?{instruction:value}:{}),sourceVersionId:activeId(),expectedVersionId:activeId(),...(annotations.length?{annotations}:{}),...(confirmProduct?{confirmProductChange:true}:{})},signature=JSON.stringify(payload);q('[data-io-confirm]').hidden=true;
  if(draft.signature!==signature){draft.signature=signature;draft.requestKey='ai-edit-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));}
  try{const row=await api('',{...payload,requestKey:draft.requestKey});if(!active())return;draft={requestKey:null,signature:''};text.value='';pins=[];open=null;pop.hidden=true;draw();pinList();if(!list.versions.some(v=>v.id===row.id))list.versions.push(row);onChange();status(annotations.length?'Making your edit inside the pinned areas. This usually takes about a minute.':'Making your edit. This usually takes about a minute.');render();await load();}
  catch(e){if(active()){status(e.message,true);q('[data-io-confirm]').hidden=e.code!=='PRODUCT_CHANGE_CONFIRM';}}finally{busy=false;confirmProduct=false;if(active())controls();}}
 async function use(id){const v=version(id);if(!v?.result?.sha256||busy)return;busy=true;controls();status('Switching to '+label(id)+'…');
  try{await api('/selected',{route:context.route,placementId:context.placementId,brandId:context.brandId,versionId:id,expectedVersionId:activeId(),expectedSha256:v.result.sha256});if(!active())return;list.activeVersionId=id;viewing=id;onChange();status('Now using '+label(id)+'. Downloads and new edits use this version.');render();}
  catch(e){if(active())status(e.message,true);}finally{busy=false;if(active())controls();}}
 q('form').onsubmit=submit;text.oninput=controls;text.onkeydown=e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();q('form').requestSubmit();}};
 // Keep this view's events away from the layer editor's dialog-level handlers.
 const onClick=e=>{e.stopPropagation();const t=e.target.closest('button');if(!t||t.disabled)return;if(t.dataset.io==='close')return close();
  if(t.hasAttribute('data-io-confirm')){confirmProduct=true;t.hidden=true;return submit({preventDefault(){}});}
  if(t.dataset.io==='clear'){pins=[];open=null;pop.hidden=true;draw();pinList();selection();controls();return;}
  if(t.dataset.ioArea&&open!==null){pins[open].area=t.dataset.ioArea;areaButtons();draw();place();pinList();controls();sizeWarning();refreshAreas();return;}
  if(t.hasAttribute('data-io-pop-done')){closePin();overlay.focus({preventScroll:true});return;}
  if(t.hasAttribute('data-io-pop-remove')){if(open!==null)removePin(open);return;}
  if(t.dataset.pinEdit!==undefined){closePin({keep:true});openPin(Number(t.dataset.pinEdit));return;}
  if(t.dataset.pinRemove!==undefined){removePin(Number(t.dataset.pinRemove));return;}
  if(t.dataset.ioView){viewing=t.dataset.ioView;pins=[];open=null;pop.hidden=true;draw();pinList();render();return;}if(t.dataset.ioUse)return use(t.dataset.ioUse);};
 const stop=e=>e.stopPropagation();
 // Escape closes an open pin comment first (an empty new pin is removed); otherwise it closes the
 // editor. The dialog's own cancel event (focus outside the editor) asks cancelDrawing() the same.
 const cancelDrawing=()=>closePin();
 const onKey=e=>{if(e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(cancelDrawing()){overlay.focus({preventScroll:true});return;}close();};
 shell.addEventListener('click',onClick);shell.addEventListener('change',stop);shell.addEventListener('input',stop);root.addEventListener('keydown',onKey,true);
 const observer=new ResizeObserver(fitFrame);observer.observe(stage);img.onload=fitFrame;
 pinList();fitFrame();await load();
 if(window.innerWidth>=700)text.focus({preventScroll:true});
 return {cancelDrawing,dispose(){disposed=true;clearTimeout(timer);observer.disconnect();root.removeEventListener('keydown',onKey,true);shell.removeEventListener('click',onClick);root.classList.remove('ec-image-only');},update(){fitFrame();}};
}
