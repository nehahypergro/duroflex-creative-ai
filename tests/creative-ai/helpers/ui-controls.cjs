'use strict';
const assert=require('node:assert/strict');
// Exercise the visible controls rather than forcing hidden native inputs.
async function chooseSelect(page,locator,value){
 await locator.waitFor({state:'attached'});await reveal(locator);
 const id=await locator.getAttribute('id');
 if(id==='field-productId'&&await locator.evaluate(e=>e.tagName==='BUTTON')){await locator.click();await page.locator('[data-assignment-product="'+value+'"]').click();return;}
 const option=await locator.evaluate((e,v)=>{const all=[...e.options];return all.map((o,index)=>({index,value:o.value,label:o.textContent.trim()})).find(o=>typeof v==='string'?o.value===v:v.label!==undefined?o.label===v.label:v.value!==undefined?o.value===v.value:o.index===v.index);},value);
 assert.ok(option,'Requested option exists: '+JSON.stringify(value));
 if(id==='ecFont'){await page.locator('#ecFontPicker').click();await page.locator('[data-font-choice="'+option.value+'"]').click();return;}
 const trigger=locator.locator('xpath=following-sibling::*[1][contains(@class,"studio-select-trigger")]');
 if(await trigger.count()){await trigger.click();await page.locator('.studio-select-menu [role=option][data-index="'+option.index+'"]').click();}
 else await locator.selectOption(value);
}
async function settleAutosave(page){await page.locator('#field-brief').press('Tab');await page.waitForTimeout(800);}
async function downloadEditor(page){if(!await page.locator('#ecDownloadMenu').isVisible())await page.locator('[data-ec=download-menu]').click();await page.locator('[data-ec=export]').click();}
async function observeEditorCanvas(page){await page.evaluate(()=>{const Native=fabric.Canvas;fabric.Canvas=class extends Native{constructor(...args){super(...args);window.qaCanvas=this;}};});}
async function editCanvasText(page,text){
 await page.waitForFunction(()=>window.qaCanvas?.getActiveObject()?.type==='textbox');
 await page.evaluate(()=>{const o=qaCanvas.getActiveObject();if(o?.type!=='textbox')throw Error('Select an editable text layer');o.enterEditing();o.selectAll();qaCanvas.requestRenderAll();});
 await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(text);await page.keyboard.press('Escape');await page.locator('.ec-title').click();
}
module.exports={chooseSelect,settleAutosave,downloadEditor,observeEditorCanvas,editCanvasText};
async function reveal(locator){const parents=locator.locator('xpath=ancestor::details');for(let i=0;i<await parents.count();i++){const d=parents.nth(i);if(await d.getAttribute('open')===null)await d.locator(':scope > summary').click();}}
async function setAudience(page,key,value){const group=page.locator('[data-audience-group="'+key+'"]');await reveal(group);const selected=group.locator('[data-audience-choice][aria-pressed=true]');for(let attempts=0;await selected.count();attempts++){assert.ok(attempts<30,'Selected values must clear after clicking');await selected.first().click();}const input=page.locator('[data-audience-custom="'+key+'"]');if(!await input.isVisible())await page.locator('[data-audience-expand="'+key+'"]').click();await input.fill(value);await input.press('Enter');}
async function replaceAsset(page,selector){const target=page.locator(selector).first();const selected=page.locator('#featureOptions [role=checkbox][aria-checked=true]');for(let attempts=0;await selected.count();attempts++){assert.ok(attempts<30,'Selected values must clear after clicking');await selected.first().click();}await target.click();await page.locator('[data-action=save-asset-selection]').click();}
module.exports.reveal=reveal;module.exports.setAudience=setAudience;module.exports.replaceAsset=replaceAsset;
