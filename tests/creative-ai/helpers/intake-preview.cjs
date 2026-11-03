'use strict';
// Read-only application preview. No provider, job worker, authentication bypass or production writes.
const http=require('http'),fs=require('fs/promises'),path=require('path');
const root=path.resolve(__dirname,'../../..');
async function createPreview(port=0){
const ids=['brand-1923d633-e03e-44cc-84b2-bbfb5c152710','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'];
const brands=await Promise.all(ids.map(id=>fs.readFile(path.join(root,'output/creative-ai/brands',id,'brand.json'),'utf8').then(JSON.parse)));
const products=Object.fromEntries(await Promise.all(ids.map(async id=>{const dir=path.join(root,'output/creative-ai/brands',id,'products');return [id,(await Promise.all((await fs.readdir(dir)).map(x=>fs.readFile(path.join(dir,x,'profile.json'),'utf8').then(JSON.parse).catch(()=>null)))).filter(Boolean)];})));
for(const brandId of ids)for(const p of products[brandId])if(!Array.isArray(p.features))try{
 const base=path.join(root,'output/creative-ai/brands',brandId,'products',p.id),file=path.resolve(base,p.snapshot,'page.html');if(!file.startsWith(base+path.sep))continue;
 const html=await fs.readFile(file,'utf8');if(require('crypto').createHash('sha256').update(html).digest('hex')===p.pageHash)p.features=require('../../../lib/creative-ai/runtime/product-feature-list').extract(html,require('../../../lib/creative-ai/runtime/research').cleanText);
}catch{/* Missing saved source stays missing. */}
// Serve only approved logos explicitly saved in each brand's own manifest.
const logos=new Map();
for(const brand of brands){const a=brand.canvasAssets;if(a?.brandId!==brand.id)continue;for(const logo of [...(a.logos||[]),a.logo].filter(Boolean)){
 if(logo.brandId!==brand.id||logo.approved!==true||!/^asset-[a-f0-9]+\.(svg|png|jpe?g|webp)$/.test(logo.filename||''))continue;
 const url='/creative-ai/api/brands/'+brand.id+'/canvas-assets/'+logo.filename;if(logo.url!==url)continue;
 logos.set(url,{file:path.join(root,'output/creative-ai/brands',brand.id,'canvas-assets',logo.filename),type:logo.filename.endsWith('.svg')?'image/svg+xml':logo.filename.endsWith('.png')?'image/png':logo.filename.endsWith('.webp')?'image/webp':'image/jpeg'});
}}
// Product images are served only through the saved same-brand asset manifest.
const productImages=new Map();
for(const brandId of ids)for(const product of products[brandId]){if(product.brandId!==brandId)continue;const base=path.join(root,'output/creative-ai/brands',brandId,'products',product.id);for(const asset of product.assets||[]){if(asset.type!=='image'||asset.status!=='stored')continue;for(const [kind,key]of [['preview','preview'],['original','file']]){if(!asset[key])continue;const file=path.resolve(base,asset[key]);if(!file.startsWith(base+path.sep)||!/[.](png|jpe?g|webp)$/i.test(file))continue;productImages.set('/creative-ai/api/brands/'+brandId+'/products/'+product.id+'/'+asset.id+'/'+kind,{file,type:file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});}}}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};try{
 if(req.method!=='GET')return json({error:'Interface preview only. Generation and PDF extraction are unavailable here. Your draft is saved on this device.'},501);
 if(productImages.has(u.pathname)){const a=productImages.get(u.pathname);res.writeHead(200,{'Content-Type':a.type,'X-Content-Type-Options':'nosniff'});return res.end(await fs.readFile(a.file));}
 if(logos.has(u.pathname)){const logo=logos.get(u.pathname),bytes=await fs.readFile(logo.file);res.writeHead(200,{'Content-Type':logo.type,'X-Content-Type-Options':'nosniff'});return res.end(bytes);}
 if(u.pathname==='/creative-ai/api/brands')return json(brands);
 if(u.pathname==='/creative-ai/api/jobs')return json([]);
 const match=u.pathname.match(/^\/creative-ai\/api\/brands\/([^/]+)\/(products|assets)$/);if(match&&ids.includes(match[1]))return json(match[2]==='products'?products[match[1]]:{assets:[]});
 const file=u.pathname.replace(/^\/creative-ai\//,'');if(!/^(studio(-[a-z]+)?\.(js|css)|studio\.html|canvas-model\.js|editable-canvas\.(js|css)|vendor\/(fabric|lottie)\.min\.js)$/.test(file))return json({},404);
 let bytes=await fs.readFile(path.join(root,'public/creative-ai',file));if(file==='studio.html')bytes=Buffer.from(bytes.toString().replace(/<script[^>]*src="[^"]*session\.js[^\"]*"[^>]*><\/script>/g,'').replace('</body>','<div style="position:fixed;bottom:0;left:0;right:0;background:#281d40;color:white;padding:8px;text-align:center;z-index:10000;font:12px sans-serif">INTAKE PREVIEW · saved product data · device-only drafts · generation unavailable</div></body>'));
 res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(bytes);
 }catch(e){json({error:e.message},500);}});
 await new Promise(r=>server.listen(port,'127.0.0.1',r));return {server,brands,products,url:'http://127.0.0.1:'+server.address().port+'/creative-ai/studio.html'};
}
module.exports={createPreview};if(require.main===module)createPreview(Number(process.argv[2]||1857)).then(f=>console.log(f.url));
