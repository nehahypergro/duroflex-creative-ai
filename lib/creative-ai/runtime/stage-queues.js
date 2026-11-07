'use strict';
// Independent bounded worker loops. Checkpoints live in each job, not in this scheduler.
class StageQueues{
 constructor({planningLimit=2,imageLimit=2,execute,failure}){this.limits={planning:planningLimit,image:imageLimit};for(const n of Object.values(this.limits))if(!Number.isInteger(n)||n<1||n>5)throw Error('Invalid stage queue capacity');this.execute=execute;this.failure=failure;this.pending={planning:[],image:[]};this.running={planning:new Set(),image:new Set()};this.known=new Set();}
 add(id,phase='planning'){if(!this.pending[phase])throw Error('Invalid queue phase');if(this.known.has(id))return;this.known.add(id);this.pending[phase].push(id);this.pump(phase);}
 pump(phase){while(this.running[phase].size<this.limits[phase]&&this.pending[phase].length){const id=this.pending[phase].shift();this.running[phase].add(id);Promise.resolve().then(()=>this.execute(id,phase)).then(next=>{if(next==='image'){this.pending.image.push(id);}else this.known.delete(id);},async e=>{this.known.delete(id);await this.failure(id,e);}).catch(()=>{}).finally(()=>{this.running[phase].delete(id);this.pump('planning');this.pump('image');});}}
}
module.exports={StageQueues};
