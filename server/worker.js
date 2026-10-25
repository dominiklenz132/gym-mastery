import {initialState,apply,trainingContext} from './domain.js';
const HTML='__HTML__',CSS='__CSS__',JS='__JS__';
const MANIFEST='__MANIFEST__',ICON='__ICON__',SW='__SW__';
const PNGS='__PNGS__';
const str={type:'string'},num={type:'number'},integer={type:'integer'};
const specs={
 get_user_training_context:['Gespeicherte Pläne, aktive Einheit und Trainingshistorie laden. Beim Einstieg und in neuen Chats zuerst aufrufen.',{}],
 list_training_plans:['Meine Trainingspläne anzeigen.',{}],
 get_training_plan:['Übungen eines ausgewählten Trainingsplans anzeigen.',{planId:str}],
 create_training_plan:['Neuen Trainingsplan dauerhaft speichern. Ziele und Einschränkungen zuvor klären.',{name:str,exercises:{type:'array',minItems:1,items:{type:'object',properties:{name:str,sets:integer,minReps:integer,maxReps:integer,increment:num},required:['name','sets','minReps','maxReps'],additionalProperties:false}}}],
 start_workout:['Training starten oder aktive Einheit fortsetzen.',{planId:str}],
 log_set:['Einen tatsächlich ausgeführten Satz speichern. Bei unklarer Zuordnung nachfragen. requestId für Wiederholversuche identisch lassen.',{sessionId:str,exerciseId:str,requestId:str,weight:num,reps:integer,unit:{type:'string',enum:['kg','lb']},rir:num,pain:{type:'boolean'}}],
 finish_workout:['Aktive Trainingseinheit abschließen.',{sessionId:str}],
 get_exercise_history:['Tatsächlich gespeicherte Leistung einer Übung abrufen.',{exerciseName:str}],
 get_progression_recommendation:['Nachvollziehbare Double-Progression-Empfehlung auf gespeicherte Arbeitssätze stützen.',{sessionId:str,exerciseId:str}],
 save_training_preference:['Eine ausdrücklich genannte persönliche Trainingspräferenz speichern.',{key:str,value:str}]
};
specs.update_training_plan=['Trainingsplan als neue Version speichern. Bereits gestartete und abgeschlossene Einheiten bleiben historisch unverändert.',{planId:str,name:str,exercises:specs.create_training_plan[1].exercises}];
specs.update_set=['Einen falsch erfassten Satz korrigieren. Alte Werte bleiben im Korrekturprotokoll.',{sessionId:str,setId:str,weight:num,reps:integer}];
specs.export_training_data=['Alle eigenen Trainingsdaten für einen Datenexport abrufen.',{}];
const reads=new Set(['get_user_training_context','list_training_plans','get_training_plan','get_exercise_history','get_progression_recommendation','export_training_data']);
const tools=Object.entries(specs).map(([name,[description,properties]])=>({name,description,inputSchema:{type:'object',properties,required:Object.keys(properties).filter(k=>!['rir','pain','increment'].includes(k)),additionalProperties:false},annotations:{readOnlyHint:reads.has(name),destructiveHint:false,idempotentHint:reads.has(name)||['log_set','start_workout','finish_workout'].includes(name),openWorldHint:false},_meta:{ui:{resourceUri:'ui://gym-mastery/app.html'},'openai/outputTemplate':'ui://gym-mastery/app.html'}}));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function run(env,user,name,args){
 if(!user)throw Error('Bitte mit ChatGPT anmelden');
 for(let attempt=0;attempt<4;attempt++){
  const row=await env.DB.prepare('SELECT revision,data FROM training_state WHERE user_id=?').bind(user).first();
  const state=row?JSON.parse(row.data):initialState();const result=apply(state,name,args);
  if(reads.has(name))return {result,state:trainingContext(state)};
  const write=row?await env.DB.prepare('UPDATE training_state SET revision=revision+1,data=?,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(state),new Date().toISOString(),user,row.revision).run():await env.DB.prepare('INSERT OR IGNORE INTO training_state(user_id,revision,data,updated_at) VALUES(?,0,?,?)').bind(user,JSON.stringify(state),new Date().toISOString()).run();
  if(write.meta.changes)return {result,state:trainingContext(state)};
 }
 throw Error('Gleichzeitige Änderung. Bitte erneut versuchen.');
}
export default {async fetch(req,env){
 const url=new URL(req.url),user=req.headers.get('oai-authenticated-user-id');
 if(req.method==='GET'&&url.pathname==='/manifest.webmanifest')return new Response(MANIFEST,{headers:{'Content-Type':'application/manifest+json'}});
 if(req.method==='GET'&&url.pathname==='/icon.svg')return new Response(ICON,{headers:{'Content-Type':'image/svg+xml'}});
 if(req.method==='GET'&&/^\/icon-(192|512)\.png$/.test(url.pathname)){const size=url.pathname.includes('192')?192:512;return new Response(Uint8Array.from(atob(PNGS[size]),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/png'}})}
 if(req.method==='GET'&&url.pathname==='/sw.js')return new Response(SW,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache','Service-Worker-Allowed':'/'}});
 if(req.method==='GET'&&url.pathname==='/styles.css')return new Response(CSS,{headers:{'Content-Type':'text/css'}});
 if(req.method==='GET'&&url.pathname==='/app.js')return new Response(JS,{headers:{'Content-Type':'application/javascript'}});
 if(req.method==='GET'&&url.pathname==='/')return new Response(HTML,{headers:{'Content-Type':'text/html','Cache-Control':'no-store'}});
 if(url.pathname==='/api/action'){
  if(!user)return json({error:'Anmeldung erforderlich'},401);
  if(req.method!=='POST')return json({error:'POST erforderlich'},405);
  if(Number(req.headers.get('content-length'))>65536)return json({error:'Anfrage zu groß'},413);
  if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return json({error:'Origin abgelehnt'},403);
  try{const {name,args={}}=await req.json();return json(await run(env,user,name,args));}catch(e){return json({error:e.message},400);}
 }
 if(url.pathname==='/mcp'&&req.method==='POST'){
  let body;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400)}
  const {id,method,params={}}=body;
  const ok=result=>json({jsonrpc:'2.0',id,result});
  if(method==='server/discover')return ok({supportedVersions:['2026-07-28'],capabilities:{tools:{},resources:{}}});
  if(method==='initialize')return ok({protocolVersion:params.protocolVersion||'2025-06-18',capabilities:{tools:{},resources:{}},serverInfo:{name:'GYM MASTERY',version:'1.0.0'},instructions:'Beim Öffnen get_user_training_context aufrufen. Trainingsdaten niemals erfinden. Bei unklaren Werten nachfragen. Neue Pläne, meine Pläne und Training fortsetzen anbieten. Schmerzen haben Vorrang vor Progression.'});
  if(method==='tools/list')return ok({tools});
  if(method==='resources/list')return ok({resources:[{uri:'ui://gym-mastery/app.html',name:'GYM MASTERY',mimeType:'text/html;profile=mcp-app'}]});
  if(method==='resources/read')return ok({contents:[{uri:'ui://gym-mastery/app.html',mimeType:'text/html;profile=mcp-app',text:HTML.replace(/<link rel="stylesheet" href="styles\.css(?:\?v=[a-f0-9]+)?" \/>/,()=>'<style>'+CSS+'</style>').replace(/<script src="app\.js(?:\?v=[a-f0-9]+)?"><\/script>/,()=>'<script>'+JS.replaceAll('</script','<\\/script')+'</script>'),_meta:{ui:{prefersBorder:true},'openai/widgetPrefersBorder':true}}]});
  if(method==='tools/call'){
   try{const out=await run(env,user,params.name,params.arguments||{});return ok({content:[{type:'text',text:JSON.stringify(out.result)}],structuredContent:out,_meta:{'openai/outputTemplate':'ui://gym-mastery/app.html'}})}catch(e){return ok({isError:true,content:[{type:'text',text:e.message}]})}
  }
  if(id==null)return new Response(null,{status:202});
  return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 }
 return json({error:'Nicht gefunden'},404);
}};
