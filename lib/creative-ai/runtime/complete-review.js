'use strict';
const clone=require('../clone-data');
function contract(schema,groups){groups=clone(groups);for(const g of Object.values(groups))if(new Set(g.ids).size!==g.ids.length)throw Error('Duplicate review evidence binding');const wire=clone(schema);for(const [name,{key,ids}]of Object.entries(groups)){const list=wire.properties[name];if(!list)continue;wire.properties[name]={type:'object',additionalProperties:false,required:ids,properties:Object.fromEntries(ids.map(id=>{const item=clone(list.items);item.properties[key]={type:'string',enum:[id]};return[id,item];}))};}
 return {schema:wire,decode(value){const errors=require('../marketing-strategist/schema-validator').check(wire,value);if(errors.length)throw Error('Complete review evidence required: '+errors.join('\n'));const out=clone(value);for(const[name,{key,ids}]of Object.entries(groups)){if(!wire.properties[name])continue;const rows=out[name];if(!rows||Array.isArray(rows)||Object.keys(rows).length!==ids.length||ids.some(id=>!Object.hasOwn(rows,id)||rows[id]?.[key]!==id))throw Error('Complete review evidence required: '+name);out[name]=ids.map(id=>rows[id]);}return out;}};
}
module.exports={contract};
