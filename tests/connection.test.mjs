import {test} from 'node:test';import assert from 'node:assert/strict';import worker from '../dist/server/index.js';
class DB {
 rows=new Map();
 prepare(sql) {
  const db=this;
  return {bind(...a) {return {
   async first(){return db.rows.get(a[0])||null},
   async run(){
    if(sql.startsWith('INSERT')){if(db.rows.has(a[0]))return {meta:{changes:0}};db.rows.set(a[0],{revision:0,data:a[1]});return {meta:{changes:1}}}
    const [data,time,user,revision]=a;const row=db.rows.get(user);
    if(!row||row.revision!==revision)return {meta:{changes:0}};
    db.rows.set(user,{revision:revision+1,data});return {meta:{changes:1}};
   }
  }}};
 }
}
test('authenticated browser and MCP share persistence; user data isolated; writes idempotent',async()=>{const env={DB:new DB()};const api=async(user,name,args={})=>(await worker.fetch(new Request('https://gym.test/api/action',{method:'POST',headers:{'content-type':'application/json',...(user?{'oai-authenticated-user-id':user}:{})},body:JSON.stringify({name,args})}),env)).json();const p=await api('alice','create_training_plan',{name:'Integration test',exercises:[{name:'Row',sets:3,minReps:8,maxReps:12}]});assert.ok(p.result.id);const rpc=await worker.fetch(new Request('https://gym.test/mcp',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'alice'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_training_plans',arguments:{}}})}),env);assert.equal((await rpc.json()).result.structuredContent.result[0].id,p.result.id);assert.deepEqual((await api('bob','list_training_plans')).result,[]);const denied=await api(null,'list_training_plans');assert.ok(denied.error);const session=(await api('alice','start_workout',{planId:p.result.id})).result;const set={sessionId:session.id,exerciseId:session.exercises[0].id,weight:50,reps:10,unit:'kg',requestId:'repeat'};await api('alice','log_set',set);await api('alice','log_set',set);assert.equal((await api('alice','get_user_training_context')).result.sessions[0].sets.length,1);});
test('cross-origin writes rejected and resource contains connected UI',async()=>{const env={DB:new DB()};const r=await worker.fetch(new Request('https://gym.test/api/action',{method:'POST',headers:{origin:'https://evil.test','oai-authenticated-user-id':'alice'},body:'{}'}),env);assert.equal(r.status,403);const response=await worker.fetch(new Request('https://gym.test/mcp',{method:'POST',body:JSON.stringify({id:2,method:'resources/read',params:{uri:'ui://gym-mastery/app.html'}})}),env);const out=await response.json();assert.match(out.result.contents[0].text,/tools\/call/);assert.match(out.result.contents[0].text,/id="root"/);assert.match(out.result.contents[0].text,/data:image\/webp;base64/);});
