'use strict';
const slots={landscape:{width:1200,height:628,index:1},square:{width:1200,height:1200,index:2},portrait:{width:960,height:1200,index:3}};
const rule='PMax image asset: recompose the selected subject for this ratio. Deliver a clean image, without added campaign headlines, CTA buttons or overlay logos. Preserve authentic physical product markings. Native ad text and logo assets are supplied separately to Google Ads. All selected images belong to one concept-consistent collection. Source acceptance does not approve the rendered artwork or publisher preview.';
function metadata(id,ids){const key=id.replace('custom:studio-pmax-','');if(!Object.hasOwn(slots,key))return null;const selected=ids.filter(id=>Object.hasOwn(slots,id.replace('custom:studio-pmax-','')));return {id:'pmax-images',name:'PMax image set',slot:key,index:selected.indexOf(id)+1,count:selected.length};}
function clean(profileId){return Object.keys(slots).some(key=>profileId==='custom:studio-pmax-'+key);}
module.exports={slots,rule,metadata,clean};
