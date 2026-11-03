'use strict';
// Isolated, loopback-only experiment. Does not load or mutate the production runtime.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),brand='brand-1923d633-e03e-44cc-84b2-bbfb5c152710',job='creative-b0298c3b-931f-438b-a92a-55b593c3f629';
const files=new Map();
for(const name of ['fabric-clean-proof.html','fabric-clean-proof.js','canvas-model.js','vendor/fabric.min.js'])files.set('/creative-ai/'+name,path.join(root,'public/creative-ai',name));
for(const name of ['asset-b47fa9a58915317eb5fe6a16.woff2','asset-cdb6094ba75edf2e9e001961.woff2','asset-6e5fd8bea6f5ca7cbda1c6f9.svg'])files.set('/creative-ai/api/brands/'+brand+'/canvas-assets/'+name,path.join(root,'output/creative-ai/brands',brand,'canvas-assets',name));
const photo='photo-continuity-custom_studio-social-story.png';files.set('/creative-ai/api/jobs/'+job+'/files/'+photo,path.join(root,'output/creative-ai/jobs',job,photo));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{const file=files.get(new URL(req.url,'http://localhost').pathname);if(req.method!=='GET'||!file){res.writeHead(404);res.end('Not found');return;}try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(500);res.end('Proof asset unavailable');}}).listen(1847,'127.0.0.1',()=>console.log('Fabric proof: http://127.0.0.1:1847/creative-ai/fabric-clean-proof.html'));
