'use strict';
const maximumFraction=.05;
function assert(reference,actual){if(!Number.isFinite(reference)||reference<=0||!Number.isFinite(actual)||actual<=0||Math.abs(actual/reference-1)>maximumFraction+1e-9)throw Error('Editable font-size approximation exceeds the approved 5% limit');}
module.exports={maximumFraction,assert};
