import React,{useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Clock3,History,Loader2,Minus,Plus,Settings2,Sparkles,Target,Timer,ArrowRight,Pencil} from 'lucide-react';
import {Badge,Button,Dialog,DialogContent,DialogDescription,DialogTitle,Input,cn} from './ui.jsx';
import {exerciseKey,exercisePerformances} from '../../server/domain.js';
import {readTimer,remainingSeconds,restSeconds,timeLabel} from '../training-runtime.js';
const fmt=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n);

function useRestTimer(sessionId,seconds){
 const key='gm-rest-'+sessionId;
 const [timer,setTimer]=useState(()=>{try{return readTimer(sessionStorage,key)}catch{return {deadline:0,duration:0}}});
 const [now,setNow]=useState(Date.now);
 const previousSeconds=useRef(seconds);
 function stop(){setTimer({deadline:0,duration:0});try{sessionStorage.removeItem(key)}catch{}}
 function start(){if(!seconds)return;const next={deadline:Date.now()+seconds*1000,duration:seconds};setNow(Date.now());setTimer(next);try{sessionStorage.setItem(key,JSON.stringify(next))}catch{}}
 useEffect(()=>{if(previousSeconds.current!==seconds){stop();previousSeconds.current=seconds}},[seconds]);
 const remaining=seconds?remainingSeconds(timer.deadline,now):0;
 useEffect(()=>{if(!timer.deadline||!remaining)return;const tick=()=>setNow(Date.now());const id=setInterval(tick,1000);addEventListener('visibilitychange',tick);addEventListener('focus',tick);return()=>{clearInterval(id);removeEventListener('visibilitychange',tick);removeEventListener('focus',tick)}},[timer.deadline,remaining>0]);
 return {start,stop,remaining,elapsed:!!timer.deadline&&!remaining,duration:timer.duration||seconds};
}

function RestPanel({sessionId,lastSetId,seconds,lastDuration,action,busy,notify}){
 const timer=useRestTimer(sessionId,seconds),previousSet=useRef(lastSetId);
 useEffect(()=>{if(previousSet.current!==lastSetId){previousSet.current=lastSetId;timer.start()}},[lastSetId]);
 const [draft,setDraft]=useState(seconds||lastDuration||120),[open,setOpen]=useState(false);
 useEffect(()=>{if(seconds)setDraft(seconds)},[seconds]);
 async function save(value){try{await action('save_training_preference',{key:'restSeconds',value:String(value)});notify(value?'Satzpause gespeichert.':'Pausentimer ausgeschaltet.')}catch{}}
 return <article className="rest-card panel">
  <div className="rest-heading"><p className="eyebrow">DEINE SATZPAUSE</p><Button variant="ghost" size="icon" aria-label="Pauseneinstellungen" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><Settings2 size={18}/></Button></div>
  {seconds>0?<><div className="rest-ring"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="70"/><circle cx="80" cy="80" r="70" style={{strokeDashoffset:440*(1-Math.min(1,timer.remaining/Math.max(1,timer.duration)))}}/></svg><div><Timer size={20}/><strong aria-label="Verbleibende Satzpause">{timeLabel(timer.remaining)}</strong><small>{timer.remaining?'PAUSE LÄUFT':timer.elapsed?'PAUSE BEENDET':timeLabel(seconds)+' EINGESTELLT'}</small></div></div>
   <div className="rest-actions"><Button variant="outline" disabled={busy} onClick={timer.start}><Clock3 size={16}/>{timer.remaining?'Neu starten':timeLabel(seconds)+' starten'}</Button>{timer.remaining>0&&<Button variant="ghost" onClick={timer.stop}>Pause beenden</Button>}</div></>:<div className="rest-disabled"><Timer size={28}/><h3>Ohne Countdown.</h3><p>Du bestimmst, wann es weitergeht.</p></div>}
  <label className="timer-toggle"><input type="checkbox" checked={seconds>0} disabled={busy} onChange={ev=>save(ev.target.checked?Number(draft)||lastDuration||120:0)}/>Pausentimer aktiv</label>
  {open&&<div className="rest-settings"><div className="rest-presets" role="group" aria-label="Pausendauer auswählen">{[60,90,120,180,300].map(n=><Button key={n} variant={seconds===n?'default':'outline'} disabled={busy} onClick={()=>save(n)}>{timeLabel(n)}</Button>)}</div><form onSubmit={ev=>{ev.preventDefault();save(Number(draft))}}><label className="field-label">Eigene Pausendauer (Sekunden)<Input type="number" min="0" max="1800" step="1" required value={draft} onChange={ev=>setDraft(ev.target.value)}/></label><Button variant="outline" disabled={busy} type="submit">Übernehmen</Button></form><p className="caption">Wird für dein Konto gespeichert. 0 = ausgeschaltet. Änderungen beenden eine laufende Pause.</p></div>}
 </article>;
}

export function Workout({session:s,state,action,busy,notify,finish}){
 const [chosen,setChosen]=useState(()=>s.exercises.find(x=>s.sets.filter(z=>z.exerciseId===x.id).length<x.sets)?.id||s.exercises.at(-1)?.id),[weight,setWeight]=useState(''),[reps,setReps]=useState(8),[unit,setUnit]=useState('kg'),[rir,setRir]=useState(''),[pain,setPain]=useState(false),[recommend,setRecommend]=useState(''),[correction,setCorrection]=useState(null),[confirmFinish,setConfirmFinish]=useState(false),[formError,setFormError]=useState('');
 const dirty=useRef(false),initialized=useRef(''),pending=useRef(null);
 const e=s.exercises.find(x=>x.id===chosen)||s.exercises.find(x=>s.sets.filter(z=>z.exerciseId===x.id).length<x.sets)||s.exercises.at(-1);
 const performances=state.exercisePerformance||exercisePerformances(state),last=performances[exerciseKey(e.name)];
 const done=s.sets.filter(x=>x.exerciseId===e.id),total=s.exercises.reduce((n,x)=>n+x.sets,0),completed=s.sets.length>=total&&s.exercises.every(x=>s.sets.filter(z=>z.exerciseId===x.id).length>=x.sets);
 const seconds=restSeconds(state.preferences);
 useEffect(()=>{
  setRecommend('');
  const identity=s.id+':'+e.id,isNew=initialized.current!==identity;
  if(isNew||!dirty.current){setWeight(last?.weight??'');setReps(last?.reps??e.minReps);setUnit(last?.unit||'kg')}
  if(isNew){initialized.current=identity;dirty.current=false;pending.current=null;setRir('');setPain(false);setRecommend('');setFormError('')}
 },[s.id,e.id,last?.setId,last?.weight,last?.reps,last?.unit]);
 function edit(set,value){dirty.current=true;set(value);setFormError('')}
 async function log(event){
  event.preventDefault();setFormError('');
  const payload={sessionId:s.id,exerciseId:e.id,weight:Number(weight),reps:Number(reps),unit,...(rir!==''?{rir:Number(rir)}:{}),pain};
  const fingerprint=JSON.stringify(payload);
  if(pending.current?.fingerprint!==fingerprint)pending.current={fingerprint,requestId:crypto.randomUUID()};
  const alreadyLogged=s.sets.some(x=>x.requestId===pending.current.requestId);
  try{await action('log_set',{...payload,requestId:pending.current.requestId});pending.current=null;dirty.current=false;setRir('');setPain(false);if(!alreadyLogged&&done.length<e.sets&&done.length+1>=e.sets){const next=s.exercises.find(x=>x.id!==e.id&&s.sets.filter(z=>z.exerciseId===x.id).length<x.sets);if(next)setChosen(next.id)}notify(alreadyLogged?'Dieser Satz war bereits gespeichert – nicht doppelt erfasst.':'Satz gespeichert. Ein Schritt stärker.')}catch(error){setFormError(error.message)}
 }
 return <div className="training-layout">
  <aside className="training-outline panel"><p className="eyebrow">DEINE EINHEIT</p><h2>{s.planName}</h2><div className="session-progress"><span>{s.sets.length} / {total} Sätze</span><span>{Math.min(100,Math.round(s.sets.length/total*100))}%</span></div><div className="progress-track"><i style={{width:Math.min(100,s.sets.length/total*100)+'%'}}/></div>{s.exercises.map((x,i)=><button key={x.id} className={cn('exercise-nav',x.id===e.id&&'selected')} onClick={()=>{if(dirty.current&&x.id!==e.id){notify('Deine noch nicht gespeicherten Eingaben werden beim Übungswechsel verworfen.')}setChosen(x.id)}} aria-current={x.id===e.id?'step':undefined}><span>{s.sets.filter(z=>z.exerciseId===x.id).length>=x.sets?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><div><strong>{x.name}</strong><small>{x.sets} Sätze · {x.minReps}–{x.maxReps} Wdh.</small></div></button>)}</aside>
  <article className="training-main panel"><div className="exercise-top"><Badge>LIVE TRAINING</Badge><span>{done.length>=e.sets?'Ziel erreicht · Zusatzsatz '+(done.length-e.sets+1):'Satz '+(done.length+1)+' von '+e.sets}</span></div><h2>{e.name}</h2>
   <div className="training-target"><Target size={20}/><div><small>DEIN WIEDERHOLUNGSZIEL</small><b>{e.minReps}–{e.maxReps} <span>Wiederholungen</span></b></div><Badge>{done.length} geschafft</Badge></div>
   <div className="previous-performance"><History size={16}/><span>Zuletzt · alle Pläne</span><b>{last?fmt(last.weight)+' '+last.unit+' × '+last.reps:'Noch keine Leistung gespeichert'}</b></div>
   {last&&<p className="shared-performance">Übernommen aus „{last.planName}“. Gleichnamige Übungen teilen ihre letzten Werte, nicht ihre Historie.</p>}
   {completed&&<p className="workout-complete" role="status"><Check size={17}/>Alle geplanten Sätze geschafft. Du kannst abschließen.</p>}
   <form onSubmit={log}><div className="training-inputs">{[['GEWICHT',weight,setWeight,unit,2.5],['WIEDERHOLUNGEN',reps,setReps,'Wdh.',1]].map(([label,value,set,suffix,step])=><label className="training-input" key={label}><span>{label}</span><div><input aria-label={label} type="number" min={label==='GEWICHT'?0:1} max={label==='GEWICHT'?1000:100} step={label==='GEWICHT'?'any':1} value={value} required placeholder="—" onChange={ev=>edit(set,ev.target.value)}/><small>{suffix}</small></div><div className="stepper-buttons"><Button type="button" variant="secondary" aria-label={label+' reduzieren'} onClick={()=>edit(set,Math.max(label==='GEWICHT'?0:1,Number(value)-step))}><Minus size={20}/></Button><Button type="button" variant="secondary" aria-label={label+' erhöhen'} onClick={()=>edit(set,Math.min(label==='GEWICHT'?1000:100,Number(value)+step))}><Plus size={20}/></Button></div></label>)}</div>
   <details className="effort-details"><summary>Anstrengung & Beschwerden <span>Optional</span><ChevronDown size={16}/></summary><label className="field-label rir-label">Wiederholungen im Tank <span>Optional · RIR</span><select value={rir} onChange={ev=>setRir(ev.target.value)}><option value="">Nicht angegeben</option>{[0,1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><label className="pain-label"><input type="checkbox" checked={pain} onChange={ev=>setPain(ev.target.checked)}/>Schmerzen bei diesem Satz</label></details>
   {formError&&<p className="form-error" role="alert">{formError}</p>}<Button type="submit" size="lg" className="w-full save-set" disabled={busy||!navigator.onLine}>{busy?<Loader2 className="spin" size={20}/>:<Check size={20}/>}Satz speichern<ArrowRight size={19}/></Button></form>
   <div className="logged-sets">{done.map((x,i)=><div key={x.id}><span><Check size={15}/>Satz {i+1}</span><strong>{fmt(x.weight)} {x.unit} × {x.reps}</strong><small>{x.rir==null?'':x.rir+' RIR'}</small><Button size="icon" variant="ghost" aria-label={'Satz '+(i+1)+' korrigieren'} onClick={()=>setCorrection({...x})}><Pencil size={15}/></Button></div>)}</div>
  </article>
  <aside className="training-side"><RestPanel sessionId={s.id} lastSetId={s.sets.at(-1)?.id} seconds={seconds} lastDuration={Number(state.preferences?.restDurationSeconds)} action={action} busy={busy} notify={notify}/><article className="progression-card panel"><span className="icon-tile lime"><Sparkles size={20}/></span><h3>Dein nächster Schritt.</h3><p>{recommend||'Prüfe deine Progression auf Basis deiner gespeicherten Sätze.'}</p><Button variant="ghost" onClick={async()=>{try{const r=await action('get_progression_recommendation',{sessionId:s.id,exerciseId:e.id});setRecommend((r.weight!=null?'Arbeitsgewicht: '+fmt(r.weight)+' '+unit+'. ':'')+r.reason)}catch{}}}>Empfehlung ansehen<ArrowRight size={17}/></Button></article><Button variant="outline" className="w-full" disabled={busy} onClick={()=>setConfirmFinish(true)}>Training abschließen <Check size={17}/></Button></aside>
  <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}><DialogContent><DialogTitle>{completed?'Starke Arbeit. Fertig für heute?':'Training jetzt abschließen?'}</DialogTitle><DialogDescription>{s.sets.length+' von '+total+' geplanten Sätzen sind gespeichert. Bereits gespeicherte Sätze bleiben erhalten.'}</DialogDescription><Button className="w-full" disabled={busy} onClick={async()=>{try{await action('finish_workout',{sessionId:s.id});try{sessionStorage.removeItem('gm-rest-'+s.id)}catch{}notify('Training abgeschlossen. Sei stolz auf deinen Einsatz.');finish()}catch{}}}>Einheit endgültig abschließen</Button></DialogContent></Dialog>
  <Dialog open={!!correction} onOpenChange={v=>!v&&setCorrection(null)}><DialogContent><DialogTitle>Satz korrigieren</DialogTitle><DialogDescription>Die alten Werte bleiben im Korrekturprotokoll. Die jüngste Leistung aktualisiert sich auch in anderen Plänen.</DialogDescription><form onSubmit={async ev=>{ev.preventDefault();try{await action('update_set',{sessionId:s.id,setId:correction.id,weight:Number(correction.weight),reps:Number(correction.reps)});dirty.current=false;setCorrection(null);notify('Satz korrigiert.')}catch{}}}><label className="field-label">Gewicht<Input type="number" min="0" max="1000" step="any" required value={correction?.weight??''} onChange={ev=>setCorrection(c=>({...c,weight:ev.target.value}))}/></label><label className="field-label">Wiederholungen<Input type="number" min="1" max="100" required value={correction?.reps??''} onChange={ev=>setCorrection(c=>({...c,reps:ev.target.value}))}/></label><Button disabled={busy} type="submit">Korrektur speichern</Button></form></DialogContent></Dialog>
 </div>;
}
