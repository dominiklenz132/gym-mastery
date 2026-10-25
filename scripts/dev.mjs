import http from 'node:http';
import {statSync} from 'node:fs';
let workerVersion='',worker;
const rows=new Map();
const DB={
 prepare(sql){
  return {
   bind(...args){
    return {
     async first(){return rows.get(args[0])||null},
     async run(){
      if(sql.startsWith('INSERT')){if(rows.has(args[0]))return {meta:{changes:0}};rows.set(args[0],{revision:0,data:args[1]});return {meta:{changes:1}}}
      const [data,time,user,revision]=args;const row=rows.get(user);
      if(!row||row.revision!==revision)return {meta:{changes:0}};
      rows.set(user,{revision:revision+1,data});return {meta:{changes:1}};
     }
    };
   }
  };
 }
};
let fault=null;
http.createServer(async(req,res)=>{try{
 let body='';for await(const chunk of req)body+=chunk;
 if(req.url==='/__qa/fail-next'&&req.method==='POST'){fault=JSON.parse(body);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({queued:fault}));return}
 const injection=req.url==='/api/action'&&JSON.parse(body||'{}').name==='log_set'?fault:null;if(injection)fault=null;
 if(injection?.mode==='before'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'QA: Verbindung vor dem Speichern unterbrochen. Bitte erneut versuchen.'}));return}
 if(injection?.delay)await new Promise(resolve=>setTimeout(resolve,Math.min(10000,Math.max(0,injection.delay))));
 const version=statSync(new URL('../dist/server/index.js',import.meta.url)).mtimeMs;
 if(version!==workerVersion){worker=(await import('../dist/server/index.js?v='+version)).default;workerVersion=version}
 const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':'local-visual-qa'},...(!['GET','HEAD'].includes(req.method)?{body}:{} )});
 const response=await worker.fetch(request,{DB});
 if(injection?.mode==='after'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'QA: Antwort nach dem Speichern verloren. Bitte denselben Satz erneut versuchen.'}));return}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
 }catch(e){res.writeHead(500);res.end(e.message)}}).listen(4173,'127.0.0.1',()=>console.log('Local visual QA http://127.0.0.1:4173 — isolated memory data, no production writes'));
