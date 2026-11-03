/* Shared Fabric renderer: editor, initial assembly and exports use these exact objects. */
'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CreativeCanvasModel=factory();})(typeof window==='object'?window:null,() => {
 const family = f => 'approved-' + f.brandId + '-' + f.id;
 async function loadFonts(doc) {
  const issues=[];
  for (const f of doc.fonts) {
   try {const face=new FontFace(family(f),`url("${f.url}")`,{weight:String(f.weight),style:f.style||'normal'}); await face.load(); document.fonts.add(face);}
   catch {issues.push('Missing approved font: '+f.name+' ('+f.weight+'). Upload the original font file.');}
  }
  await document.fonts.ready; return issues;
 }
 const elementIcons={delivery:'M10 30H60V75H10ZM60 45H78L92 60V75H60ZM22 75A10 10 0 1 0 42 75A10 10 0 1 0 22 75M66 75A10 10 0 1 0 86 75A10 10 0 1 0 66 75',location:'M50 90C35 70 20 55 20 38A30 30 0 0 1 80 38C80 55 65 70 50 90ZM40 38A10 10 0 1 0 60 38A10 10 0 1 0 40 38',phone:'M25 12L40 30L30 42C38 58 43 63 58 70L70 60L88 75C80 95 65 92 45 80C22 65 10 40 13 25Z',sun:'M30 50A20 20 0 1 0 70 50A20 20 0 1 0 30 50M50 5V18M50 82V95M5 50H18M82 50H95M18 18L28 28M72 72L82 82M18 82L28 72M72 28L82 18',leaf:'M15 85C5 40 35 15 90 10C90 65 65 95 20 80M15 85L70 30',care:'M50 88L15 53C-8 20 30 3 50 28C70 3 108 20 85 53Z'};
 function elementPaint(o,fallback){if(!o.gradient)return fallback;const g=o.gradient,w=o.width,h=o.height,rad=g.angle*Math.PI/180;return new fabric.Gradient({type:g.type,gradientUnits:'pixels',coords:g.type==='radial'?{x1:w/2,y1:h/2,r1:0,x2:w/2,y2:h/2,r2:Math.max(w,h)/2}:{x1:w/2-Math.cos(rad)*w/2,y1:h/2-Math.sin(rad)*h/2,x2:w/2+Math.cos(rad)*w/2,y2:h/2+Math.sin(rad)*h/2},colorStops:[{offset:0,color:g.from},{offset:1,color:g.to}]});}
 function graphic(o,common){const paint=elementPaint(o,o.fill),stroke=o.borderColor||'#242139',border=o.borderWidth||0,base={...common,fill:paint,stroke,strokeWidth:border};if(['circle','ellipse'].includes(o.shape))return new fabric.Ellipse({...base,rx:o.width/2,ry:o.height/2});if(o.shape==='triangle')return new fabric.Triangle({...base,width:o.width,height:o.height});if(['line','arrow','icon'].includes(o.shape)){const w=o.width,h=o.height,line=o.lineWidth||4,frame=new fabric.Rect({width:w,height:h,fill:'transparent',strokeWidth:0,evented:false}),parts=[frame];if(o.shape==='icon'){const catalog=typeof window==='object'?window.CreativeIconCatalog:null,entry=o.iconId?.startsWith('lucide-')?catalog?.[o.iconId.slice(7)]:null;if(o.iconId?.startsWith('lucide-')&&!entry)throw Error('Icon library unavailable.');const unit=entry?24:100,pathData=entry?.path||elementIcons[o.iconId],options={scaleX:w/unit,scaleY:h/unit,fill:'',stroke:paint,strokeWidth:line,strokeLineCap:'round',strokeLineJoin:'round'};if(border)parts.push(new fabric.Path(pathData,{...options,stroke,strokeWidth:line+border*2}));parts.push(new fabric.Path(pathData,options));}else{const head=o.shape==='arrow'?Math.min(w*.2,h):0,coords=[0,h/2,w-head,h/2];if(border)parts.push(new fabric.Line(coords,{stroke,strokeWidth:line+border*2}));parts.push(new fabric.Line(coords,{stroke:paint,strokeWidth:line}));if(head)parts.push(new fabric.Triangle({left:w-head/2,top:h/2,originX:'center',originY:'center',angle:90,width:head,height:head,fill:paint,stroke,strokeWidth:border}));}return new fabric.Group(parts,common);}return new fabric.Rect({...base,width:o.width,height:o.height,rx:o.radius||0,ry:o.radius||0});}
 async function mount(canvas,doc,{editable=false}={}) {
  if(doc.objects.some(o=>o.iconId?.startsWith('lucide-'))&&!window.CreativeIconCatalog)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/creative-ai/editor-icon-catalog.js';script.onload=resolve;script.onerror=()=>reject(Error('Icon library unavailable.'));document.head.append(script);});
  const issues=await loadFonts(doc); canvas.clear(); canvas.setDimensions(doc.canvas); canvas.backgroundColor='#ffffff';
  for (const o of doc.objects) {
   let obj; const common={borderColor:'#236451',cornerColor:'#ffffff',cornerStrokeColor:'#236451',transparentCorners:false,cornerSize:9,left:o.left,top:o.top,angle:o.angle||0,opacity:o.opacity??1,flipX:!!o.flipX,flipY:!!o.flipY,scaleX:o.scaleX||1,scaleY:o.scaleY||1,visible:o.visible!==false,selectable:editable&&!o.locked,evented:editable&&(o.type!=='rect'||!o.locked),originX:'left',originY:'top'};
   if(o.type==='image') {
    const a=doc.assets.find(a=>a.id===o.assetId);
    try {obj=await fabric.FabricImage.fromURL(a.url,{crossOrigin:'anonymous'}); const scale=o.role==='photograph'?Math.max(o.width/obj.width,o.height/obj.height):Math.min(o.width/obj.width,o.height/obj.height);obj.set({...common,scaleX:scale*(o.scaleX||1),scaleY:scale*(o.scaleY||1),lockUniScaling:true});obj.setControlsVisibility({ml:false,mr:false,mt:false,mb:false});}
    catch {issues.push(o.id+': '+o.role+' image could not load ('+(a?.name||o.assetId)+'). The layer is preserved. Retry loading images before exporting.');continue;}
   } else if(o.type==='rect'&&o.shape) {obj=graphic(o,common);
   } else if(o.type==='rect') {
    const fill=o.gradient?elementPaint(o,o.fill):o.shade==='edge-fade'?new fabric.Gradient({type:'linear',gradientUnits:'pixels',coords:{x1:0,y1:0,x2:0,y2:o.height},colorStops:[{offset:0,color:o.fill,opacity:.78},{offset:.3,color:o.fill,opacity:.58},{offset:.46,color:o.fill,opacity:0},{offset:.72,color:o.fill,opacity:0},{offset:1,color:o.fill,opacity:.85}]}):o.fill;
    obj=new fabric.Rect({...common,width:o.width,height:o.height,fill,rx:o.radius||0,ry:o.radius||0,...(o.borderWidth!==undefined?{stroke:o.borderColor||'#242139',strokeWidth:o.borderWidth}:{})});
   }
   else {
    const f=doc.fonts.find(f=>f.id===o.fontId);
    if(!f) {issues.push('Missing approved font for '+o.id);continue;}
    const text=new fabric.Textbox(o.text,{width:o.width,fontFamily:family(f),fontSize:o.fontSize,fontWeight:f.weight,fontStyle:f.style||'normal',fill:o.fill,textAlign:o.align||'left',lineHeight:o.lineHeight||1.15,charSpacing:o.charSpacing||0,direction:o.direction||'ltr',splitByGrapheme:false,shadow:o.effect==='shadow'?new fabric.Shadow({color:o.effectColor||'#000000',blur:6,offsetX:2,offsetY:3}):null,stroke:o.effect==='outline'?(o.effectColor||'#000000'):null,strokeWidth:o.effect==='outline'?2:0,paintFirst:'stroke',textBackgroundColor:o.effect==='highlight'?(o.effectColor||'#000000'):''});
    if(o.type==='cta') {const rect=o.badgeShape==='circle'?new fabric.Ellipse({rx:Math.max(o.width+o.padding*2,o.height,text.height+o.padding*2)/2,ry:Math.max(o.width+o.padding*2,o.height,text.height+o.padding*2)/2,fill:elementPaint(o,o.background),stroke:o.borderColor||'#171717',strokeWidth:o.borderWidth||0}):new fabric.Rect({width:o.width+o.padding*2,height:Math.max(o.height,text.height+o.padding*2),fill:elementPaint(o,o.background),rx:o.radius??8,ry:o.radius??8,stroke:o.borderColor||'#171717',strokeWidth:o.borderWidth||0});text.set({left:o.padding,top:o.verticalAlign==='middle'?(rect.height-text.height)/2:o.verticalAlign==='bottom'?rect.height-text.height-o.padding:o.padding,editable:false});obj=new fabric.Group([rect,text],{...common,subTargetCheck:true,interactive:false});}
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
   let left=obj.left,top=obj.top,angle=obj.angle,sx=obj.scaleX,sy=obj.scaleY,flipX=!!obj.flipX,flipY=!!obj.flipY;
   if(obj.group?.type==='activeselection'){
    const t=fabric.util.qrDecompose(obj.calcTransformMatrix());
    const clone=new fabric.Rect({width:obj.width,height:obj.height,strokeWidth:obj.strokeWidth,scaleX:t.scaleX,scaleY:t.scaleY,angle:t.angle,originX:'left',originY:'top'});
    clone.setPositionByOrigin(new fabric.Point(t.translateX,t.translateY),'center','center');
    left=clone.left;top=clone.top;angle=t.angle;sx=clone.scaleX;sy=clone.scaleY;flipX=!!clone.flipX;flipY=!!clone.flipY;
   }
   const base=o.type==='image'?(o.role==='photograph'?Math.max(o.width/obj.width,o.height/obj.height):Math.min(o.width/obj.width,o.height/obj.height)):1;
   Object.assign(o,{left,top,angle,scaleX:sx/base,scaleY:sy/base,visible:obj.visible});
   if(o.type==='image')Object.assign(o,{flipX,flipY});
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
   if(['text','cta'].includes(o.type)){const t=o.type==='cta'?obj.getObjects()[1]:obj;row.textHeight=t.height;row.textWidth=t.width;row.lineCount=t.textLines.length;
    // Textbox.calcTextWidth measures already-wrapped lines. A separate Text
    // measures the complete line with the same loaded font and spacing.
    const natural=new fabric.Text(t.text,{fontFamily:t.fontFamily,fontSize:t.fontSize,fontWeight:t.fontWeight,fontStyle:t.fontStyle,charSpacing:t.charSpacing,lineHeight:t.lineHeight,direction:t.direction});
    row.naturalTextWidth=natural.calcTextWidth();natural.dispose();row.fontSize=t.fontSize;}
   if(o.role==='logo') {const el=obj.getElement(),c=document.createElement('canvas');c.width=el.naturalWidth||el.width;c.height=el.naturalHeight||el.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(el,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;const colours=new Map();let x0=c.width,y0=c.height,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>32){if(pixels[(y*c.width+x)*4+3]>240){const i=(y*c.width+x)*4,key='#'+[pixels[i],pixels[i+1],pixels[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');colours.set(key,(colours.get(key)||0)+1);}x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}row.colours=[...colours].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([colour])=>colour);row.visibleWidth=x1<0?0:(x1-x0+1)*obj.scaleX;row.visibleHeight=y1<0?0:(y1-y0+1)*obj.scaleY;}
   return row;
  });
 }
 function marginIssue(doc,b,tolerance=.5){const outside=b.left<doc.safeMargin-tolerance||b.top<doc.safeMargin-tolerance||b.left+b.width>doc.canvas.width-doc.safeMargin+tolerance||b.top+b.height>doc.canvas.height-doc.safeMargin+tolerance;if(!outside)return null;if(doc.compositionPolicy?.framingToleranceVersion===1){if(b.left< -tolerance||b.top< -tolerance||b.left+b.width>doc.canvas.width+tolerance||b.top+b.height>doc.canvas.height+tolerance)return b.id+': extends beyond canvas';return 'Advisory: '+b.id+': outside preferred safe margins';}return b.id+': outside safe margins';}
 function validate(canvas,doc,loadIssues=[],observedRegions=[],contrastEvidence=[]) {
  const issues=[...loadIssues], margin=doc.safeMargin, boxes=[];
  let backdrop;try{const visibility=canvas.getObjects().map(o=>o.visible);try{canvas.getObjects().forEach(o=>{if(!['photograph','copy-panel','contrast-overlay'].includes(o.layerRole))o.visible=false;});backdrop=canvas.toCanvasElement(1,{viewportTransform:false});}finally{canvas.getObjects().forEach((o,i)=>o.visible=visibility[i]);canvas.requestRenderAll();}}catch{issues.push('Photographic contrast sampling unavailable; inspect visually.');}

  for(const obj of canvas.getObjects()) {
   const o=doc.objects.find(o=>o.id===obj.layerId);if(!obj.visible)continue;
   const b=obj.getBoundingRect();
   if(!['photograph','copy-panel','contrast-overlay'].includes(o.role)) {
    for(const r of [...(doc.protectedRegions||[]).map(r=>({...r,basis:'planned'})),...observedRegions.map(r=>({...r,basis:'observed'}))])if(b.left<r.left+r.width&&b.left+b.width>r.left&&b.top<r.top+r.height&&b.top+b.height>r.top)issues.push(o.id+': overlaps '+r.basis+' protected '+r.kind+' area '+r.id+'.');
    const marginFinding=marginIssue(doc,{...b,id:o.id},1);if(marginFinding)issues.push(marginFinding+'.');
    if(['text','cta'].includes(o.type)) {
     const text=o.type==='cta'?obj.getObjects()[1]:obj;
     if(text.height>(o.height-(o.type==='cta'?2*o.padding:0))+1||text.width>o.width+1) issues.push((doc.compositionPolicy?.reviewChecksVersion===2?'Advisory: ':'')+o.id+': text overflows its planned box.'+(doc.compositionPolicy?.reviewChecksVersion===2?'':' Shorten copy or reduce size.'));
     const panel=doc.objects.find(o=>o.role==='copy-panel'&&!o.shade&&o.visible!==false);
     const panelObject=panel&&canvas.getObjects().find(p=>p.layerId===panel.id),pb=panelObject?.getBoundingRect();const onPanel=panelObject&&canvas.getObjects().indexOf(panelObject)<canvas.getObjects().indexOf(obj)&&pb&&b.left>=pb.left&&b.top>=pb.top&&b.left+b.width<=pb.left+pb.width&&b.top+b.height<=pb.top+pb.height;
     const bg=o.type==='cta'?o.background:onPanel?panel.fill:null;
     if(!bg){let ratios=[];try{const context=backdrop?.getContext('2d');if(context){for(let row=1;row<13;row++)for(let col=1;col<13;col++){const x=Math.round((b.left+b.width*col/13)*canvas.getZoom()),y=Math.round((b.top+b.height*row/13)*canvas.getZoom());if(x<0||y<0||x>=backdrop.width||y>=backdrop.height)continue;const rgb=context.getImageData(x,y,1,1).data,hex='#'+[...rgb].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''),a=luminance(o.fill),c=luminance(hex);ratios.push((Math.max(a,c)+.05)/(Math.min(a,c)+.05));}}}catch{}contrastEvidence.push({id:o.id,basis:'photographic-box-samples',sampleCount:ratios.length,minimumRatio:ratios.length?Math.min(...ratios):null,threshold:4.5,status:!ratios.length?'unknown':Math.min(...ratios)<4.5?'fail':'pass'});if(ratios.length&&Math.min(...ratios)<4.5)issues.push(o.id+': low sampled photographic contrast ('+Math.min(...ratios).toFixed(1)+':1 minimum). Inspect text against the scene.');else issues.push(o.id+': contrast over photograph '+(ratios.length?'sampled; detailed visual review remains required.':'requires visual review.'));}
     else if(/^#[a-f0-9]{6}$/i.test(o.fill)&&/^#[a-f0-9]{6}$/i.test(bg)){const a=luminance(o.fill),c=luminance(bg),ratio=(Math.max(a,c)+.05)/(Math.min(a,c)+.05);contrastEvidence.push({id:o.id,basis:'solid-background',sampleCount:1,minimumRatio:ratio,threshold:4.5,status:ratio<4.5?'fail':'pass'});if(ratio<4.5)issues.push(o.id+': low text contrast ('+ratio.toFixed(1)+':1).');}
    }
    for(const above of canvas.getObjects().slice(canvas.getObjects().indexOf(obj)+1)){if(!above.visible||!['photograph','copy-panel','contrast-overlay'].includes(above.layerRole))continue;const c=above.getBoundingRect();if(b.left<c.left+c.width&&b.left+b.width>c.left&&b.top<c.top+c.height&&b.top+b.height>c.top)issues.push(o.id+': covered by '+above.layerRole+'. Check the layer order.');}
    boxes.push({id:o.id,...b});
   }
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top)issues.push(a.id+' overlaps '+b.id+'.');}
  return heuristicIssues(doc,[...new Set(issues)]);
 }
 // Presentation only: never alter stored errors, contracts, artwork text or billing evidence.
 function optionLabel(route){return route==='continuity'?'Alternative set 1':route==='exploration'?'Alternative set 2':/^(?:Option|Alternative set) \d+$/.test(route||'')?route.replace(/^Option /,'Alternative set '):'Alternative set';}
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
 function clientError(error,context='action'){const text=clientErrorMessage(error,context);const suffix=typeof error==='string'?error.match(/Error (CA-\d{3})(?: · Reference (CAI-[A-F0-9]{12}))?/):null;if(suffix)return text+' Error '+suffix[1]+(suffix[2]?' · Reference '+suffix[2]:'');return /^CA-\d{3}$/.test(error?.clientCode||'')?text+' Error '+error.clientCode+(error.reference?' · Reference '+error.reference:''):text;}
 function clientErrorMessage(error,context='action'){
  const raw=String(error?.message||error?.error||error||'');
  const fallback={image:'We couldn’t load this image. Your work is safe.',save:'We couldn’t save your changes. Retry saving or download a recovery file.',editor:'We couldn’t prepare your design for editing. Your original is safe. Retry opening it.',generation:'We couldn’t finish this design. Your brief is saved. Check status before trying again.',download:'We couldn’t prepare this download. Retry or return to your creative.',readiness:'The readiness check could not finish. The service did not provide a recognisable reason. Please report this issue for investigation.',review:'We couldn’t load the review. Retry loading the details.',upload:'We couldn’t add this file. Retry or choose another file.',action:'We couldn’t complete this action. Please retry.'};
  if(/(charge|billing|usage|cost).{0,50}(unknown|uncertain)|(unknown|uncertain).{0,50}(charge|billing|usage|cost)/i.test(raw))return 'The charge for this attempt is unknown. Check Usage & costs before starting a new attempt.';
  if(context==='readiness'){
   if(error?.status===401)return 'Your session has expired. Sign in again, then check your brief.';
   if(error?.status===403)return 'Your account does not have permission to create this request. Ask your workspace administrator for access.';
   if(/Saved production scope does not cover this product/i.test(raw))return 'Studio found saved creation settings for a different product. Your brief is safe. Ask your workspace administrator to correct the product setup, then check again.';
   if(/Approved logo changed since/i.test(raw))return 'The brand logo has changed since the creation settings were saved. Ask your workspace administrator to update those settings, then check again.';
   if(/Brand conflict changed|Production guidance is unresolved/i.test(raw))return 'The brand guidance has changed or contains an unresolved conflict. Ask your workspace administrator to review the creation settings before continuing.';
   if(/production scope|saved production choice/i.test(raw))return 'The saved creation setup no longer matches this product or brand. Ask your workspace administrator to update it, then check again.';
   if(/Saved product snapshot unavailable/i.test(raw))return 'The saved product information is unavailable. Reimport this product in Brand Library, then select it again.';
   if(/Complete this brand.s research/i.test(raw))return 'The brand guidance is not ready for creation. Complete its setup in Brand Library, then check again.';
   if(/Save the approved brand logo/i.test(raw))return 'The brand logo has not been set up. Add it in Brand Library, then check again.';
   if(/Selected reference is not available/i.test(raw))return 'A selected reference is not ready to use. Process it in Brand Library or remove it from this brief.';
   if(/fetch failed|Failed to fetch|ECONN|network error|socket hang up/i.test(raw))return 'We couldn’t connect to Studio to check this brief. Check your connection and that Studio is running, then check again.';
   if(/timeout|timed out|deadline/i.test(raw))return 'The readiness check took too long. Please check again shortly.';
   if(error?.status===429||error?.status===503||/HTTP (429|503)|rate limit|service unavailable/i.test(raw))return 'The readiness service is temporarily unavailable. Please check again shortly.';
   if(/The creation estimate is unavailable/i.test(raw))return 'The creation estimate could not be prepared. Check again before starting creation.';
   if(error?.status>=500)return 'The readiness check encountered an unexpected problem. Please report this issue so your administrator can investigate.';
  }
  if(context==='generation'){
   const ending=' Your brief is saved.';
   if(/already reserved|AMBIGUOUS_PROVIDER_REQUEST|outcome is unresolved/i.test(raw))return 'We couldn’t confirm whether the previous attempt finished. Check its status before restarting; earlier charges may still apply.';
   if(/fetch failed|Failed to fetch|ECONN|connection (lost|closed|reset)|network error|socket hang up/i.test(raw))return 'The connection to the creation service was interrupted.'+ending+' Check the project status before starting anything new; the earlier attempt may still be running.';
   if(/timeout|timed out|time budget|deadline/i.test(raw))return 'Creation took longer than the allowed time.'+ending+' Check the project status before starting anything new; earlier charges may still apply.';
   if(/rate limit|too many requests|HTTP 429|service unavailable|HTTP 503/i.test(raw))return 'The creation service is temporarily busy.'+ending+' Please retry shortly.';
   if(/schema|validated contract|agent output/i.test(raw))return 'We couldn’t use part of the generated response.'+ending+' Use Retry to try again.';
  }
  if(/quota|storage full|Device storage is unavailable/i.test(raw))return 'Your browser could not save this work. Keep this page open and copy or download your brief before leaving.';
  if(error?.status===409&&context==='editor')return 'This design changed while preparing it. Retry opening the latest version.';
  if(error?.status===409)return 'A newer version is available. Compare versions, load the latest, or save your changes separately.';
  if(/\b(?:creative|brand|product|resp)_[a-z0-9_-]{8,}|\b(?:creative|brand|product|asset)-[a-f0-9-]{16,}|schema|token.?limit|provider|agent output|GPT[- ]|Gemini|ECONN|ENOENT|fetch failed|Failed to fetch|TypeError|SyntaxError|JSON|stack trace|HTTP \d|Request failed \(|<html|\/Users\/|\bat \w+ \(/i.test(raw))return fallback[context]||fallback.action;
  // Local, actionable validation remains useful (sizes, locked selections, missing inputs).
  if(/^(We couldn’t|A newer version|The charge|Choose|Select|Unlock|Use |Add |Enter |Keep |This (design|file|image|creative|brief|draft|project|product|item|campaign)|The (design|workspace|file|image)|Your (saved|work|changes|brief|design|organisation)|File (must|could)|Image (is not readable|content)|Not added|Only |Maximum |Nothing |No (saved|image|creative|product|brand)|Unsaved changes|Upload history is only on screen|Changes only on screen|Saved locally|Save failed|Could not check the latest edit|Could not save|Some images are missing|Export blocked|Missing approved font|Original preview unavailable)/i.test(raw)&&raw.length<=500)return clientText(raw);
  return fallback[context]||fallback.action;
 }
 // Applies only to locally measured heuristics, never to model observations.
 function heuristicIssues(doc,issues){if(doc.compositionPolicy?.visualJudgmentVersion!==1)return issues;return issues.map(issue=>/^Advisory: /.test(issue)?issue:/(?:low .*contrast|measured contrast below|contrast could not be measured|contrast over photograph|local background readability|font weight must be verified regular|horizontally compressed lettering|negative letter spacing|crowded (?:wrapped )?line spacing|insufficient (?:subject\/logo|text) clearance| overlaps )/.test(issue)?'Advisory: '+issue:issue);}
 function downloadName({brand,project,width,height,option,revision,extension,page}){const segment=(value,fallback)=>{let text=String(value||fallback).normalize('NFC').replace(/(?:creative|brand|asset|product)-[a-f0-9-]{16,}/gi,'').replace(/[^\p{L}\p{N}.-]+/gu,'-').replace(/^[.-]+|[.-]+$/g,'')||fallback;while(new TextEncoder().encode(text).length>42)text=Array.from(text).slice(0,-1).join('');return text;};return [segment(brand,'Brand'),segment(project,'Project'),...(Number.isInteger(page)&&page>0&&page<=999?['Page-'+String(page).padStart(2,'0')]:[]),segment(width&&height?width+'x'+height:'Creative','Creative'),segment(optionLabel(option),'Option'),Number.isInteger(revision)?'R'+revision:'Original'].join('_')+'.'+(['png','jpg','jpeg','webp','zip','svg'].includes(extension)?extension:'png');}
 const arrange=(()=>{
 function union(boxes){const left=Math.min(...boxes.map(b=>b.left)),top=Math.min(...boxes.map(b=>b.top));return {left,top,width:Math.max(...boxes.map(b=>b.left+b.width))-left,height:Math.max(...boxes.map(b=>b.top+b.height))-top};}
 function units(doc,ids,boxes){const selected=new Set(ids),groups=new Map();if(!ids.length)throw Error('Select elements to arrange.');for(const id of ids){const o=doc.objects.find(o=>o.id===id);if(!o||o.locked||o.visible===false||o.role==='photograph')throw Error('Choose visible, unlocked elements.');if(!boxes[id])throw Error('A selected element is unavailable.');if(o.groupId&&doc.objects.some(m=>m.groupId===o.groupId&&!selected.has(m.id)))throw Error('Select the whole group, or ungroup it first.');const key=o.groupId||o.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}return [...groups].map(([id,members])=>({id,members,...union(members.map(id=>boxes[id]))}));}
 function layout(doc,ids,boxes,action,scope='page'){const items=units(doc,ids,boxes),bounds=union(items),page={left:doc.safeMargin,top:doc.safeMargin,width:doc.canvas.width-2*doc.safeMargin,height:doc.canvas.height-2*doc.safeMargin},moves={};const move=(item,left,top)=>item.members.forEach(id=>moves[id]={dx:left-item.left,dy:top-item.top});
  if(['left','center','right','top','middle','bottom','center-page'].includes(action)){
   if(scope==='selection'&&items.length<2)throw Error('Select at least two elements or groups to align to the selection.');const target=scope==='selection'?bounds:page,align=item=>{let left=item.left,top=item.top;if(['left','center','right','center-page'].includes(action))left=action==='left'?target.left:action==='right'?target.left+target.width-item.width:target.left+(target.width-item.width)/2;if(['top','middle','bottom','center-page'].includes(action))top=action==='top'?target.top:action==='bottom'?target.top+target.height-item.height:target.top+(target.height-item.height)/2;move(item,left,top);};if(scope==='page')align({...bounds,members:ids});else items.forEach(align);
  }else if(['distribute-x','distribute-y'].includes(action)){
   if(items.length<3)throw Error('Select at least three separate elements or groups to space evenly.');const axis=action==='distribute-x'?'left':'top',size=axis==='left'?'width':'height',sorted=[...items].sort((a,b)=>a[axis]-b[axis]),start=sorted[0][axis],end=Math.max(...sorted.map(item=>item[axis]+item[size])),gap=(end-start-sorted.reduce((n,b)=>n+b[size],0))/(sorted.length-1);if(gap<0)throw Error('Spread the outer elements farther apart, or use Tidy up to remove overlaps.');let at=start;sorted.forEach(item=>{move(item,axis==='left'?at:item.left,axis==='top'?at:item.top);at+=item[size]+gap;});
  }else if(action==='tidy-up'){
   if(items.length<2)throw Error('Select at least two elements or groups to tidy up.');const cols=items.length<=3?(bounds.width>=bounds.height?items.length:1):Math.ceil(Math.sqrt(items.length)),rows=Math.ceil(items.length/cols),cw=Math.max(...items.map(o=>o.width)),ch=Math.max(...items.map(o=>o.height)),gap=Math.max(8,Math.round(Math.min(doc.canvas.width,doc.canvas.height)*.02)),width=cols*cw+(cols-1)*gap,height=rows*ch+(rows-1)*gap;if(width>page.width||height>page.height)throw Error('There is not enough page space for this grid. Select fewer elements or reduce their sizes first.');const left=Math.max(page.left,Math.min(page.left+page.width-width,bounds.left+bounds.width/2-width/2)),top=Math.max(page.top,Math.min(page.top+page.height-height,bounds.top+bounds.height/2-height/2)),sorted=[...items].sort((a,b)=>Math.round((a.top-bounds.top)/(ch*.5))-Math.round((b.top-bounds.top)/(ch*.5))||a.left-b.left);sorted.forEach((item,i)=>move(item,left+i%cols*(cw+gap)+(cw-item.width)/2,top+Math.floor(i/cols)*(ch+gap)+(ch-item.height)/2));
  }else throw Error('Unknown arrangement action.');return moves;
 }
 return {layout,units,union};
 })();
 return {heuristicIssues,marginIssue,mount,capture,validate,measure,family,snap,align,downloadName,optionLabel,clientText,clientError,arrange,elementIcons};
});
