'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../../public/creative-ai/studio-model'),previews=model.formatPreviews;
test('all static choices have format cues without adding video/copy/adaptation behaviour',()=>{
 const staticFeatures=model.features.filter(f=>f.kind==='image');
 assert.equal(staticFeatures.length,15);
 for(const f of staticFeatures){assert.ok(previews.spec(f.id)?.dimensions);const markup=previews.render(f.id);assert.match(markup,/aria-hidden="true"/);assert.doesNotMatch(markup,/<button|data-action|https?:/);}
 for(const f of model.features.filter(f=>f.kind!=='image'))assert.equal(previews.render(f.id),'');
 assert.equal(previews.spec(8).shape,'story');assert.equal(previews.spec(7).shape,'banner');assert.equal(previews.spec(9).shape,'stack');assert.equal(previews.spec(11).shape,'poster');
 assert.equal(previews.spec(13).badge,'linkedin');assert.equal(previews.spec(14).badge,'whatsapp');
});
test('miniatures support scoped product previews and reject unsafe URLs',()=>{
 for(const brand of ['duroflex','sleepyhead']){const url=`/creative-ai/api/brands/brand-${brand}/products/product-1/image-1/preview`;assert.ok(previews.render(1,{imageUrl:url}).includes(url));}
 for(const url of ['https://example.com/photo.png','javascript:alert(1)','/creative-ai/api/brands/../secret','/creative-ai/api/jobs/failed-output/files/image.png','/creative-ai/api/brands/a/" onerror="bad'])assert.doesNotMatch(previews.render(1,{imageUrl:url}),/<img/);
 assert.match(previews.render(1,{compact:true}),/is-compact/);
 assert.doesNotMatch(previews.render(1),/badge-instagram/,'Generic benefit post is not restricted to Instagram');
 assert.match(previews.render(1,{platform:true}),/badge-instagram/);
 const small=previews.render(1,{platform:true,iconOnly:true,imageUrl:'/creative-ai/api/brands/a/products/b/c/preview'});
 assert.match(small,/format-cue/);assert.match(small,/badge-instagram/);assert.doesNotMatch(small,/<img|format-mini/,'Compact choices load no decorative product thumbnails');
});
