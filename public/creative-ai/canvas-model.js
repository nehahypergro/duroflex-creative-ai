/* Shared Fabric renderer: editor, initial assembly and exports use these exact objects. */
'use strict';
window.CreativeCanvasModel = (() => {
 const family = f => 'approved-' + f.brandId + '-' + f.id;
 async function loadFonts(doc) {
  const issues=[];
  for (const f of doc.fonts) {
   try {const face=new FontFace(family(f),`url("${f.url}")`,{weight:String(f.weight),style:f.style||'normal'}); await face.load(); document.fonts.add(face);}
   catch {issues.push('Missing approved font: '+f.name+' ('+f.weight+'). Upload the original font file.');}
  }
  await document.fonts.ready; return issues;
 }
 async function mount(canvas,doc,{editable=false}={}) {
  const issues=await loadFonts(doc); canvas.clear(); canvas.setDimensions(doc.canvas); canvas.backgroundColor='#ffffff';
  for (const o of doc.objects) {
   let obj; const common={borderColor:'#236451',cornerColor:'#ffffff',cornerStrokeColor:'#236451',transparentCorners:false,cornerSize:9,left:o.left,top:o.top,angle:o.angle||0,scaleX:o.scaleX||1,scaleY:o.scaleY||1,visible:o.visible!==false,selectable:editable&&!o.locked,evented:editable&&(o.type!=='rect'||!o.locked),originX:'left',originY:'top'};
   if(o.type==='image') {
    const a=doc.assets.find(a=>a.id===o.assetId);
    try {obj=await fabric.FabricImage.fromURL(a.url,{crossOrigin:'anonymous'}); const scale=o.role==='photograph'?Math.max(o.width/obj.width,o.height/obj.height):Math.min(o.width/obj.width,o.height/obj.height);obj.set({...common,scaleX:scale*(o.scaleX||1),scaleY:scale*(o.scaleY||1),lockUniScaling:true});obj.setControlsVisibility({ml:false,mr:false,mt:false,mb:false});}
    catch {issues.push(o.id+': '+o.role+' image could not load ('+(a?.name||o.assetId)+'). The layer is preserved. Retry loading images before exporting.');continue;}
   } else if(o.type==='rect') {
    const fill=o.shade==='edge-fade'?new fabric.Gradient({type:'linear',gradientUnits:'pixels',coords:{x1:0,y1:0,x2:0,y2:o.height},colorStops:[{offset:0,color:o.fill,opacity:.78},{offset:.3,color:o.fill,opacity:.58},{offset:.46,color:o.fill,opacity:0},{offset:.72,color:o.fill,opacity:0},{offset:1,color:o.fill,opacity:.85}]}):o.fill;
    obj=new fabric.Rect({...common,width:o.width,height:o.height,fill,rx:o.radius||0,ry:o.radius||0});
   }
   else {
    const f=doc.fonts.find(f=>f.id===o.fontId);
    if(!f) {issues.push('Missing approved font for '+o.id);continue;}
    const text=new fabric.Textbox(o.text,{width:o.width,fontFamily:family(f),fontSize:o.fontSize,fontWeight:f.weight,fontStyle:f.style||'normal',fill:o.fill,textAlign:o.align||'left',lineHeight:o.lineHeight||1.15,charSpacing:o.charSpacing||0,direction:o.direction||'ltr',splitByGrapheme:false,shadow:o.effect==='shadow'?new fabric.Shadow({color:o.effectColor||'#000000',blur:6,offsetX:2,offsetY:3}):null,stroke:o.effect==='outline'?(o.effectColor||'#000000'):null,strokeWidth:o.effect==='outline'?2:0,paintFirst:'stroke',textBackgroundColor:o.effect==='highlight'?(o.effectColor||'#000000'):''});
    if(o.type==='cta') {const rect=new fabric.Rect({width:o.width+o.padding*2,height:Math.max(o.height,text.height+o.padding*2),fill:o.background,rx:o.radius??8,ry:o.radius??8,stroke:o.borderColor||'#171717',strokeWidth:o.borderWidth||0});text.set({left:o.padding,top:o.verticalAlign==='middle'?(rect.height-text.height)/2:o.verticalAlign==='bottom'?rect.height-text.height-o.padding:o.padding,editable:false});obj=new fabric.Group([rect,text],{...common,subTargetCheck:true,interactive:false});}
    else obj=text.set({...common,editable});
   }
   obj.layerId=o.id; obj.layerRole=o.role; obj.set({lockMovementX:!!o.locked,lockMovementY:!!o.locked,lockScalingX:!!o.locked,lockScalingY:!!o.locked,lockRotation:o.role==='logo'||!!o.locked});
   canvas.add(obj);
  }
  canvas.requestRenderAll(); return issues;
 }
 function capture(canvas,doc) {
  // The document owns layer membership and order; load failure is never deletion.
  const mounted=new Map(canvas.getObjects().map(obj=>[obj.layerId,obj]));
  return {...doc,objects:doc.objects.map(prior=>{
   const o={...prior},obj=mounted.get(prior.id);
   if(!obj)return o;
   // ActiveSelection keeps child coordinates local. Save their world transforms.
   let left=obj.left,top=obj.top,angle=obj.angle,sx=obj.scaleX,sy=obj.scaleY;
   if(obj.group?.type==='activeselection'){
    const t=fabric.util.qrDecompose(obj.calcTransformMatrix());
    const clone=new fabric.Rect({width:obj.width,height:obj.height,strokeWidth:obj.strokeWidth,scaleX:t.scaleX,scaleY:t.scaleY,angle:t.angle,originX:'left',originY:'top'});
    clone.setPositionByOrigin(new fabric.Point(t.translateX,t.translateY),'center','center');
    left=clone.left;top=clone.top;angle=t.angle;sx=t.scaleX;sy=t.scaleY;
   }
   const base=o.type==='image'?(o.role==='photograph'?Math.max(o.width/obj.width,o.height/obj.height):Math.min(o.width/obj.width,o.height/obj.height)):1;
   Object.assign(o,{left,top,angle,scaleX:sx/base,scaleY:sy/base,visible:obj.visible});
   if(o.type==='text')Object.assign(o,{text:obj.text,width:obj.width,fontSize:obj.fontSize,fill:obj.fill,align:obj.textAlign,lineHeight:obj.lineHeight,charSpacing:obj.charSpacing});
   return o;
  })};
 }
 function snap(target,others,dimensions,margin,tolerance=6){
  target.setCoords();const b=target.getBoundingRect(),lines=[];
  for(const axis of ['x','y']){
   const start=axis==='x'?'left':'top',size=axis==='x'?'width':'height',limit=dimensions[size];
   const anchors=[margin,limit/2,limit-margin,...others.flatMap(o=>{const r=o.getBoundingRect();return [r[start],r[start]+r[size]/2,r[start]+r[size]];})];
   let best=null;for(const a of anchors)for(const p of [b[start],b[start]+b[size]/2,b[start]+b[size]]){const d=a-p;if(Math.abs(d)<=tolerance&&(!best||Math.abs(d)<Math.abs(best.delta)))best={axis,value:a,delta:d};}
   if(best){target.set(start,target[start]+best.delta);lines.push(best);}
  }
  target.setCoords();return lines;
 }
 function align(target,edge,dimensions,margin){target.setCoords();const b=target.getBoundingRect(),x=['left','center','right'].includes(edge),key=x?'left':'top',size=x?'width':'height';const value=edge==='left'||edge==='top'?margin:edge==='right'||edge==='bottom'?dimensions[size]-margin-b[size]:(dimensions[size]-b[size])/2;target.set(key,target[key]+value-b[key]);target.setCoords();}

 const luminance=hex=>{const s=hex.replace('#',''),v=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 // Actual Fabric/font measurements, shared with server preflight. Logo bounds ignore transparent padding.
 function measure(canvas,doc) {
  return canvas.getObjects().filter(obj=>obj.visible).map(obj=>{
   const o=doc.objects.find(o=>o.id===obj.layerId),b=obj.getBoundingRect(),row={id:o.id,role:o.role,...b};
   if(['text','cta'].includes(o.type)){const t=o.type==='cta'?obj.getObjects()[1]:obj;row.textHeight=t.height;row.textWidth=t.width;
    // Textbox.calcTextWidth measures already-wrapped lines. A separate Text
    // measures the complete line with the same loaded font and spacing.
    const natural=new fabric.Text(t.text,{fontFamily:t.fontFamily,fontSize:t.fontSize,fontWeight:t.fontWeight,fontStyle:t.fontStyle,charSpacing:t.charSpacing,lineHeight:t.lineHeight,direction:t.direction});
    row.naturalTextWidth=natural.calcTextWidth();natural.dispose();row.fontSize=t.fontSize;}
   if(o.role==='logo') {const el=obj.getElement(),c=document.createElement('canvas');c.width=el.naturalWidth||el.width;c.height=el.naturalHeight||el.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(el,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;const colours=new Map();let x0=c.width,y0=c.height,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>32){if(pixels[(y*c.width+x)*4+3]>240){const i=(y*c.width+x)*4,key='#'+[pixels[i],pixels[i+1],pixels[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');colours.set(key,(colours.get(key)||0)+1);}x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}row.colours=[...colours].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([colour])=>colour);row.visibleWidth=x1<0?0:(x1-x0+1)*obj.scaleX;row.visibleHeight=y1<0?0:(y1-y0+1)*obj.scaleY;}
   return row;
  });
 }
 function validate(canvas,doc,loadIssues=[],observedRegions=[]) {
  const issues=[...loadIssues], margin=doc.safeMargin, boxes=[];
  let backdrop;try{const visibility=canvas.getObjects().map(o=>o.visible);try{canvas.getObjects().forEach(o=>{if(!['photograph','copy-panel','contrast-overlay'].includes(o.layerRole))o.visible=false;});backdrop=canvas.toCanvasElement(1,{viewportTransform:false});}finally{canvas.getObjects().forEach((o,i)=>o.visible=visibility[i]);canvas.requestRenderAll();}}catch{issues.push('Photographic contrast sampling unavailable; inspect visually.');}

  for(const obj of canvas.getObjects()) {
   const o=doc.objects.find(o=>o.id===obj.layerId);if(!obj.visible)continue;
   const b=obj.getBoundingRect();
   if(!['photograph','copy-panel','contrast-overlay'].includes(o.role)) {
    for(const r of [...(doc.protectedRegions||[]).map(r=>({...r,basis:'planned'})),...observedRegions.map(r=>({...r,basis:'observed'}))])if(b.left<r.left+r.width&&b.left+b.width>r.left&&b.top<r.top+r.height&&b.top+b.height>r.top)issues.push(o.id+': overlaps '+r.basis+' protected '+r.kind+' area '+r.id+'.');
    if(b.left<margin-1||b.top<margin-1||b.left+b.width>doc.canvas.width-margin+1||b.top+b.height>doc.canvas.height-margin+1)issues.push(o.id+': outside safe margins.');
    if(['text','cta'].includes(o.type)) {
     const text=o.type==='cta'?obj.getObjects()[1]:obj;
     if(text.height>(o.height-(o.type==='cta'?2*o.padding:0))+1||text.width>o.width+1) issues.push(o.id+': text overflows its planned box. Shorten copy or reduce size.');
     const panel=doc.objects.find(o=>o.role==='copy-panel'&&!o.shade&&o.visible!==false);
     const panelObject=panel&&canvas.getObjects().find(p=>p.layerId===panel.id),pb=panelObject?.getBoundingRect();const onPanel=panelObject&&canvas.getObjects().indexOf(panelObject)<canvas.getObjects().indexOf(obj)&&pb&&b.left>=pb.left&&b.top>=pb.top&&b.left+b.width<=pb.left+pb.width&&b.top+b.height<=pb.top+pb.height;
     const bg=o.type==='cta'?o.background:onPanel?panel.fill:null;
     if(!bg){let ratios=[];try{const context=backdrop?.getContext('2d');if(context){for(let row=1;row<5;row++)for(let col=1;col<5;col++){const x=Math.round((b.left+b.width*col/5)*canvas.getZoom()),y=Math.round((b.top+b.height*row/5)*canvas.getZoom());if(x<0||y<0||x>=backdrop.width||y>=backdrop.height)continue;const rgb=context.getImageData(x,y,1,1).data,hex='#'+[...rgb].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''),a=luminance(o.fill),c=luminance(hex);ratios.push((Math.max(a,c)+.05)/(Math.min(a,c)+.05));}}}catch{}if(ratios.length&&Math.min(...ratios)<4.5)issues.push(o.id+': low sampled photographic contrast ('+Math.min(...ratios).toFixed(1)+':1 minimum). Inspect text against the scene.');else issues.push(o.id+': contrast over photograph '+(ratios.length?'sampled; detailed visual review remains required.':'requires visual review.'));}
     else if(/^#[a-f0-9]{6}$/i.test(o.fill)&&/^#[a-f0-9]{6}$/i.test(bg)){const a=luminance(o.fill),c=luminance(bg),ratio=(Math.max(a,c)+.05)/(Math.min(a,c)+.05);if(ratio<4.5)issues.push(o.id+': low text contrast ('+ratio.toFixed(1)+':1).');}
    }
    for(const above of canvas.getObjects().slice(canvas.getObjects().indexOf(obj)+1)){if(!above.visible||!['photograph','copy-panel','contrast-overlay'].includes(above.layerRole))continue;const c=above.getBoundingRect();if(b.left<c.left+c.width&&b.left+b.width>c.left&&b.top<c.top+c.height&&b.top+b.height>c.top)issues.push(o.id+': covered by '+above.layerRole+'. Check the layer order.');}
    boxes.push({id:o.id,...b});
   }
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top)issues.push(a.id+' overlaps '+b.id+'.');}
  return [...new Set(issues)];
 }
 // Presentation only: never alter stored errors, contracts, artwork text or billing evidence.
 function optionLabel(route){return route==='continuity'?'Option 1':route==='exploration'?'Option 2':/^Option \d+$/.test(route||'')?route:'Option';}
 function clientText(value){const text=String(value??'');
  if(/^(Saved · revision|AI revision saved separately · revision)/i.test(text))return 'All changes saved';
  if(/^Exported · revision/i.test(text))return 'Download ready';
  if(/^(One correction cycle complete|Correction cycle complete)[.!]?$/i.test(text))return '';
  if(/^(Preparing|Starting).*(OCR|extraction|raster|layer conversion|editor)/i.test(text))return 'Preparing your design for editing…';
  const dimensions=text.match(/^Decoded (\d+)[×x](\d+) (\w+); \d+ bytes\.?$/);if(dimensions)return 'Image size: '+dimensions[1]+' × '+dimensions[2]+' px · '+dimensions[3].toUpperCase()+'.';
  if(/^Supply observable reasons and sufficient confidence|^No qualified evaluator evidence available/i.test(text))return 'This review is incomplete. Check the design before sharing.';
  if(text==='No eligible rating was recorded.')return 'Not rated yet.';
  if(/schema repair|agent output|token limit|provider error/i.test(text))return 'This check could not be completed. Retry or ask your workspace administrator for help.';
  return text.replace(/\bOCR\b/g,'text check').replace(/\braster\b/gi,'image').replace(/\blayer conversion\b/gi,'preparation for editing').replace(/\bFinal asset\b/g,'Creative');
 }
 function clientError(error,context='action'){
  const raw=String(error?.message||error?.error||error||'');
  const fallback={image:'We couldn’t load this image. Your work is safe.',save:'We couldn’t save your changes. Retry saving or download a recovery file.',editor:'We couldn’t prepare your design for editing. Your original is safe. Retry opening it.',generation:'We couldn’t finish this creative. Your brief is saved. Check status before trying again.',download:'We couldn’t prepare this download. Retry or return to your creative.',review:'We couldn’t load the review. Retry loading the details.',upload:'We couldn’t add this file. Retry or choose another file.',action:'We couldn’t complete this action. Please retry.'};
  if(/(charge|billing|usage|cost).{0,50}(unknown|uncertain)|(unknown|uncertain).{0,50}(charge|billing|usage|cost)/i.test(raw))return 'The charge for this attempt is unknown. Check Usage & costs before starting a new attempt.';
  if(context==='generation'){
   const ending=' Your brief is saved.';
   if(/already reserved|AMBIGUOUS_PROVIDER_REQUEST|outcome is unresolved/i.test(raw))return 'We couldn’t confirm whether the previous attempt finished. Check its status before restarting; earlier charges may still apply.';
   if(/fetch failed|Failed to fetch|ECONN|connection (lost|closed|reset)|network error|socket hang up/i.test(raw))return 'The connection to the creation service was interrupted.'+ending+' Use Retry to start a new attempt.';
   if(/timeout|timed out|time budget|deadline/i.test(raw))return 'Creation took longer than the allowed time.'+ending+' Use Retry to try again.';
   if(/rate limit|too many requests|HTTP 429|service unavailable|HTTP 503/i.test(raw))return 'The creation service is temporarily busy.'+ending+' Please retry shortly.';
   if(/schema|validated contract|agent output/i.test(raw))return 'We couldn’t use part of the generated response.'+ending+' Use Retry to try again.';
  }
  if(error?.status===409&&context==='editor')return 'This design changed while preparing it. Retry opening the latest version.';
  if(error?.status===409)return 'A newer version is available. Compare versions, load the latest, or save your changes separately.';
  if(/schema|token.?limit|provider|agent output|GPT[- ]|Gemini|ECONN|ENOENT|fetch failed|Failed to fetch|TypeError|SyntaxError|JSON|stack trace|HTTP \d|Request failed \(|<html|\/Users\/|\bat \w+ \(/i.test(raw))return fallback[context]||fallback.action;
  // Local, actionable validation remains useful (sizes, locked selections, missing inputs).
  if(/^(We couldn’t|A newer version|The charge|Choose|Select|Unlock|Use |Add |Enter |Keep |This (design|file|image|creative|brief|project|product|item|campaign)|The (design|workspace|file|image)|Your (saved|work|changes|brief|design|organisation)|File (must|could)|Image (is not readable|content)|Not added|Only |Maximum |Nothing |No (saved|image|creative|product|brand)|Unsaved changes|Upload history is only on screen|Changes only on screen|Saved locally|Save failed|Could not check the latest edit|Could not save|Some images are missing|Export blocked|Missing approved font|Original preview unavailable)/i.test(raw)&&raw.length<=500)return clientText(raw);
  return fallback[context]||fallback.action;
 }
 function downloadName({brand,project,width,height,option,revision,extension}){const segment=(value,fallback)=>{let text=String(value||fallback).normalize('NFC').replace(/[^\p{L}\p{N}.-]+/gu,'-').replace(/^[.-]+|[.-]+$/g,'')||fallback;while(new TextEncoder().encode(text).length>42)text=Array.from(text).slice(0,-1).join('');return text;};return [segment(brand,'Brand'),segment(project,'Project'),segment(width&&height?width+'x'+height:'Creative','Creative'),segment(optionLabel(option),'Option'),Number.isInteger(revision)?'R'+revision:'Original'].join('_')+'.'+(['png','jpg','jpeg','webp','zip'].includes(extension)?extension:'png');}
 return {mount,capture,validate,measure,family,snap,align,downloadName,optionLabel,clientText,clientError};
})();
