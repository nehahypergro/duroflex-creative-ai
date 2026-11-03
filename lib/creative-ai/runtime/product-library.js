'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const {getBytes}=require('./network'),{validateProductPage,host}=require('./product-input'),{parsePage,cleanText}=require('./research');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const GROUPS=['product-images','tiles','a-plus-content','videos','supporting-content'];
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
function canonical(url){const u=new URL(url);u.hash='';u.search='';u.pathname=u.pathname.replace(/^\/collections\/[^/]+\/products\//,'/products/');u.hostname=u.hostname.replace(/^www\./,'');return u.href.replace(/\/$/,'');}
function parseProduct(html,url,shopify=null){
 const structured=[],breadcrumbs=[];function visit(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(visit);return;}const types=[o['@type']].flat();if(types.some(t=>['Product','ProductGroup'].includes(t)))structured.push(o);if(types.includes('BreadcrumbList'))breadcrumbs.push(...(o.itemListElement||[]));for(const k of ['@graph','mainEntity','hasVariant'])visit(o[k]);}
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(m[1]));}catch{}
 const product=structured.find(p=>p.url&&canonical(new URL(p.url,url).href)===canonical(url))||(structured.length===1?structured[0]:{}),parsed=parsePage(html,url);
 const title=cleanText(product.name||shopify?.title||/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]||parsed.title);
 let main=/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]||html;
 main=main.replace(/<(product-recommendations|related-products)\b[\s\S]*?<\/\1>/gi,'').replace(/<section\b[^>]*(?:recommend|related-product|recently-viewed)[^>]*>[\s\S]*?<\/section>/gi,'');
 main=main.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi,'');
 const media=new Map(),add=(value,label,group,type='image',basis='Page-linked asset; role inferred from its section')=>{try{const u=new URL(String(value).replace(/&amp;/g,'&'),url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return;const shopFile=/\/files\/([^/]+)$/.exec(u.pathname);const key=shopFile&&(u.hostname===new URL(url).hostname||u.hostname==='cdn.shopify.com')?'shopify-file:'+shopFile[1]:u.hostname+u.pathname;if(shopFile)u.searchParams.delete('width');if(!media.has(key))media.set(key,{url:u.href,label:cleanText(label||group).slice(0,180),group,type,basis});}catch{}};
 for(const video of [product.video].flat().filter(Boolean)){if(typeof video==='string')add(video,title,'videos',/\.(mp4|webm)(?:\?|$)/i.test(video)?'video':'embed','Product structured metadata video');else if(video.contentUrl||video.embedUrl)add(video.contentUrl||video.embedUrl,video.name||title,'videos',video.contentUrl&&!/m3u8/i.test(video.contentUrl)?'video':'embed','Product structured metadata video');}
 for(const image of [product.image].flat().filter(Boolean))add(typeof image==='string'?image:image.url||image.contentUrl,title,'product-images','image','Product structured metadata');
 for(const image of shopify?.images||[])add(typeof image==='string'?image:image.src,title,'product-images','image','Official product JSON gallery');
 for(const item of shopify?.media||[]){if(item.media_type==='video'||item.media_type==='external_video'){for(const source of item.sources||[])add(source.url,title,'videos','video','Official product JSON media');if(item.host&&item.external_id)add(item.host==='youtube'?'https://www.youtube.com/watch?v='+item.external_id:'https://vimeo.com/'+item.external_id,title,'videos','embed','Official product JSON external video');}else if(item.media_type==='image')add(item.src||item.preview_image?.src,item.alt||title,'product-images');}
 const stack=[];for(const m of main.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)){const name=m[1].toLowerCase();if(m[0].startsWith('</')){const index=stack.map(t=>t.name).lastIndexOf(name);if(index>=0)stack.splice(index);continue;}const a=attrs(m[0]);if(a.style&&/background/i.test(a.style))for(const bg of a.style.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi))add(bg[1],a.title||title,'supporting-content','image','Inline background image on product page');if(!['img','video','source','iframe'].includes(name)){if(!['input','br','hr','meta','link','area','embed','wbr'].includes(name)&&!m[0].endsWith('/>'))stack.push({name,a});continue;}const context=[a.class||'',a.alt||'',...stack.map(t=>(t.a.id||'')+' '+(t.a.class||''))].join(' ');if(/recommend|related-product|recently-viewed|suggested.product|complementary|cross.sell/i.test(context))continue;if(stack.some(t=>{try{return t.name==='a'&&/\/products\//.test(t.a.href||'')&&canonical(new URL(t.a.href,url).href)!==canonical(url);}catch{return false;}}))continue;
  let group=/a[-_ +]?plus|aplus|product-a-content|variant_content|enhanced.content|rich.content/i.test(context)?'a-plus-content':/tile|infographic|feature.icon|variant-icons|icon-text-block/i.test(context)?'tiles':/gallery|product.media|product.image/i.test(context)?'product-images':'supporting-content';
  const src=a['data-src']||a.src||a['data-lazy-src']||a.srcset?.split(',')[0].trim().split(/\s/)[0]||a['data-srcset']?.split(',')[0].trim().split(/\s/)[0];
  if(m[1].toLowerCase()==='iframe'){if(/youtube|vimeo|video/i.test(src||''))add(src,a.title,'videos','embed');continue;}
  if(name==='video')stack.push({name,a});
  if(m[1].toLowerCase()==='video'||(/video\//.test(a.type||'')||/\.(mp4|webm|m3u8)(?:\?|$)/i.test(src||''))){if(src)add(src,a.title,'videos',/m3u8/i.test(src)?'embed':'video');if(a.poster)add(a.poster,'Video poster','supporting-content');continue;}
  if(src&&!/logo|payment|social.icon|tracking|pixel|spinner/i.test((a.alt||'')+' '+src))add(src,a.alt||title,group);
 }
 for(const m of main.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)){const a=attrs(m[0]);if(/\.(pdf|mp4|webm)(?:\?|$)/i.test(a.href||''))add(a.href,cleanText(m[0]),/\.(mp4|webm)/i.test(a.href)?'videos':'supporting-content',/\.pdf/i.test(a.href)?'document':'video');}
 const taxonomy=breadcrumbs.sort((a,b)=>(a.position||0)-(b.position||0)).map(b=>({name:cleanText(b.name||b.item?.name||''),url:typeof b.item==='string'?b.item:b.item?.['@id']||b.item?.url||'',basis:'Website breadcrumb'})).filter(b=>b.name&&b.name.toLowerCase()!==title.toLowerCase()&&!/^home$/i.test(b.name));
 if(!taxonomy.length){const breadcrumb=/<(?:nav|div|ol)\b[^>]*(?:breadcrumb)[^>]*>([\s\S]*?)<\/(?:nav|div|ol)>/i.exec(html)?.[1];for(const l of breadcrumb?parsePage(breadcrumb,url).links:[])if(!/^home$/i.test(l.label)&&l.label.toLowerCase()!==title.toLowerCase())taxonomy.push({name:l.label,url:l.url,basis:'Website breadcrumb'});}
 const type=product.category||shopify?.type||shopify?.product_type;if(!taxonomy.length&&typeof type==='string'&&type.trim())taxonomy.push({name:cleanText(type),url:'',basis:'Website product type metadata'});
 const collection=/\/collections\/([^/]+)\/products\//.exec(new URL(url).pathname);if(!taxonomy.length&&collection)taxonomy.push({name:collection[1],url:new URL('/collections/'+collection[1],url).href,basis:'Website collection URL'});
 const contentSections=[...main.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)].slice(0,40).map(m=>({heading:cleanText(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(m[2])?.[1]||'Supporting product content'),group:/a[-_ +]?plus|aplus|product-a-content|variant_content|enhanced.content|rich.content/i.test(m[1])?'a-plus-content':/tile|infographic/i.test(m[1])?'tiles':'supporting-content',text:cleanText(m[2]).slice(0,6000)})).filter(s=>s.text.length>20);
 const variants=(shopify?.variants||product.hasVariant||[]).map(v=>{
  const values=Array.isArray(v.options)&&v.options.length?v.options:[v.option1,v.option2,v.option3].filter(x=>x!=null);
  const attributes=values.map((value,i)=>({name:cleanText(shopify?.options?.[i]?.name||shopify?.options?.[i]||('Option '+(i+1))),value:cleanText(value)}));
  for(const key of ['color','size','material'])if(v[key]&&!attributes.some(a=>a.name.toLowerCase()===key))attributes.push({name:key,value:cleanText(v[key])});
  return {id:String(v.id||v['@id']||''),sku:String(v.sku||''),name:cleanText(v.title||v.name||''),options:values,attributes,available:typeof v.available==='boolean'?v.available:null};
 });
 return {features:require('./product-feature-list').extract(main,cleanText),specificationFields:require('./product-fact-fields').extract(main,cleanText),catalogVersion:2,officialProductId:String(shopify?.id||product.productID||''),name:title,sku:product.sku?String(product.sku):null,description:cleanText(product.description||shopify?.description||''),brand:typeof product.brand==='string'?product.brand:product.brand?.name||'',taxonomy,category:taxonomy.find(t=>!/^products?|shop|all$/i.test(t.name))?.name||'Uncategorized',variants,options:shopify?.options||[],contentSections,text:cleanText(main).slice(0,100000),media:[...media.values()],identityBasis:Object.keys(product).length?'Product structured metadata':shopify?'Official product JSON':'Page heading; SKU identity requires research audit'};
}
class ProductLibrary{
 constructor(brands){this.brands=brands;this.queues=new Map();this.identities=new (require('./product-identity').ProductIdentityStore)(this);}
 dir(brandId){return path.join(this.brands.dir(brandId),'products');}
 async list(brandId){await this.brands.read(brandId);let names;try{names=await fs.readdir(this.dir(brandId));}catch(e){if(e.code==='ENOENT')return [];throw e;}return (await Promise.all(names.filter(n=>/^product-[a-f0-9]{20}$/.test(n)).map(id=>this.read(brandId,id).catch(()=>null)))).filter(Boolean).sort((a,b)=>b.collectedAt.localeCompare(a.collectedAt));}
 async read(brandId,id){await this.brands.read(brandId);if(!/^product-[a-f0-9]{20}$/.test(id))throw Error('Invalid product ID');return JSON.parse(await fs.readFile(path.join(this.dir(brandId),id,'profile.json'),'utf8'));}
 // Client catalog view only: enrich old saved snapshots and check local files.
 // Never rewrite historical profiles or fetch a website during a library read.
 async catalog(brandId,id){
  if(!id){const rows=await this.list(brandId),out=[];for(const p of rows)out.push(await this.catalog(brandId,p.id));return out;}
  const p=await this.read(brandId,id),base=path.resolve(this.dir(brandId),id);
  const safe=relative=>{const file=path.resolve(base,String(relative||''));if(!file.startsWith(base+path.sep))throw Error('Invalid saved product path');return file;};
  if(p.catalogVersion!==2)try{const j=JSON.parse(await fs.readFile(safe(p.snapshot+'/product.json'),'utf8')),parsed=parseProduct('',p.pageUrl,j);p.officialProductId=parsed.officialProductId;p.options=parsed.options;p.variants=(p.variants||[]).map(v=>({...v,attributes:parsed.variants.find(x=>x.id===String(v.id))?.attributes||v.attributes||[]}));}catch{/* Missing legacy metadata stays missing. */}
  if(!p.specificationFields||!Array.isArray(p.features))try{const html=await fs.readFile(safe(p.snapshot+'/page.html'),'utf8');if(hash(html)===p.pageHash){const parsed=parseProduct(html,p.pageUrl);p.specificationFields??=parsed.specificationFields;p.features??=parsed.features;}}catch{/* A missing saved source remains missing. */}
  p.productFields=require('./product-fact-fields').build(p);
  const usableImageIds=[];
  for(const a of p.assets||[]){if(a.group!=='product-images'||a.type!=='image'||a.status!=='stored'||!a.file)continue;
   try{const bytes=await fs.readFile(safe(a.file));if(a.sha256&&hash(bytes)!==a.sha256)continue;const m=await sharp(bytes,{limitInputPixels:40000000}).metadata();if(m.width>=40&&m.height>=40){await sharp(bytes,{limitInputPixels:40000000}).resize(1,1).raw().toBuffer();usableImageIds.push(a.id);break;}}catch{/* Failed images remain in the saved list. */}
  }
  const issues=[];if(!usableImageIds.length)issues.push('No readable saved product image is available.');
  if(!p.name?.trim())issues.push('Product name is missing.');if(!p.description?.trim()&&!(p.contentSections||[]).some(s=>s.text?.trim().length>20))issues.push('Product details are missing.');
  if(!(p.variants||[]).length||(p.variants||[]).some(v=>!v.id||!v.name))issues.push('Exact variant details are missing.');
  const state=!usableImageIds.length?'images-missing':issues.length?'details-needed':'ready';
  return {...p,readiness:{state,label:state==='ready'?'Ready to use':state==='images-missing'?'Images missing':'Details needed',issues,usableImageIds,checkedAt:new Date().toISOString()}};
 }
 // Read an exact saved page/variant without fetching or silently refreshing it.
 // Query parameters matter here even though the library groups variants together.
 async savedSource(brandId,url){
  const brand=await this.brands.read(brandId),valid=validateProductPage(url,brand.brandUrl),id='product-'+hash(canonical(valid)).slice(0,20);
  let current;try{current=await this.read(brandId,id);}catch(e){if(e.code==='ENOENT')return null;throw e;}
  const pageKey=value=>{const u=new URL(value);u.hash='';u.hostname=u.hostname.replace(/^www\./,'');u.pathname=u.pathname.replace(/^\/collections\/[^/]+\/products\//,'/products/');u.searchParams.sort();return u.href;};
  for(const snapshot of [current.snapshot,...(current.history||[]).map(h=>h.snapshot).reverse()]){
   if(!/^snapshot-[a-zA-Z0-9-]+$/.test(snapshot))throw Error('Invalid saved product snapshot.');
   const base=path.join(this.dir(brandId),id,snapshot);
   let profile;try{profile=snapshot===current.snapshot?current:JSON.parse(await fs.readFile(path.join(base,'profile.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
   if(profile.brandId!==brandId||profile.id!==id||profile.snapshot!==snapshot)throw Error('Saved product snapshot belongs to a different workspace.');
   const equivalent=value=>{const u=new URL(pageKey(value));for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||['_gl','_ga','gclid','fbclid'].includes(k))u.searchParams.delete(k);const variant=u.searchParams.get('variant');if(variant&&profile.variants?.some(v=>String(v.id)===variant&&v.sku))u.searchParams.delete('variant');u.searchParams.sort();return u.href;};
   if(equivalent(profile.requestedUrl||profile.pageUrl)!==equivalent(valid))continue;
   validateProductPage(profile.pageUrl,brand.brandUrl);
   const bytes=await fs.readFile(path.join(base,'page.html'));
   if(hash(bytes)!==profile.pageHash)throw Error('Saved product page changed. Refresh this product in its library before generating.');
   if(!profile.specificationFields)profile.specificationFields=parseProduct(bytes.toString('utf8'),profile.pageUrl).specificationFields;
   profile.productFields=require('./product-fact-fields').build(profile);
   return {profile,url:profile.pageUrl,contentType:'text/html',bytes};
  }
  return null;
 }
 async savedImage(brandId,profile,url){
  await this.brands.read(brandId);
  if(profile.brandId!==brandId||!/^product-[a-f0-9]{20}$/.test(profile.id))throw Error('Saved image belongs to a different workspace.');
  const key=value=>{const u=new URL(value);const shopFile=/\/files\/([^/]+)$/.exec(u.pathname);if(shopFile&&(host(u.href)===host(profile.pageUrl)||u.hostname==='cdn.shopify.com'))return 'shopify-file:'+shopFile[1];u.searchParams.delete('width');u.hash='';u.searchParams.sort();return u.href;};
  const asset=profile.assets.find(a=>a.type==='image'&&a.status==='stored'&&[a.url,a.resolvedUrl].filter(Boolean).some(u=>key(u)===key(url)));
  if(!asset?.file)throw Error('This image is missing from the saved snapshot. Refresh the product library to collect it.');
  const base=path.resolve(this.dir(brandId),profile.id),file=path.resolve(base,asset.file);
  if(!file.startsWith(base+path.sep)||!asset.file.startsWith(profile.snapshot+'/'))throw Error('Invalid saved product image path.');
  const bytes=await fs.readFile(file);if(hash(bytes)!==asset.sha256)throw Error('Saved product image changed. Refresh the product library to collect it.');
  return {url:asset.resolvedUrl||asset.url,contentType:asset.mime,bytes};
 }
 async capture(brandId,url,options={}){const brand=await this.brands.read(brandId),valid=validateProductPage(url,brand.brandUrl),id='product-'+hash(canonical(valid)).slice(0,20),key=brandId+'|'+id;const next=(this.queues.get(key)||Promise.resolve()).catch(()=>{}).then(()=>require('./file-lock').withLock(path.join(this.dir(brandId),id,'.product-update.lock'),()=>this.collect(brand,id,valid,options),{timeoutMs:150000}));this.queues.set(key,next);return next;}
 async collect(brand,id,url,{fetchPage=getBytes,html,finalUrl=url,force=false,jobId=null}={}){
  const previous=await this.read(brand.id,id).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(previous&&!force&&!html)return previous;
  if(!html){const got=await fetchPage(url,{maxBytes:6*1024*1024});if(host(got.url)!==host(brand.brandUrl)||!/text\/html/i.test(got.contentType||''))throw Error('Use an official product webpage for this brand.');html=got.bytes.toString('utf8');finalUrl=got.url;}
  if(host(finalUrl)!==host(brand.brandUrl))throw Error('Product source belongs to another brand.');
  let shopify=null;const handle=/\/products\/([^/]+)/.exec(new URL(finalUrl).pathname)?.[1];if(handle)try{const got=await fetchPage(new URL('/products/'+handle+'.js',finalUrl).href,{maxBytes:4*1024*1024});if(host(got.url)===host(brand.brandUrl))shopify=JSON.parse(got.bytes);}catch{}
  const parsed=parseProduct(html,finalUrl,shopify);if(!parsed.name||(!shopify&&!/"@type"\s*:\s*(?:\[\s*)?"Product(?:Group)?"/i.test(html)&&!handle))throw Error('That URL does not expose a specific product. Use a SKU page.');
  const collectedAt=new Date().toISOString(),snapshot='snapshot-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'),base=path.join(this.dir(brand.id),id,snapshot);await fs.mkdir(base,{recursive:true});await fs.writeFile(path.join(base,'page.html'),html);await fs.writeFile(path.join(base,'page.txt'),parsed.text);if(shopify)await fs.writeFile(path.join(base,'product.json'),JSON.stringify(shopify,null,2));
  const assets=[],gaps=[];let downloadedBytes=0;const maximum=160,deadline=Date.now()+120000;
  for(const [i,item] of parsed.media.slice(0,maximum).entries()){
   const a={id:'media-'+hash(item.url).slice(0,16),...item,status:'linked',file:null,bytes:0,collectedAt};
   try{if(item.type==='embed'){a.note='External embed or stream link retained; video bytes are not downloaded.';}else{
    if(Date.now()>deadline)throw Error('Collection time limit reached; source link retained for a later refresh.');if(downloadedBytes>=320*1024*1024)throw Error('Product snapshot download limit reached (320MB).');
    const got=await fetchPage(item.url,{maxBytes:Math.min(item.type==='video'?64*1024*1024:20*1024*1024,320*1024*1024-downloadedBytes),timeout:12000});let ext,mime=got.contentType.split(';')[0];
    if(item.type==='image'){const meta=await sharp(got.bytes,{limitInputPixels:40000000}).metadata();if(!['png','jpeg','webp','gif','avif','svg'].includes(meta.format))throw Error('Unsupported image type');if(meta.width<40||meta.height<40)throw Error('Tiny image excluded from product library');ext=meta.format==='jpeg'?'jpg':meta.format;a.width=meta.width;a.height=meta.height;}
    else if(item.type==='video'){if(!['video/mp4','video/webm','video/quicktime'].includes(mime))throw Error('Source did not return a supported video');ext=mime==='video/webm'?'webm':mime==='video/quicktime'?'mov':'mp4';}
    else{if(got.bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Source did not return a PDF');ext='pdf';}
    const file=path.join(item.group,a.id+'.'+ext);await fs.mkdir(path.join(base,item.group),{recursive:true});await fs.writeFile(path.join(base,file),got.bytes);a.file=snapshot+'/'+file;a.sha256=hash(got.bytes);a.bytes=got.bytes.length;a.mime=mime||'application/octet-stream';a.status='stored';a.resolvedUrl=got.url;downloadedBytes+=got.bytes.length;
    if(item.type==='image'){const preview=await sharp(got.bytes,{limitInputPixels:40000000}).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).png().toBuffer();a.preview=snapshot+'/'+item.group+'/'+a.id+'-preview.png';await fs.writeFile(path.join(this.dir(brand.id),id,a.preview),preview);}
   }}catch(e){a.status='unavailable';a.note=e.message.slice(0,300);}assets.push(a);
  }
  const unavailable=assets.filter(a=>a.status==='unavailable').length;if(unavailable)gaps.push(unavailable+' media assets could not be downloaded; their source links and errors are retained.');
  if(parsed.media.length>maximum)gaps.push('Found '+parsed.media.length+' media links; first '+maximum+' processed.');
  for(const group of GROUPS)if(!assets.some(a=>a.group===group)&&!parsed.contentSections.some(s=>s.group===group))gaps.push('No '+group.replaceAll('-',' ')+' exposed in the collected page / product JSON.');
  for(const group of GROUPS){await fs.mkdir(path.join(base,group),{recursive:true});const sections=parsed.contentSections.filter(s=>s.group===group);if(sections.length)await fs.writeFile(path.join(base,group,'content.json'),JSON.stringify({pageUrl:finalUrl,collectedAt,sections},null,2)+'\n');}
  const {media,text,...details}=parsed,profile={version:1,id,brandId:brand.id,brandName:brand.name,...details,pageUrl:finalUrl,requestedUrl:url,collectedAt,snapshot,pageHash:hash(html),assets,gaps,downloadedBytes,jobId,history:[...(previous?.history||[]),...(previous?[{snapshot:previous.snapshot,collectedAt:previous.collectedAt,pageHash:previous.pageHash}]:[])],limits:['Exact-SKU official website statements are client-approved source evidence; preserve conditions and unresolved conflicts. Generated artwork is reviewed separately.','Category comes from website breadcrumbs or product type; missing taxonomy remains Uncategorized.','Asset folder roles inferred from page sections; inspect before reuse.','Only media exposed in HTML / official product JSON is discoverable; protected or client-only assets may be missing.'],...(previous?.creativeProjects?{creativeProjects:previous.creativeProjects}:{}),audit:null};
  profile.productFields=require('./product-fact-fields').build(profile);
  await fs.writeFile(path.join(base,'profile.json'),JSON.stringify(profile,null,2)+'\n');const destination=path.join(this.dir(brand.id),id,'profile.json'),temp=destination+'.pending';await fs.writeFile(temp,JSON.stringify(profile,null,2)+'\n');await fs.rename(temp,destination);return profile;
 }
 async attachAudit(brandId,id,audit){const key=brandId+'|'+id,next=(this.queues.get(key)||Promise.resolve()).catch(()=>{}).then(()=>require('./file-lock').withLock(path.join(this.dir(brandId),id,'.product-update.lock'),async()=>{const p=await this.read(brandId,id);if(audit.pageUrl!==p.pageUrl||audit.snapshot!==p.snapshot)return;p.audit={...audit};const dest=path.join(this.dir(brandId),id,'profile.json'),temp=dest+'.pending';await fs.writeFile(temp,JSON.stringify(p,null,2)+'\n');await fs.rename(temp,dest);await fs.writeFile(path.join(this.dir(brandId),id,p.snapshot,'profile.json'),JSON.stringify(p,null,2)+'\n');},{timeoutMs:150000}));this.queues.set(key,next);return next;}
 async file(brandId,id,assetId,variant){const p=await this.read(brandId,id),a=p.assets.find(a=>a.id===assetId),relative=variant==='preview'?a?.preview:a?.file;if(!relative)throw Error('Stored asset not available');const base=path.resolve(this.dir(brandId),id),file=path.resolve(base,relative);if(!file.startsWith(base+path.sep))throw Error('Invalid product asset path');return {file,mime:variant==='preview'?'image/png':a.mime,name:path.basename(file)};}
}
module.exports={ProductLibrary,parseProduct,canonical,GROUPS};
