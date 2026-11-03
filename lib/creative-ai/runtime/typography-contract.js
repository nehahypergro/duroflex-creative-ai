'use strict';

// Limits belong to the immutable final art plan, not editable layer properties.
function limits(document, object) {
 const plan=document.layoutIntent?.layout;
 if(plan?.contractVersion!==2)return null;
 // User-added layers have no upstream art decision; retain ordinary checks.
 if(object.fieldId===undefined&&/^user-/.test(object.id))return null;
 const field=plan.text.find(b=>b.fieldId===object.fieldId);
 if(!field)throw Error('Text layer is missing its final typography contract: '+object.id);
 return {minFontSize:field.minFontSize*document.canvas.width,maxLines:field.maxLines,minContrastRatio:field.minContrastRatio};
}
module.exports={limits};
