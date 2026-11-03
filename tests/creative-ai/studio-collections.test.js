'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
const image=(id,route)=>({placementId:id,route,imageUrl:'/creative-ai/api/jobs/test/files/'+id+'-'+route+'.png'});
test('Collections preserve explicit order, separate unrelated formats, and never mutate saved evidence',()=>{
 for(const brandId of ['duroflex','sleepyhead']){
  const p={brandId,placements:[{id:'slide2',carousel:{id:'c',index:2,count:3}},{id:'feed',name:'Instagram feed'},{id:'slide1',carousel:{id:'c',index:1,count:3}},{id:'slide3',carousel:{id:'other',index:1,count:1}},{id:'custom_recipe-marketplace-module-02'},{id:'custom_recipe-marketplace-module-01'}],results:[image('slide1','continuity'),image('slide2','exploration'),image('slide2','continuity')]},before=JSON.stringify(p),groups=M.assetCollections(p);
  assert.equal(groups.length,4);assert.deepEqual(groups[0].pages.map(x=>x.index),[2,0]);assert.equal(groups[1].grouped,false);assert.equal(groups[2].grouped,false);assert.equal(groups[3].type,'aplus');assert.deepEqual(groups[3].pages.map(p=>p.number),[1,2]);
  const pages=M.collectionPages(p,groups[0],'exploration');assert.equal(pages.length,3);assert.equal(pages[0].result,undefined);assert.equal(pages[1].result.route,'exploration');assert.equal(pages[1].optionIndex,0);assert.equal(pages[2].result,undefined);assert.equal(JSON.stringify(p),before);
 }
});
test('Full PDP, print, product images and legacy carousel manifests retain complete sets and missing pages',()=>{
 const p={placements:[...Array.from({length:12},(_,i)=>({id:'pdp'+i,pdp:{id:'pack',index:i+1,count:12}})),{id:'print2',printSet:{id:'book',index:2,count:2}},{id:'print1',printSet:{id:'book',index:1,count:2}},{id:'custom:recipe-product-image-01'},{id:'custom:recipe-product-image-02'},{id:'legacy1'},{id:'legacy2'}],results:[],carousels:[{carouselId:'legacy',slides:[{placementId:'legacy1',index:1},{placementId:'legacy2',index:2}]}]};
 const groups=M.assetCollections(p);assert.deepEqual(groups.map(g=>[g.type,g.count]),[['pdp',12],['print',2],['pdp',2],['carousel',2]]);assert.ok(groups.every(g=>g.grouped));assert.equal(M.collectionPages(p,groups[0],'continuity').filter(p=>!p.result).length,12);
});

test('Collection ZIP selection cannot include another deliverable or substitute another option',()=>{
 const placements=[{id:'c1',carousel:{id:'carousel',index:1,count:2}},{id:'c2',carousel:{id:'carousel',index:2,count:2}},{id:'banner'}],p={placements,results:[image('c1','continuity'),image('c2','continuity'),image('banner','continuity'),image('c1','exploration')]};
 assert.deepEqual(M.completeSet(p,'continuity','c1').map(r=>r.placementId),['c1','c2']);assert.equal(M.completeSet(p,'exploration','c1'),null);assert.equal(M.completeSet(p,'continuity','banner'),null);assert.equal(M.completeSet(p,'continuity').length,3);
});

test('Collection organisation changes are atomic, validate every page, preserve history and reject stale writes',()=>{
 const map=new Map();let writes=0,fail=false;const raw={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('Storage unavailable');writes++;map.set(k,v);}},org=M.organization(raw),initial=org.read('duroflex'),changes=[{key:'creative:one',patch:{favourite:true}},{key:'creative:two',patch:{favourite:true}}];
 assert.throws(()=>org.updateMany(initial,[changes[0],{key:'unsafe:key',patch:{favourite:true}}]),/Unsupported/);assert.equal(writes,0);fail=true;assert.throws(()=>org.updateMany(initial,changes),/Storage/);assert.deepEqual(org.read('duroflex'),initial);fail=false;const saved=org.updateMany(initial,changes);assert.equal(writes,1);assert.equal(saved.revision,1);assert.equal(saved.entries['creative:one'].favourite,true);assert.equal(saved.entries['creative:two'].favourite,true);assert.deepEqual(org.read('sleepyhead').entries,{});assert.throws(()=>org.updateMany(initial,changes),/another tab/);assert.deepEqual(org.read('duroflex'),saved);
});
