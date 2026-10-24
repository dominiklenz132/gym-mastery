import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
let source=readFileSync('server/worker.js','utf8');
source=source.replace("import {initialState,apply} from './domain.js';",readFileSync('server/domain.js','utf8').replaceAll('export ',''));
for(const [key,path] of Object.entries({HTML:'dist/index.html',CSS:'dist/styles.css',JS:'dist/app.js'})) source=source.replace(`'__${key}__'`,JSON.stringify(readFileSync(path,'utf8')+(key==='CSS'?readFileSync('dist/connected.css','utf8'):'')));
mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js',source);
