const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  const name=decodeURIComponent((req.url||'/').split('?')[0]);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,content)=>{
    if(error){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(content);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Academy E2E server ready'));
