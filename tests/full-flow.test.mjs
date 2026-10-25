import test from 'node:test';import assert from 'node:assert/strict';import worker from '../dist/server/index.js';
class DB{
 rows=new Map();
 prepare(sql){const db=this;return {bind(...args){return {
  async first(){return db.rows.get(args[0])||null},
  async run(){if(sql.startsWith('INSERT')){if(db.rows.has(args[0]))return {meta:{changes:0}};db.rows.set(args[0],{revision:0,data:args[1]});return {meta:{changes:1}}}
   const [data,time,user,rev]=args,row=db.rows.get(user);if(!row||row.revision!==rev)return {meta:{changes:0}};db.rows.set(user,{revision:rev+1,data});return {meta:{changes:1}}}
 }}}}
}
function client(env,user){
 return {
  async api(name,args={}){const r=await worker.fetch(new Request('https://qa.test/api/action',{method:'POST',headers:{'oai-authenticated-user-id':user,'content-type':'application/json'},body:JSON.stringify({name,args})}),env);const out=await r.json();if(!r.ok)throw Error(out.error);return out},
  async mcp(name,args={}){const r=await worker.fetch(new Request('https://qa.test/mcp',{method:'POST',headers:{'oai-authenticated-user-id':user,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),env);const out=await r.json();if(out.result.isError)throw Error(out.result.content[0].text);return out.result.structuredContent}
 };
}
test('complete browser/MCP training A/B/C, correction, preference and export roundtrip',async()=>{
 const env={DB:new DB()},user=client(env,'qa-owner'),other=client(env,'qa-other'),plans=[];
 for(const name of ['A','B','C'])plans.push((await user.api('create_training_plan',{name,exercises:['Rudern eng','Schrägbankdrücken','Hackenschmidt'].map(name=>({name,sets:2,minReps:8,maxReps:12}))})).result);
 await user.mcp('save_training_preference',{key:'restSeconds',value:'75'});
 for(let planIndex=0;planIndex<3;planIndex++){
  const p=plans[planIndex],s=(await user.mcp('start_workout',{planId:p.id})).result;
  assert.equal((await user.api('start_workout',{planId:p.id})).result.id,s.id);
  for(const [exerciseIndex,e] of s.exercises.entries())for(let n=0;n<2;n++){
   const args={sessionId:s.id,exerciseId:e.id,requestId:s.id+'-'+e.id+'-'+n,weight:40+planIndex*5+exerciseIndex*10,reps:10+n,unit:'kg',rir:2};
   await user.api('log_set',args);await user.mcp('log_set',args);
  }
  let context=(await user.mcp('get_user_training_context')).state;
  assert.equal(context.sessions.find(x=>x.id===s.id).sets.length,6);
  const last=context.sessions.find(x=>x.id===s.id).sets.at(-1);
  await user.mcp('update_set',{sessionId:s.id,setId:last.id,weight:last.weight+2.5,reps:12});
  const recommendation=(await user.api('get_progression_recommendation',{sessionId:s.id,exerciseId:s.exercises[0].id})).result;
  assert.ok(recommendation.reason);
  await user.api('finish_workout',{sessionId:s.id});await user.mcp('finish_workout',{sessionId:s.id});
  await assert.rejects(user.api('log_set',{sessionId:s.id,exerciseId:s.exercises[0].id,requestId:'after-close',weight:50,reps:10,unit:'kg'}));
 }
 const snapshot=(await user.api('get_user_training_context')).state;
 assert.equal(snapshot.sessions.length,3);assert.equal(snapshot.sessions.flatMap(s=>s.sets).length,18);
 assert.equal(snapshot.sessions.filter(s=>s.status==='active').length,0);
 assert.equal(snapshot.preferences.restSeconds,'75');
 for(const p of (await user.mcp('list_training_plans')).result){assert.equal(p.exercises[0].lastPerformance.weight,50);assert.equal(p.exercises[0].lastPerformance.reps,11)}
 assert.equal((await user.mcp('get_exercise_history',{exerciseName:'  RUDERN ENG '})).result.length,6);
 const exported=(await user.api('export_training_data')).result;
 assert.equal(exported.sessions.length,3);assert.equal(exported.sessions[2].sets.at(-1).corrections.length,1);
 await user.api('save_training_preference',{key:'restSeconds',value:'0'});
 assert.equal((await user.mcp('get_user_training_context')).state.preferences.restSeconds,'0');
 assert.equal((await other.api('list_training_plans')).result.length,0);
 assert.equal((await other.mcp('get_user_training_context')).state.sessions.length,0);
});
test('concurrent browser and MCP writes preserve every unique set and deduplicate retries',async()=>{
 const env={DB:new DB()},u=client(env,'parallel');
 const p=(await u.api('create_training_plan',{name:'Parallel',exercises:[{name:'Rudern',sets:3,minReps:8,maxReps:12}]})).result;
 const s=(await u.api('start_workout',{planId:p.id})).result,args={sessionId:s.id,exerciseId:s.exercises[0].id,weight:50,reps:10,unit:'kg'};
 await Promise.all([u.api('log_set',{...args,requestId:'A'}),u.mcp('log_set',{...args,requestId:'B'}),u.api('log_set',{...args,requestId:'C'})]);
 await Promise.all([u.api('log_set',{...args,requestId:'A'}),u.mcp('log_set',{...args,requestId:'A'})]);
 assert.equal((await u.api('get_user_training_context')).state.sessions[0].sets.length,3);
});
test('invalid inputs cannot corrupt data, including changed payloads reusing an id',async()=>{
 const env={DB:new DB()},u=client(env,'validation');
 const p=(await u.api('create_training_plan',{name:'Validation',exercises:[{name:'Rudern',sets:2,minReps:8,maxReps:12}]})).result;
 const s=(await u.api('start_workout',{planId:p.id})).result,args={sessionId:s.id,exerciseId:s.exercises[0].id,requestId:'valid',weight:50,reps:10,unit:'kg',rir:2,pain:false};
 for(const bad of [{weight:-1},{weight:1001},{reps:0},{reps:2.5},{reps:101},{rir:11},{unit:'stones'},{exerciseId:'foreign'},{requestId:1}]){
  await assert.rejects(u.api('log_set',{...args,...bad}));
 }
 await u.api('log_set',args);
 await assert.rejects(u.api('log_set',{...args,pain:true}));
 await assert.rejects(u.api('log_set',{...args,rir:0}));
 assert.equal((await u.api('get_user_training_context')).state.sessions[0].sets.length,1);
});
test('PWA assets, versioned frontend and embedded widget are valid',async()=>{
 const env={DB:new DB()};
 for(const path of ['/','/styles.css?v=test','/app.js?v=test','/manifest.webmanifest','/icon-192.png','/icon-512.png','/sw.js']){
  const r=await worker.fetch(new Request('https://qa.test'+path),env);assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>0);
 }
 const html=await (await worker.fetch(new Request('https://qa.test/'),env)).text();assert.match(html,/styles\.css\?v=[a-f0-9]+/);
 const icons=JSON.parse(await (await worker.fetch(new Request('https://qa.test/manifest.webmanifest'),env)).text()).icons;
 assert.ok(icons.some(x=>x.sizes==='192x192'));assert.ok(icons.some(x=>x.sizes==='512x512'));
});
