'use strict';
// Reassemble immutable saved-field bindings, independent of canvas stacking order.
function text(objects){
 if(objects.length===1&&objects[0].lineIndex===undefined)return objects[0].text;
 const count=objects[0]?.lineCount;
 if(!Number.isInteger(count)||count<1||count!==objects.length||objects.some(o=>o.lineCount!==count||!Number.isInteger(o.lineIndex)||o.lineIndex<0||o.lineIndex>=count)||new Set(objects.map(o=>o.lineIndex)).size!==count)throw Error('Incomplete or ambiguous editable copy lines');
 return [...objects].sort((a,b)=>a.lineIndex-b.lineIndex).map(o=>o.text).join('\n');
}
module.exports={text};
