import http from 'node:http';
import worker from '../dist/server/index.js';
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
http.createServer(async(req,res)=>{try{let body='';for await(const chunk of req)body+=chunk;const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':'local-visual-qa'},...(!['GET','HEAD'].includes(req.method)?{body}:{} )});const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){res.writeHead(500);res.end(e.message)}}).listen(4173,'127.0.0.1',()=>console.log('Local visual QA http://127.0.0.1:4173 — isolated memory data, no production writes'));
