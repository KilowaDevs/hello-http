import http from 'node:http';
import process from 'node:process';

const port = Number(process.env.PORT ?? 3000);

http
  .createServer((req, res) => {
    console.log(`[hello-http] ${req.method} ${req.url}`);
    console.log("asd");
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('hola diply\n');
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`[hello-http] listening on 0.0.0.0:${port}`);
  });
