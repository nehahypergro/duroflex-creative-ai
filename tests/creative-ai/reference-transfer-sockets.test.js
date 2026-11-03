'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {transferFetch}=require('../../lib/creative-ai/runtime/image-reference-stage');
test('ten real socket interruptions recover complete reference bytes within the transfer attempt bound',async()=>{
 const attempts=new Map(),received=new Map();
 const server=http.createServer((req,res)=>{
  const id=Number(req.url.slice(1)),attempt=(attempts.get(id)||0)+1;attempts.set(id,attempt);
  if(attempt===1&&id%2===0){req.once('data',()=>req.socket.destroy());return;}
  const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
   if(attempt===1){res.writeHead(200,{'Content-Length':'10000'});res.write('partial');setTimeout(()=>res.destroy(),5);return;}
   received.set(id,crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('hex'));res.end('verified');
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  // Bound the test itself to two transfers at once, matching production staging.
  for(let start=0;start<10;start+=2)await Promise.all([start,start+1].map(async id=>{
   const bytes=crypto.randomBytes(65536+id*131072),expected=crypto.createHash('sha256').update(bytes).digest('hex');
   const response=await transferFetch(Date.now()+10000,bytes.length)(`http://127.0.0.1:${server.address().port}/${id}`,{method:'POST',body:bytes});
   assert.equal(await response.text(),'verified');assert.equal(received.get(id),expected);assert.equal(attempts.get(id),2);
  }));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
