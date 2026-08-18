const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const checklistPath = path.join(root, 'checklist.json');
const port = Number(process.env.PORT) || 4175;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function sendJson(response, status, data){
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  response.end(JSON.stringify(data));
}
function validChecklist(value){
  return Array.isArray(value) && value.every(item => item && typeof item.label === 'string' && ['line', 'options'].includes(item.type));
}

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if(url.pathname === '/api/checklist'){
    if(request.method === 'GET'){
      fs.readFile(checklistPath, 'utf8', (error, data) => {
        if(error) return sendJson(response, 500, {error:'Не вдалося прочитати чек-лист'});
        try { sendJson(response, 200, JSON.parse(data)); }
        catch { sendJson(response, 500, {error:'Файл чек-листа має некоректний формат'}); }
      });
      return;
    }
    if(request.method === 'POST'){
      let body = '';
      request.on('data', chunk => {
        body += chunk;
        if(body.length > 1024 * 1024) request.destroy();
      });
      request.on('end', () => {
        try {
          const checklist = JSON.parse(body);
          if(!validChecklist(checklist)) return sendJson(response, 400, {error:'Некоректні дані чек-листа'});
          fs.writeFile(checklistPath, `${JSON.stringify(checklist, null, 2)}\n`, 'utf8', error => {
            if(error) return sendJson(response, 500, {error:'Не вдалося зберегти чек-лист'});
            sendJson(response, 200, {ok:true});
          });
        } catch { sendJson(response, 400, {error:'Некоректний JSON'}); }
      });
      return;
    }
    return sendJson(response, 405, {error:'Метод не підтримується'});
  }

  const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if(!filePath.startsWith(`${root}${path.sep}`)){
    response.writeHead(403); response.end('Forbidden'); return;
  }
  fs.readFile(filePath, (error, data) => {
    if(error){ response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, {'Content-Type':contentTypes[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Генератор відкритий: http://127.0.0.1:${port}`));
