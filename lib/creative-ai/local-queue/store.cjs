'use strict';
// Small durable metadata only. Provider payloads and images stay in the JobStore.
const {DatabaseSync}=require('node:sqlite'),fs=require('node:fs'),path=require('node:path');
class Queue{
 constructor(file){fs.mkdirSync(path.dirname(file),{recursive:true});this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, position INTEGER NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, job_id TEXT, pid INTEGER, heartbeat INTEGER, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, result TEXT);
 CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, at TEXT NOT NULL, key TEXT, type TEXT NOT NULL, detail TEXT);
 CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const v=fn();this.db.exec('COMMIT');return v;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 import(rows){return this.transaction(()=>{const q=this.db.prepare('INSERT OR IGNORE INTO jobs(key,position,payload,state,job_id,error) VALUES(?,?,?,?,?,?)');rows.forEach((r,i)=>q.run(r.key,i,JSON.stringify(r),r.state||(['running','queued','preparing','admitting'].includes(r.status)?'recovering':r.status==='pending'?'pending':r.status),r.id||null,r.error||null));this.event(null,'imported',{rows:rows.length});});}
 rows(){return this.db.prepare('SELECT * FROM jobs ORDER BY position').all().map(r=>({...r,payload:JSON.parse(r.payload),result:r.result?JSON.parse(r.result):null}));}
 get(key){return this.rows().find(r=>r.key===key);}
 update(key,fields){const allowed=new Set(['state','job_id','pid','heartbeat','attempts','error','result']);for(const k of Object.keys(fields))if(!allowed.has(k))throw Error('Invalid queue field');const entries=Object.entries(fields).map(([k,v])=>[k,k==='result'&&v!==null?JSON.stringify(v):v]);this.db.prepare('UPDATE jobs SET '+entries.map(([k])=>k+'=?').join(',')+' WHERE key=?').run(...entries.map(([,v])=>v),key);}
 claim(){return this.transaction(()=>{const r=this.rows().find(r=>['recovering','pending'].includes(r.state)&&!r.pid);if(!r)return null;this.update(r.key,{state:'starting',attempts:r.attempts+1,heartbeat:Date.now(),pid:null});this.event(r.key,'claimed',{attempt:r.attempts+1});return this.get(r.key);});}
 event(key,type,detail={}){this.db.prepare('INSERT INTO events(at,key,type,detail) VALUES(?,?,?,?)').run(new Date().toISOString(),key,type,JSON.stringify(detail));}
 events(){return this.db.prepare('SELECT * FROM events ORDER BY id').all().map(r=>({...r,detail:JSON.parse(r.detail)}));}
 meta(key,value){if(value===undefined){const r=this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);return r?JSON.parse(r.value):null;}this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));}
 close(){this.db.close();}
}
module.exports={Queue};
