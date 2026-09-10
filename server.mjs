import http from 'node:http';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const port = Number(process.env.PORT ?? 3000);

function connectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return {
      host: PGHOST,
      port: Number(PGPORT ?? 5432),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
    };
  }
  throw new Error(
    'Missing Postgres env: set DATABASE_URL or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE',
  );
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    )
  `);

  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM usuarios');
  if (rows[0].count === 0) {
    await client.query(`
      INSERT INTO usuarios (nombre, apellido) VALUES
        ('Ana', 'García'),
        ('Luis', 'Pérez'),
        ('María', 'López'),
        ('Carlos', 'Ruiz')
    `);
    console.log('[hello-http] seeded mock usuarios');
  }
}

async function listUsuarios(client) {
  const { rows } = await client.query(
    'SELECT id, nombre, apellido FROM usuarios ORDER BY id ASC',
  );
  return rows;
}

async function main() {
  const client = new Client(connectionConfig());
  await client.connect();
  await ensureSchema(client);
  console.log('[hello-http] postgres ready');

  http
    .createServer(async (req, res) => {
      console.log(`[hello-http] ${req.method} ${req.url}`);
      try {
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('ok\n');
          return;
        }
        if (req.method === 'GET' && (req.url === '/' || req.url === '/usuarios')) {
          const usuarios = await listUsuarios(client);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ message: 'hola diply', usuarios }, null, 2) + '\n');
          return;
        }
        res.writeHead(404);
        res.end();
      } catch (err) {
        console.error('[hello-http] request error', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('internal error\n');
      }
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`[hello-http] listening on 0.0.0.0:${port}`);
    });
}

main().catch((err) => {
  console.error('[hello-http] failed to start', err);
  process.exit(1);
});
