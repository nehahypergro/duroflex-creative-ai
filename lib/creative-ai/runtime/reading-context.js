'use strict';
// User-supplied viewing assumptions; never publisher safe zones or printer approval.
const keys=['displayWidthCss','distanceM','dwellSeconds','moving','notes'];
function validate(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error('Invalid placement viewing settings.');
 for(const [key,max] of [['displayWidthCss',4096],['distanceM',1000],['dwellSeconds',3600]])if(value[key]!==undefined&&(!Number.isFinite(value[key])||value[key]<=0||value[key]>max))throw Error('Invalid viewing '+key);
 if(value.moving!==undefined&&typeof value.moving!=='boolean')throw Error('Viewing movement must be true or false.');
 if(value.notes!==undefined&&(typeof value.notes!=='string'||value.notes.length>800))throw Error('Viewing notes must be concise text.');
 return structuredClone(value);
}
function validateIntake(intake){if(intake.placementViewing===undefined)return;if(!intake.placementViewing||typeof intake.placementViewing!=='object'||Array.isArray(intake.placementViewing))throw Error('Placement viewing must be keyed by selected format.');for(const [id,v] of Object.entries(intake.placementViewing)){if(!intake.placementIds?.includes(id))throw Error('Viewing settings must belong to selected formats.');validate(v);}}
module.exports={validate,validateIntake};
