'use strict';
// Regression (19 Nov 2026, live rerun test): the hosted Studio showed "INR estimate unavailable" on every Check brief and
// could not convert any cost to rupees, because output/cost-tracking/currency.json (the dated, sourced RBI reference
// rate) was ignored by Git with the rest of output/ and so never reached a redeploy. It is now tracked. Failing before.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),file='output/cost-tracking/currency.json';
test('the INR rate file is tracked by Git and valid, so every deploy can show rupees',()=>{
 assert.doesNotThrow(()=>execFileSync('git',['ls-files','--error-unmatch',file],{cwd:root,stdio:'pipe'}),'currency.json is tracked');
 const fx=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 assert.ok(require('../../lib/cost-tracker').validFx(fx),'dated, sourced INR rate');
 assert.equal(fx.displayCurrency,'INR');assert.ok(fx.usdToInr>50&&fx.usdToInr<200);assert.match(fx.source,/^https:\/\//);
});
