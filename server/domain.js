export const initialState=()=>({plans:[],sessions:[],preferences:{},insights:[],measurements:[]});
export const exerciseKey=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
export function exercisePerformances(state){
 const entries=Object.create(null);
 for(const session of state.sessions||[])for(const set of session.sets||[]){
  const exercise=session.exercises.find(e=>e.id===set.exerciseId);if(!exercise)continue;
  const key=exerciseKey(exercise.name),time=Date.parse(set.createdAt||session.startedAt)||0;
  if(!entries[key]||time>=entries[key].time)entries[key]={weight:set.weight,reps:set.reps,unit:set.unit,rir:set.rir,pain:set.pain,createdAt:set.createdAt,exerciseName:exercise.name,sessionId:session.id,setId:set.id,planName:session.planName,time};
 }
 return entries;
}
export function trainingContext(state){return {...state,exercisePerformance:exercisePerformances(state)}}
function currentPlan(state,p){const last=exercisePerformances(state);return {...p,exercises:p.exercises.map(e=>({...e,lastPerformance:last[exerciseKey(e.name)]||null}))}}
export function progression(sets,exercise){
 const recent=sets.filter(s=>!s.warmup);
 if(!recent.length)return {action:'baseline',reason:'Noch keine Arbeitssätze gespeichert. Zuerst eine Ausgangsleistung erfassen.'};
 if(recent.some(s=>s.pain))return {action:'replace_or_reduce',reason:'Schmerzfeedback hat Vorrang. Übung unterbrechen und schmerzfreie Alternative prüfen.'};
 const weight=recent.at(-1).weight;
 if(recent.some(s=>s.weight!==weight))return {action:'hold',weight,reason:'Unterschiedliche Satzgewichte: zuerst eine vergleichbare Leistung mit gleichbleibendem Arbeitsgewicht erfassen.'};
 if(recent.some(s=>s.technique==='poor'||s.rir===0))return {action:'hold',weight,reason:'Gewicht beibehalten, bis Technik und Belastungsreserve stabil sind.'};
 const ready=recent.length>=exercise.sets&&recent.every(s=>s.reps>=exercise.maxReps&&s.rir!=null&&s.rir>=2);
 return ready?{action:'increase_weight',weight:weight+(exercise.increment||2.5),reason:'Alle Arbeitssätze erreichen die obere Wiederholungsgrenze mit mindestens 2 RIR.'}:{action:'increase_reps',weight,reason:'Gewicht beibehalten und innerhalb des Zielbereichs kontrolliert Wiederholungen aufbauen. Fehlende RIR-Werte rechtfertigen keine automatische Gewichtserhöhung.'};
}
export function apply(state,name,a){
 const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
 const plan=()=>{const p=state.plans.find(p=>p.id===a.planId);if(!p)throw Error('Trainingsplan nicht gefunden');return p};
 const session=()=>{const s=state.sessions.find(s=>s.id===a.sessionId);if(!s)throw Error('Training nicht gefunden');return s};
 if(name==='create_training_plan'){
  if(typeof a.name!=='string'||!a.name.trim()||a.name.length>100||!Array.isArray(a.exercises)||!a.exercises.length||a.exercises.length>50)throw Error('Name und 1–50 Übungen erforderlich');
  const exercises=a.exercises.map(e=>{if(!e.name?.trim()||!Number.isInteger(e.sets)||e.sets<1||e.sets>12||!Number.isInteger(e.minReps)||!Number.isInteger(e.maxReps)||e.minReps<1||e.maxReps<e.minReps||e.maxReps>100)throw Error('Ungültige Übungsziele');return {...e,id:id(),increment:e.increment||2.5}});
  const p={id:id(),name:a.name.trim(),version:1,exercises,createdAt:now()};state.plans.push(p);return p;
 }
 if(name==='start_workout') {const active=state.sessions.find(s=>s.status==='active');if(active)return active;const p=plan();const s={id:id(),planId:p.id,planName:p.name,planVersion:p.version,exercises:structuredClone(p.exercises),sets:[],status:'active',startedAt:now()};state.sessions.push(s);return s;}
 if(name==='update_training_plan') {const p=plan();const temporary=initialState();const next=apply(temporary,'create_training_plan',a);p.versions=p.versions||[];p.versions.push({version:p.version,name:p.name,exercises:structuredClone(p.exercises)});p.name=next.name;p.exercises=next.exercises;p.version+=1;return p;}
 if(name==='export_training_data')return {exportedAt:now(),...state};
 if(name==='update_set') {const s=session(),set=s.sets.find(x=>x.id===a.setId);if(!set)throw Error('Satz nicht gefunden');if(!Number.isFinite(a.weight)||a.weight<0||a.weight>1000||!Number.isInteger(a.reps)||a.reps<1||a.reps>100)throw Error('Ungültige Korrektur');set.corrections=set.corrections||[];set.corrections.push({weight:set.weight,reps:set.reps,at:now()});set.weight=a.weight;set.reps=a.reps;return set;}
 if(name==='log_set'){
  const s=session();if(s.status!=='active')throw Error('Training bereits beendet');
  if(typeof a.requestId!=='string'||!a.requestId||a.requestId.length>120)throw Error('requestId erforderlich');
  const exists=s.sets.find(x=>x.requestId===a.requestId);if(exists){if(exists.exerciseId!==a.exerciseId||exists.weight!==a.weight||exists.reps!==a.reps||exists.unit!==a.unit||exists.rir!==(a.rir??null)||exists.pain!==!!a.pain)throw Error('Diese requestId gehört bereits zu einem anderen Satzinhalt');return exists;}
  if(!s.exercises.some(e=>e.id===a.exerciseId))throw Error('Übung gehört nicht zu dieser Einheit');
  if(!Number.isFinite(a.weight)||a.weight<0||a.weight>1000||!Number.isInteger(a.reps)||a.reps<1||a.reps>100||!['kg','lb'].includes(a.unit)||a.rir!=null&&(!Number.isFinite(a.rir)||a.rir<0||a.rir>10))throw Error('Gewicht, Wiederholungen, Einheit oder RIR ungültig');
  const set={id:id(),requestId:a.requestId,exerciseId:a.exerciseId,weight:a.weight,reps:a.reps,unit:a.unit,rir:a.rir??null,pain:!!a.pain,createdAt:now()};s.sets.push(set);return set;
 }
 if(name==='finish_workout'){const s=session();if(s.status==='completed')return s;s.status='completed';s.finishedAt=now();return s;}
 if(name==='save_training_preference'){if(typeof a.key!=='string'||!a.key.trim()||a.key.length>100||['__proto__','constructor','prototype'].includes(a.key)||typeof a.value!=='string'||a.value.length>2000)throw Error('Ungültige Präferenz');if(a.key==='restSeconds'&&(!/^\d+$/.test(a.value)||Number(a.value)>1800))throw Error('Satzpause muss zwischen 0 und 1800 Sekunden liegen');state.preferences[a.key]=a.value;if(a.key==='restSeconds'&&Number(a.value)>0)state.preferences.restDurationSeconds=a.value;return state.preferences;}
 if(name==='get_progression_recommendation'){const s=session(),e=s.exercises.find(e=>e.id===a.exerciseId);if(!e)throw Error('Übung nicht gefunden');let sets=s.sets.filter(x=>x.exerciseId===e.id);if(!sets.length){const previous=state.sessions.filter(x=>x.id!==s.id&&x.status==='completed').slice().reverse().find(x=>x.sets.some(z=>exerciseKey(x.exercises.find(y=>y.id===z.exerciseId)?.name)===exerciseKey(e.name)));if(previous)sets=previous.sets.filter(z=>exerciseKey(previous.exercises.find(y=>y.id===z.exerciseId)?.name)===exerciseKey(e.name))}if(new Set(sets.map(x=>x.unit)).size>1)throw Error('Gemischte Gewichtseinheiten: zuerst in eine Einheit umrechnen');return progression(sets,e);}
 if(name==='list_training_plans')return state.plans.map(p=>currentPlan(state,p));
 if(name==='get_training_plan')return currentPlan(state,plan());
 if(name==='get_user_training_context')return trainingContext(state);
 if(name==='get_exercise_history')return state.sessions.flatMap(s=>s.sets.filter(x=>exerciseKey(s.exercises.find(e=>e.id===x.exerciseId)?.name)===exerciseKey(a.exerciseName)).map(x=>({...x,sessionId:s.id,startedAt:s.startedAt})));
 throw Error('Unbekannte Aktion');
}
