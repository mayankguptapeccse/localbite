import {createHash} from 'node:crypto';
import seed from './menu-seed.json' with {type:'json'};
import reelSeed from './reel-seed.json' with {type:'json'};
import {database,readState,writeState,readConfig,writeConfig,storageHealth} from './db.mjs';
import {authorize,readSession,signSession,authenticate,sessionCookie,sameOrigin,developmentMode,accounts} from './auth.mjs';
import {initialOperations,publicOperations,validateOperationalMenu,createPilotOrder,changePilotOrder} from './domain.mjs';
export function json(status,data,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}})}
function ownOrder(state,order){const {tokenHash,...safe}=order;const active=['Placed','Accepted','Preparing'];return {...safe,restaurantId:state.restaurantId,bufferMinutes:state.bufferMinutes,ordersAhead:active.includes(order.status)?state.orders.filter(o=>active.includes(o.status)&&(o.createdAt<order.createdAt||(o.createdAt===order.createdAt&&o.id<order.id))).length:null}}
function tokenHash(value){if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw Error('A valid private tracking key is required.');return createHash('sha256').update(value).digest('hex')}
function validProvider(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.localhost')&&!/^\d+(\.\d+){3}$/.test(u.hostname)&&u.href.length<=2048}catch{return false}}
export function validateTables(input,origin){if(!Array.isArray(input.tables)||input.tables.length>40)return 'Choose up to 40 tables.';const labels=new Set();for(const t of input.tables){if(!t||typeof t.label!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/.test(t.label)||t.label!==t.label.trim()||labels.has(t.label.toLowerCase())||typeof t.active!=='boolean'||typeof t.url!=='string')return 'Check table names, duplicates and links.';labels.add(t.label.toLowerCase());let u;try{u=new URL(t.url)}catch{return 'Use a complete table URL.'}if(!(u.origin===origin&&(u.protocol==='https:'||developmentMode()&&u.protocol==='http:'))&&!validProvider(t.url))return 'Use a LocalBite table link or a complete HTTPS provider URL.'}return ''}
function spotlightError(input){if(!Array.isArray(input.restaurantIds)||!Array.isArray(input.dishIds)||input.restaurantIds.length>4||input.dishIds.length>16||input.restaurantIds.some(id=>![1,2,3,4].includes(id))||input.dishIds.some(id=>!seed.some(d=>d.id===id)))return 'Choose valid restaurant and dish spotlight IDs.';return ''}
export async function handle(request){return handleWithDatabase(request,database)}
export async function handleWithDatabase(request,getDatabase){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!['GET','HEAD'].includes(method)&&!sameOrigin(request))return json(403,{error:'Open LocalBite on its own website to submit this request.'});
 try{
  if(path==='/api/auth'){
   const role=url.searchParams.get('role')==='owner'?'owner':'developer';
   if(method==='GET')return json(200,{session:readSession(request,role),development:developmentMode(),configured:developmentMode()||Boolean(process.env.SESSION_SECRET?.length>=32&&accounts().some(a=>a.role===role))});
   if(method==='DELETE')return json(200,{signedOut:true},{'Set-Cookie':sessionCookie(request,role,'',true)});
   if(method!=='POST')return json(405,{error:'Method not allowed.'});
  }
  if(method!=='GET'&&Number(request.headers.get('Content-Length')||0)>80000)return json(413,{error:'Request too large.'});
  let input;if(!['GET','HEAD'].includes(method)){if(!request.headers.get('Content-Type')?.includes('application/json'))return json(415,{error:'Send JSON data.'});const raw=await request.text();if(raw.length>80000)return json(413,{error:'Request too large.'});try{input=JSON.parse(raw)}catch{return json(400,{error:'Invalid JSON.'})}}
  const db=await getDatabase();
  if(path==='/api/health'&&method==='GET'){const storage=await storageHealth(db);return json(200,{database:'connected',storage})}
  if(path==='/api/auth'&&method==='POST'){const session=await authenticate(request,db,input);return session?json(200,{session},{'Set-Cookie':sessionCookie(request,session.role,signSession(session))}):json(401,{error:'Check your username and password.'})}
  if(path==='/api/reels'){
   const fallback={entries:reelSeed.map(r=>({id:r.id,status:'Approved',caption:r.caption})),updatedAt:null};
   if(method==='GET'){const live=await readConfig(db,'reels',fallback);return json(200,authorize(request,null,true)?live:{...live,entries:live.entries.filter(r=>r.status==='Approved')})}
   if(method!=='PUT')return json(405,{error:'Method not allowed.'});if(!authorize(request,null,true))return json(403,{error:'Developer sign-in is required.'});
   if(!Array.isArray(input.entries)||input.entries.length!==4||new Set(input.entries.map(r=>r.id)).size!==4||input.entries.some(r=>![1,2,3,4].includes(r.id)||!['Approved','Rejected','Changes requested','Pending review','Paused'].includes(r.status)||typeof r.caption!=='string'||r.caption.length>2000))return json(400,{error:'Check the four reel publication entries.'});
   const saved=await writeConfig(db,'reels',input.revision??null,{entries:input.entries.map(r=>({id:r.id,status:r.status,caption:r.caption})),updatedAt:new Date().toISOString()});return saved?json(200,saved):json(409,{error:'Reel publication changed. Reload and retry.'});
  }
  if(path==='/api/spotlights'){
   if(method==='GET')return json(200,await readConfig(db,'spotlights',{restaurantIds:[],dishIds:[],updatedAt:null}));
   if(method!=='PUT')return json(405,{error:'Method not allowed.'});if(!authorize(request,null,true))return json(403,{error:'Developer sign-in is required.'});const error=spotlightError(input);if(error)return json(400,{error});const saved=await writeConfig(db,'spotlights',input.revision??null,{restaurantIds:[...new Set(input.restaurantIds)],dishIds:[...new Set(input.dishIds)],updatedAt:new Date().toISOString()});return saved?json(200,saved):json(409,{error:'Spotlights changed. Reload and retry.'});
  }
  const table=path.match(/^\/api\/tables\/([1-4])$/);
  if(table){const id=Number(table[1]),key='tables/'+id;if(method==='GET')return json(200,await readConfig(db,key,{restaurantId:id,tables:[],updatedAt:null}));if(method!=='PUT')return json(405,{error:'Method not allowed.'});if(!authorize(request,id))return json(403,{error:'Sign in as this restaurant’s owner or a developer.'});const error=validateTables(input,url.origin);if(error)return json(400,{error});const saved=await writeConfig(db,key,input.revision??null,{restaurantId:id,tables:input.tables.map(t=>({label:t.label,url:new URL(t.url).href,active:t.active})),updatedAt:new Date().toISOString()});return saved?json(200,saved):json(409,{error:'Table links changed. Reload and retry.'})}
  const match=path.match(/^\/api\/(operations|kitchen|orders|order-status)\/([1-4])$/);if(!match)return json(404,{error:'Not found.'});const kind=match[1],id=Number(match[2]),read=()=>readState(db,id,()=>initialOperations(id,seed));
  if(kind==='kitchen'&&!authorize(request,id))return json(403,{error:'Sign in as this restaurant’s owner or a developer.'});
  if(method==='GET'&&['operations','kitchen'].includes(kind)){const {state,version}=await read();return json(200,kind==='operations'?publicOperations(state):{...state,orders:state.orders.map(({tokenHash,...o})=>o),revision:version})}
  if(kind==='operations'&&method==='PUT'&&!authorize(request,id))return json(403,{error:'Sign in as this restaurant’s owner or a developer.'});
  if(!['PUT','POST','PATCH'].includes(method))return json(405,{error:'Method not allowed.'});
  let hash;if(['orders','order-status'].includes(kind))hash=tokenHash(input.token);
  if(kind==='order-status'&&method==='POST'){const {state}=await read();const o=state.orders.find(o=>o.tokenHash===hash);return o?json(200,ownOrder(state,o)):json(404,{error:'Order not found.'})}
  if(kind==='orders'&&method==='POST'&&input.service==='Dine-in'){const config=await readConfig(db,'tables/'+id,{tables:[]});const appOrigin=process.env.APP_ORIGIN||url.origin;if(!config.tables.some(t=>{try{const u=new URL(t.url);return t.active&&t.label===input.table&&u.origin===appOrigin&&u.searchParams.get('restaurant')===String(id)&&u.searchParams.get('table')===input.table}catch{return false}}))return json(400,{error:'Choose a published LocalBite table. External provider tables must be ordered on their provider.'})}
  for(let attempt=0;attempt<4;attempt++){
   const {state,version}=await read();let order;
   if(kind==='operations'&&method==='PUT'){const error=validateOperationalMenu(input);if(error)return json(400,{error});if(version!==(input.revision??null))return json(409,{error:'The kitchen changed. Reload before publishing.'});Object.assign(state,{accepting:input.accepting,prepMinutes:input.prepMinutes,bufferMinutes:input.bufferMinutes,seatingWait:input.seatingWait,seatingParties:input.seatingParties,menu:input.menu.map(d=>({id:d.id,name:d.name.trim(),price:d.price,stock:d.stock,available:d.available,veg:d.veg,photoUrl:d.photoUrl,description:d.description})),updatedAt:new Date().toISOString()})}
   else if(kind==='orders'&&method==='POST'){const created=createPilotOrder(state,input,Date.now(),hash);order=created.order;if(created.duplicate)return json(200,ownOrder(state,order))}
   else if(kind==='order-status'&&method==='PATCH')order=changePilotOrder(state,{...input,tokenHash:hash},Date.now(),true);
   else if(kind==='kitchen'&&method==='PATCH')order=changePilotOrder(state,input,Date.now());
   else return json(405,{error:'Method not allowed.'});
   const revision=await writeState(db,id,version,state);if(revision!==null)return json(200,order?ownOrder(state,order):{...state,orders:state.orders.map(({tokenHash,...o})=>o),revision});
   if(kind==='operations')return json(409,{error:'The kitchen changed during save. Reload and retry.'});
  }
  return json(409,{error:'Kitchen busy. Retry once using the same tracking key.'});
 }catch(error){const message=error instanceof Error?error.message:'Service unavailable.';if(/DATABASE_URL|SESSION_SECRET|OWNER_ACCOUNTS_JSON|Persistent storage/.test(message))return json(503,{error:message});if(/relation .* does not exist|connect|timeout|ECONN|password authentication/i.test(message))return json(503,{error:'Database unavailable. Check the connection and run npm run db:migrate.'});return json(400,{error:message})}
}
