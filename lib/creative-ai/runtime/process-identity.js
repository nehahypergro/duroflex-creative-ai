'use strict';
const fs=require('node:fs/promises'),os=require('node:os'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),run=promisify(execFile);
let bootPromise,selfPromise,machinePromise;
async function bootId(){return bootPromise??=(async()=>{try{if(process.platform==='linux')return (await fs.readFile('/proc/sys/kernel/random/boot_id','utf8')).trim();if(process.platform==='darwin')return (await run('/usr/sbin/sysctl',['-n','kern.bootsessionuuid'],{timeout:2000})).stdout.trim();}catch{}return null;})();}
async function started(pid){try{if(process.platform==='linux'){const stat=await fs.readFile('/proc/'+pid+'/stat','utf8');return stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];}if(process.platform==='darwin')return (await run('/bin/ps',['-p',String(pid),'-o','lstart='],{timeout:2000,env:{...process.env,LC_ALL:'C'}})).stdout.trim()||null;}catch{}return null;}
// Salted hash of the hardware/OS machine identifier: distinguishes two machines that share a
// hostname without writing the raw identifier into lock files.
async function machineId(){return machinePromise??=(async()=>{let raw=null;try{if(process.platform==='darwin')raw=/"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec((await run('/usr/sbin/ioreg',['-rd1','-c','IOPlatformExpertDevice'],{timeout:2000})).stdout)?.[1]||null;else if(process.platform==='linux')for(const file of ['/etc/machine-id','/var/lib/dbus/machine-id']){raw=(await fs.readFile(file,'utf8').catch(()=>'')).trim()||null;if(raw)break;}}catch{}return raw?crypto.createHash('sha256').update('creative-ai-lock-machine:'+raw).digest('hex').slice(0,32):null;})();}
// Includes time asleep on macOS and Linux. Whole-second precision.
const bootTime=()=>Date.now()-os.uptime()*1000;
async function self(){return selfPromise??=Promise.all([bootId(),started(process.pid),machineId()]).then(([bootId,processStart,machineId])=>({bootId,processStart,...(machineId?{machineId}:{})}));}
// 'dead' only with proof: a previous boot of this machine, a missing PID, or a reused PID.
// 'foreign' when the owner may belong to another machine. Never infer death from age.
const LEGACY_BOOT_MARGIN_MS=60000;
async function ownerStatus(owner,{markerMtimeMs}={}){
 if(!owner||typeof owner!=='object'||!Number.isInteger(owner.pid)||owner.pid<=0)return 'invalid';
 const [boot,machine]=await Promise.all([bootId(),machineId()]),sameBoot=!!boot&&owner.bootId===boot;
 let sameMachine;
 if(owner.machineId&&machine)sameMachine=owner.machineId===machine;
 else if(sameBoot)sameMachine=true; // a boot UUID survives hostname changes
 else sameMachine=owner.host===os.hostname();
 if(!sameMachine)return 'foreign';
 if(owner.bootId&&boot&&!sameBoot){
  // Every process of a previous boot has ended. Markers written before machine identity
  // existed must also predate this boot on disk, so a same-named host is not presumed dead.
  if(owner.machineId&&machine)return 'dead';
  return Number.isFinite(markerMtimeMs)&&markerMtimeMs<bootTime()-LEGACY_BOOT_MARGIN_MS?'dead':'foreign';
 }
 try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')return 'dead';return 'live';}
 if(owner.processStart){const current=owner.pid===process.pid?(await self()).processStart:await started(owner.pid);if(current&&current!==owner.processStart)return 'dead';}
 return 'live';
}
module.exports={bootId,started,machineId,bootTime,self,ownerStatus};
