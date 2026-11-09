'use strict';
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bytes(runtime,pin,brandId){
 if(pin.brandId!==brandId)throw Error('Approved logo belongs to another brand');
 if(!pin.approved||pin.kind!=='logo')throw Error('Logo must be explicitly approved');
 if(typeof pin.filename!=='string'||path.basename(pin.filename)!==pin.filename)throw Error('Invalid approved logo filename');
 const data=await fs.readFile(path.join(runtime.brands.dir(brandId),'canvas-assets',pin.filename));
 if(hash(data)!==pin.sha256)throw Error('Approved logo file changed; restore its approved version');
 return data;
}
async function snapshot(runtime,intake){
 if(!intake.brandId)return null;const brand=await runtime.brands.read(intake.brandId),logo=brand.canvasAssets?.logo;if(!logo)return null;
 await bytes(runtime,logo,intake.brandId);
 return {...structuredClone(logo),assetId:'approved-logo-'+logo.id,sourceId:'source-approved-logo-'+logo.id};
}
// The approved logo is collected when its content-addressed file is saved to the
// brand library. Using the time each job reads it (the previous behaviour) made
// every job's research, and therefore its dossier, a new version.
async function collectedAt(runtime,pin,brandId){
 if(pin.pinnedAt)return pin.pinnedAt;
 const stat=await fs.stat(path.join(runtime.brands.dir(brandId),'canvas-assets',pin.filename));
 return new Date(stat.birthtimeMs>0?Math.min(stat.birthtimeMs,stat.mtimeMs):stat.mtimeMs).toISOString();
}
async function attach(runtime,research,pin,brandId){
 if(!pin)return research;
 const data=await bytes(runtime,pin,brandId),out=structuredClone(research),meta=await sharp(data).metadata(),png=meta.format==='png'?data:await sharp(data).png().toBuffer();
 const source={id:pin.sourceId,kind:'asset',status:'available',label:('Approved brand library logo: '+pin.name).slice(0,180),reference:pin.url||pin.sourceReference,collectedAt:await collectedAt(runtime,pin,brandId),note:pin.sourceReference.slice(0,900)};
 const asset={id:pin.assetId,kind:'logo',label:('Approved production logo from this brand library: '+pin.name).slice(0,180),sourceIds:[pin.sourceId],imageData:'data:image/png;base64,'+png.toString('base64')};
 const existing=out.dossier.assets.find(a=>a.id===asset.id);if(existing){if(existing.imageData!==asset.imageData)throw Error('Approved logo identity conflicts with research');return out;}
 out.dossier.sources.push(source);out.dossier.assets.push(asset);return out;
}
module.exports={snapshot,attach,bytes};
