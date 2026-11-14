import test from 'node:test';
import assert from 'node:assert/strict';
import {handleWithDatabase} from '../server/api.mjs';
import {signSession} from '../server/auth.mjs';
process.env.NODE_ENV='development';process.env.SESSION_SECRET='blob-test-secret-'.repeat(4);
test('private Blob storage preserves order/stock CAS and shared publication',async()=>{
 const files=new Map();let version=0;
 const db={kind:'blob',token:'test',sdk:{async get(key,options){assert.equal(options.access,'private');assert.equal(options.useCache,false);const f=files.get(key);return f?{stream:new Response(f.text).body,blob:{etag:f.etag}}:null},async put(key,text,options){assert.equal(options.access,'private');const f=files.get(key);if(!options.allowOverwrite&&f)throw Error('Blob already exists');if(options.ifMatch&&f?.etag!==options.ifMatch){const error=Error('Precondition failed');error.name='BlobPreconditionFailedError';throw error}const etag='etag-'+(++version);files.set(key,{text,etag});return {etag}},async list(){return {blobs:[]}}}};
 const origin='https://localbite.example',owner='lb_owner='+signSession({role:'owner',username:'owner-1',restaurantId:1}),admin='lb_admin='+signSession({role:'developer',username:'developer'});
 const call=(path,method='GET',body,cookie='')=>handleWithDatabase(new Request(origin+'/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined}),async()=>db);
 const state=await (await call('kitchen/1','GET',null,owner)).json();state.accepting=true;state.menu[0]={...state.menu[0],price:100,stock:1,available:true};let r=await call('operations/1','PUT',state,owner);assert.equal(r.status,200);assert.equal(typeof(await r.json()).revision,'string');
 const payload={name:'Blob pilot guest',notes:'',service:'Takeaway',pickupAt:null,expectedTotal:100,items:[{id:1,quantity:1}]};
 const results=await Promise.all(['a','b'].map(ch=>call('orders/1','POST',{...payload,token:ch.repeat(64)})));assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 const live=await (await call('operations/1')).json();assert.equal(live.menu[0].stock,0);assert.equal(live.activeOrders,1);assert.ok(!('orders' in live));
 assert.equal((await call('operations/1','PUT',state,owner)).status,409);
 assert.equal((await call('kitchen/2','GET',null,owner)).status,403);
 const current=await (await call('reels','GET',null,admin)).json();current.entries[0].status='Rejected';r=await call('reels','PUT',current,admin);assert.equal(r.status,200);assert.equal((await (await call('reels')).json()).entries.length,3);
 r=await call('spotlights','PUT',{restaurantIds:[1],dishIds:[1],revision:null},admin);assert.equal(r.status,200);assert.deepEqual((await (await call('spotlights')).json()).dishIds,[1]);
});
