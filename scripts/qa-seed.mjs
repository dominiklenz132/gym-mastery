// Local-only fixtures. Never point this at a real user's account or origin.
const origin='http://127.0.0.1:4173';
const api=async(name,args={})=>{const r=await fetch(origin+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data.result};
const existing=await api('list_training_plans');
if(existing.length)throw Error('Local QA already has fixtures; refusing duplicates.');
const rows=[
 ['QA A · Oberkörper',['Rudern eng','Schrägbankdrücken','Butterfly Reverse am Kabelturm']],
 ['QA B · Ganzkörper',['Hackenschmidt','Rudern eng','Schulterdepression an der Dipmaschine']],
 ['QA C · Wiederaufnahme',['Rudern eng','Schrägbankdrücken']]
];
const plans=[];
for(const [name,names] of rows)plans.push(await api('create_training_plan',{name,exercises:names.map(name=>({name,sets:2,minReps:8,maxReps:12}))}));
await api('start_workout',{planId:plans[0].id});
console.log(JSON.stringify({origin,plans:plans.map(p=>({id:p.id,name:p.name})),active:plans[0].name}));
