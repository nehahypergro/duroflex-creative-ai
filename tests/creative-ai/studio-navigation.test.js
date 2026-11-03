'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('Navigation preserves equivalent sections and excludes brand-specific project identities',()=>{assert.equal(M.navigation.brandRoute('projects?status=review&sort=name'),'projects?status=review&sort=name');assert.equal(M.navigation.brandRoute('library/products?q=sofa'),'library/products');assert.equal(M.navigation.brandRoute('review/job-a/0/1'),'projects');assert.equal(M.navigation.brandRoute('settings/trash'),'settings/trash');assert.equal(M.navigation.brandRoute('library/product?id=sku-a'),'library/products');});
test('Navigation reads and serializes filter URLs without losing Unicode',()=>{const route=M.navigation.projects({filter:'review',sort:'name',formatFilter:'Story · vertical',search:'नमस्ते & sofa'}),parsed=M.navigation.parse(route);assert.equal(parsed.view,'projects');assert.equal(parsed.params.get('q'),'नमस्ते & sofa');assert.equal(parsed.params.get('status'),'review');assert.equal(M.navigation.projects({}),'projects');});
test('Brand switching keeps library tabs and category context without carrying source identities',()=>{
 for(const route of ['library','library/brand','library/products'])assert.equal(M.navigation.brandRoute(route),route);
 assert.equal(M.navigation.brandRoute('library/manage?section=font'),'library/manage?section=font');
 assert.equal(M.navigation.brandRoute('tools/category?from=library&group=social'),'tools/category?group=social&from=library');
 assert.equal(M.navigation.brandRoute('library/book/source-a'),'library/brand');
 assert.equal(M.navigation.brandRoute('library/asset?id=brand-a-asset'),'library/brand');
 assert.equal(M.navigation.brandRoute('tools/category?from=brief%2Fdraft-a&group=social&id=brand-a-asset'),'tools/category?group=social');
});
