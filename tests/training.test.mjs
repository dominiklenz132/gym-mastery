import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,initialState,exerciseKey,exercisePerformances,trainingContext,progression} from '../server/domain.js';
import {readTimer,remainingSeconds,restSeconds,timeLabel} from '../src/training-runtime.js';
const plan=(st,name,exercise='Rudern eng')=>apply(st,'create_training_plan',{name,exercises:[{name:exercise,sets:2,minReps:8,maxReps:12}]});
const start=(st,p)=>apply(st,'start_workout',{planId:p.id});
const log=(st,s,values={})=>apply(st,'log_set',{sessionId:s.id,exerciseId:s.exercises[0].id,requestId:crypto.randomUUID(),weight:50,reps:10,unit:'kg',...values});

test('same exercise shares latest kg AND reps across plans, without rewriting history',()=>{
 const st=initialState(),a=plan(st,'A'),b=plan(st,'B','  RUDERN   eng  ');
 const sa=start(st,a);log(st,sa,{weight:52.5,reps:11});apply(st,'finish_workout',{sessionId:sa.id});
 const snapshot=JSON.stringify(sa),sb=start(st,b);
 let entry=trainingContext(st).exercisePerformance[exerciseKey('Rudern eng')];
 assert.equal(entry.weight,52.5);assert.equal(entry.reps,11);assert.equal(entry.planName,'A');
 log(st,sb,{weight:55,reps:9});
 entry=trainingContext(st).exercisePerformance[exerciseKey('Rudern eng')];
 assert.equal(entry.weight,55);assert.equal(entry.reps,9);assert.equal(entry.planName,'B');
 for(const p of apply(st,'list_training_plans',{}))assert.equal(p.exercises[0].lastPerformance.weight,55);
 assert.equal(apply(st,'get_training_plan',{planId:a.id}).exercises[0].lastPerformance.reps,9);
 assert.equal(JSON.stringify(sa),snapshot);
 assert.equal(apply(st,'get_exercise_history',{exerciseName:'rudern ENG'}).length,2);
});
test('different exercise names and independent user states do not share values',()=>{
 const a=initialState(),b=initialState(),p=plan(a,'A');plan(b,'B');log(a,start(a,p));
 assert.deepEqual(Object.keys(exercisePerformances(b)),[]);
 assert.equal(exercisePerformances(a)[exerciseKey('Rudern breit')],undefined);
});
test('correcting the latest set updates all plans; older corrections do not replace a newer performance',()=>{
 const st=initialState(),a=plan(st,'A'),b=plan(st,'B'),s=start(st,a);
 const first=log(st,s),latest=log(st,s,{weight:60,reps:8});
 first.createdAt='2026-01-01T00:00:00Z';latest.createdAt='2026-01-02T00:00:00Z';
 apply(st,'update_set',{sessionId:s.id,setId:latest.id,weight:62.5,reps:9});
 assert.equal(apply(st,'get_training_plan',{planId:b.id}).exercises[0].lastPerformance.weight,62.5);
 apply(st,'update_set',{sessionId:s.id,setId:first.id,weight:70,reps:12});
 assert.equal(exercisePerformances(st)[exerciseKey('Rudern eng')].weight,62.5);
 assert.equal(first.corrections[0].weight,50);
});
test('legacy data derives shared performance lazily; no stored-data migration required',()=>{
 const st=initialState(),p=plan(st,'Legacy'),s=start(st,p);const set=log(st,s);delete set.createdAt;
 assert.equal(trainingContext(st).exercisePerformance['rudern eng'].weight,50);
 assert.equal(st.exercisePerformance,undefined);
});
test('renamed exercises stop sharing; old session names stay historical',()=>{
 const st=initialState(),p=plan(st,'A'),s=start(st,p);log(st,s);
 apply(st,'update_training_plan',{planId:p.id,name:'A new',exercises:[{name:'Rudern breit',sets:2,minReps:8,maxReps:12}]});
 assert.equal(apply(st,'get_training_plan',{planId:p.id}).exercises[0].lastPerformance,null);
 assert.equal(s.exercises[0].name,'Rudern eng');
});
test('rest preference survives serialize/reload and supports fully disabled state',()=>{
 const st=initialState();assert.equal(restSeconds(st.preferences),120);
 apply(st,'save_training_preference',{key:'restSeconds',value:'75'});
 assert.equal(restSeconds(JSON.parse(JSON.stringify(st)).preferences),75);
 apply(st,'save_training_preference',{key:'restSeconds',value:'0'});
 assert.equal(restSeconds(st.preferences),0);
 assert.equal(st.preferences.restDurationSeconds,'75');
 for(const value of ['-1','1801','abc','12.5','Infinity'])assert.throws(()=>apply(st,'save_training_preference',{key:'restSeconds',value}));
 for(const key of ['__proto__','constructor','prototype'])assert.throws(()=>apply(st,'save_training_preference',{key,value:'x'}));
 assert.equal(restSeconds({restSeconds:'bad'}),120);
});
test('deadline timer catches up after backgrounding and reload, rather than losing elapsed seconds',()=>{
 const memory=new Map(),storage={getItem:key=>memory.get(key)};
 memory.set('rest',JSON.stringify({deadline:160000,duration:120}));
 const timer=readTimer(storage,'rest',40000);
 assert.equal(remainingSeconds(timer.deadline,40000),120);
 assert.equal(remainingSeconds(timer.deadline,114100),46);
 assert.equal(remainingSeconds(timer.deadline,160001),0);
 assert.equal(timeLabel(75),'01:15');assert.equal(timeLabel(1800),'30:00');
 assert.deepEqual(readTimer({getItem:()=>'{broken'},'rest',0),{deadline:0,duration:0});
 assert.deepEqual(readTimer({getItem:()=>{throw Error('blocked')}},'rest',0),{deadline:0,duration:0});
});
test('progression can use the same exercise in a different completed plan, but never invents evidence',()=>{
 const st=initialState(),a=plan(st,'A'),b=plan(st,'B'),s=start(st,a);
 log(st,s,{reps:12,rir:2});log(st,s,{reps:12,rir:2});apply(st,'finish_workout',{sessionId:s.id});
 const next=start(st,b),result=apply(st,'get_progression_recommendation',{sessionId:next.id,exerciseId:next.exercises[0].id});
 assert.equal(result.action,'increase_weight');assert.equal(result.weight,52.5);
 assert.equal(progression([{weight:50,reps:12,rir:2},{weight:55,reps:12,rir:2}],{sets:2,maxReps:12}).action,'hold');
});
test('full training A -> B -> A replay stays isolated, resumable and idempotent',()=>{
 const st=initialState(),a=plan(st,'A'),b=plan(st,'B');
 for(const p of [a,b,a]){
  const s=start(st,p);assert.equal(start(st,p).id,s.id);
  for(let n=0;n<2;n++){const args={requestId:s.id+'-'+n,weight:50+n*2.5,reps:10+n};log(st,s,args);log(st,s,args)}
  assert.equal(s.sets.length,2);apply(st,'finish_workout',{sessionId:s.id});
  assert.throws(()=>log(st,s));
 }
 assert.equal(st.sessions.length,3);assert.equal(st.sessions.flatMap(s=>s.sets).length,6);
 assert.equal(st.sessions.filter(s=>s.status==='active').length,0);
});
test('mixed units cannot produce an unsafe progression suggestion',()=>{
 const st=initialState(),p=plan(st,'Units'),s=start(st,p);
 log(st,s,{unit:'kg',reps:12,rir:2});log(st,s,{unit:'lb',reps:12,rir:2});
 assert.throws(()=>apply(st,'get_progression_recommendation',{sessionId:s.id,exerciseId:s.exercises[0].id}),/Gemischte Gewichtseinheiten/);
 assert.equal(exercisePerformances(st)['rudern eng'].unit,'lb');
});
