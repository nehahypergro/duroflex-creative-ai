'use strict';
// Live speed review (21 Nov 2026): every Studio request on the live site looked up the session and then the user in
// MongoDB Atlas (two round trips per request, ~460 per page load). A checked session is now kept for 10 seconds on
// the server that checked it. Fails before: every lookup went to the database.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {MongoMemoryReplSet}=require('mongodb-memory-server'),{MongoClient}=require('mongodb');
const {MongoAccounts,SESSION_CACHE_MS}=require('../../lib/admin/accounts');
let repl,client,a,b,admin,now=Date.now(),queries=0;
const counted=accounts=>{for(const c of ['sessions','users']){const col=accounts[c],findOne=col.findOne.bind(col);accounts[c]=new Proxy(col,{get:(t,k)=>k==='findOne'?(...x)=>{queries++;return findOne(...x);}:typeof t[k]==='function'?t[k].bind(t):t[k]});}return accounts;};
before(async()=>{repl=await MongoMemoryReplSet.create({replSet:{count:1},instanceOpts:[{launchTimeout:60000}]});client=await new MongoClient(repl.getUri()).connect();
 a=counted(new MongoAccounts(client,client.db('session_cache_test'),{clock:()=>now}));await a.init();admin=await a.create({username:'admin',name:'Administrator',password:'fixture-password-123'},null,{bootstrap:true});
 b=new MongoAccounts(client,client.db('session_cache_test'),{clock:()=>now});});
after(async()=>{await client?.close();await repl?.stop();});

test('a checked session is reused for 10 seconds, then checked again',async()=>{
 assert.equal(SESSION_CACHE_MS,10000);const {token}=await a.login('admin','fixture-password-123');
 queries=0;assert.equal((await a.session(token)).id,admin.id);assert.equal(queries,2,'session + user');
 for(let i=0;i<20;i++)assert.equal((await a.session(token)).username,'admin');assert.equal(queries,2,'no database work for 20 more requests');
 now+=SESSION_CACHE_MS+1;assert.equal((await a.session(token)).id,admin.id);assert.equal(queries,4);
 const copy=await a.session(token);copy.role='member';assert.equal((await a.session(token)).role,'admin','callers cannot change the kept copy');
});

test('sign-out and account changes on this server take effect at once; on another server within 10 seconds',async()=>{
 const member=await a.create({username:'member',name:'Member',password:'fixture-password-123'},admin);
 const one=(await a.login('member','fixture-password-123')).token;assert.equal((await a.session(one)).id,member.id);
 await a.logout(one);assert.equal(await a.session(one),null,'signed out here: refused at once');
 const two=(await a.login('member','fixture-password-123')).token;assert.equal((await a.session(two)).id,member.id);
 await a.change(admin,{userId:member.id,disabled:true});assert.equal(await a.session(two),null,'disabled here: refused at once');
 await a.change(admin,{userId:member.id,disabled:false});const three=(await a.login('member','fixture-password-123')).token;assert.equal((await a.session(three)).id,member.id);
 await b.change(admin,{userId:member.id,disabled:true});assert.equal((await a.session(three)).id,member.id,'another server: kept for up to 10 seconds');
 now+=SESSION_CACHE_MS+1;assert.equal(await a.session(three),null,'then refused');
});

test('a kept session never outlives its own expiry',async()=>{
 const {token}=await a.login('admin','fixture-password-123');assert.ok(await a.session(token));
 now+=8*3600e3-5000;assert.ok(await a.session(token),'still valid (checked again, re-kept)');now+=6000;assert.equal(await a.session(token),null);
});
