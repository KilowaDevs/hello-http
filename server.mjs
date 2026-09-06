import http from 'node:http';
import process from 'node:process';

const port = Number(process.env.PORT ?? 3000);

http
  .createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('hola diply-test\n');
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(port, '0.0.0.0');
