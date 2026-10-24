export const initialState=()=>({plans:[],sessions:[],preferences:{},insights:[],measurements:[]});
export function progression(sets,exercise){
 const recent=sets.filter(s=>!s.warmup);
 if(!recent.length)return {action:'baseline',reason:'Noch keine Arbeitssätze gespeichert. Zuerst eine Ausgangsleistung erfassen.'};
 if(recent.some(s=>s.pain))return {action:'replace_or_reduce',reason:'Schmerzfeedback hat Vorrang. Übung unterbrechen und schmerzfreie Alternative prüfen.'};
 const weight=recent.at(-1).weight;
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
  if(!a.requestId||a.requestId.length>120)throw Error('requestId erforderlich');
  const exists=s.sets.find(x=>x.requestId===a.requestId);if(exists){if(exists.exerciseId!==a.exerciseId||exists.weight!==a.weight||exists.reps!==a.reps||exists.unit!==a.unit)throw Error('Diese requestId gehört bereits zu einem anderen Satzinhalt');return exists;}
  if(!s.exercises.some(e=>e.id===a.exerciseId))throw Error('Übung gehört nicht zu dieser Einheit');
  if(!Number.isFinite(a.weight)||a.weight<0||a.weight>1000||!Number.isInteger(a.reps)||a.reps<1||a.reps>100||!['kg','lb'].includes(a.unit)||a.rir!=null&&(!Number.isFinite(a.rir)||a.rir<0||a.rir>10))throw Error('Gewicht, Wiederholungen, Einheit oder RIR ungültig');
  const set={id:id(),requestId:a.requestId,exerciseId:a.exerciseId,weight:a.weight,reps:a.reps,unit:a.unit,rir:a.rir??null,pain:!!a.pain,createdAt:now()};s.sets.push(set);return set;
 }
 if(name==='finish_workout'){const s=session();if(s.status==='completed')return s;s.status='completed';s.finishedAt=now();return s;}
 if(name==='save_training_preference'){if(!a.key||typeof a.value!=='string')throw Error('Präferenz fehlt');state.preferences[a.key]=a.value;return state.preferences;}
 if(name==='get_progression_recommendation'){const s=session(),e=s.exercises.find(e=>e.id===a.exerciseId);if(!e)throw Error('Übung nicht gefunden');const sets=s.sets.filter(x=>x.exerciseId===e.id);if(new Set(sets.map(x=>x.unit)).size>1)throw Error('Gemischte Gewichtseinheiten: zuerst in eine Einheit umrechnen');return progression(sets,e);}
 if(name==='list_training_plans')return state.plans;
 if(name==='get_training_plan')return plan();
 if(name==='get_user_training_context')return state;
 if(name==='get_exercise_history')return state.sessions.flatMap(s=>s.sets.filter(x=>s.exercises.find(e=>e.id===x.exerciseId)?.name===a.exerciseName).map(x=>({...x,sessionId:s.id,startedAt:s.startedAt})));
 throw Error('Unbekannte Aktion');
}
