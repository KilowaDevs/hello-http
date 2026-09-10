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

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2) + '\n');
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generos (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS peliculas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      anio INT NOT NULL,
      genero_id INT NOT NULL REFERENCES generos(id)
    );

    CREATE TABLE IF NOT EXISTS actores (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pelicula_actores (
      pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
      actor_id INT NOT NULL REFERENCES actores(id) ON DELETE CASCADE,
      rol TEXT NOT NULL DEFAULT 'actor',
      PRIMARY KEY (pelicula_id, actor_id)
    );
  `);

  const { rows: userCount } = await client.query(
    'SELECT COUNT(*)::int AS count FROM usuarios',
  );
  if (userCount[0].count === 0) {
    await client.query(`
      INSERT INTO usuarios (nombre, apellido) VALUES
        ('Ana', 'García'),
        ('Luis', 'Pérez'),
        ('María', 'López'),
        ('Carlos', 'Ruiz')
    `);
    console.log('[hello-http] seeded mock usuarios');
  }

  const { rows: genreCount } = await client.query(
    'SELECT COUNT(*)::int AS count FROM generos',
  );
  if (genreCount[0].count === 0) {
    await client.query(`
      INSERT INTO generos (id, nombre) VALUES
        (1, 'Drama'),
        (2, 'Ciencia ficción'),
        (3, 'Acción'),
        (4, 'Comedia')
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('generos', 'id'), 4)`);

    await client.query(`
      INSERT INTO peliculas (id, titulo, anio, genero_id) VALUES
        (1, 'Inception', 2010, 2),
        (2, 'The Dark Knight', 2008, 3),
        (3, 'Interstellar', 2014, 2),
        (4, 'La La Land', 2016, 1),
        (5, 'Barbie', 2023, 4)
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('peliculas', 'id'), 5)`);

    await client.query(`
      INSERT INTO actores (id, nombre, apellido) VALUES
        (1, 'Leonardo', 'DiCaprio'),
        (2, 'Christian', 'Bale'),
        (3, 'Matthew', 'McConaughey'),
        (4, 'Emma', 'Stone'),
        (5, 'Ryan', 'Gosling'),
        (6, 'Margot', 'Robbie'),
        (7, 'Anne', 'Hathaway')
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('actores', 'id'), 7)`);

    await client.query(`
      INSERT INTO pelicula_actores (pelicula_id, actor_id, rol) VALUES
        (1, 1, 'Dom Cobb'),
        (2, 2, 'Bruce Wayne / Batman'),
        (3, 3, 'Cooper'),
        (3, 7, 'Brand'),
        (4, 4, 'Mia'),
        (4, 5, 'Sebastian'),
        (5, 6, 'Barbie'),
        (5, 5, 'Ken')
    `);
    console.log('[hello-http] seeded mock cine (generos, peliculas, actores, pelicula_actores)');
  }
}

async function listUsuarios(client) {
  const { rows } = await client.query(
    'SELECT id, nombre, apellido FROM usuarios ORDER BY id ASC',
  );
  return rows;
}

async function listGeneros(client) {
  const { rows } = await client.query(
    'SELECT id, nombre FROM generos ORDER BY id ASC',
  );
  return rows;
}

async function listPeliculas(client) {
  const { rows } = await client.query(`
    SELECT
      p.id,
      p.titulo,
      p.anio,
      p.genero_id,
      g.nombre AS genero
    FROM peliculas p
    JOIN generos g ON g.id = p.genero_id
    ORDER BY p.id ASC
  `);
  return rows;
}

async function listActores(client) {
  const { rows } = await client.query(
    'SELECT id, nombre, apellido FROM actores ORDER BY id ASC',
  );
  return rows;
}

async function listReparto(client) {
  const { rows } = await client.query(`
    SELECT
      pa.pelicula_id,
      p.titulo AS pelicula,
      pa.actor_id,
      a.nombre || ' ' || a.apellido AS actor,
      pa.rol
    FROM pelicula_actores pa
    JOIN peliculas p ON p.id = pa.pelicula_id
    JOIN actores a ON a.id = pa.actor_id
    ORDER BY pa.pelicula_id ASC, pa.actor_id ASC
  `);
  return rows;
}

async function cineOverview(client) {
  const [generos, peliculas, actores, reparto] = await Promise.all([
    listGeneros(client),
    listPeliculas(client),
    listActores(client),
    listReparto(client),
  ]);
  return { generos, peliculas, actores, reparto };
}

async function main() {
  const client = new Client(connectionConfig());
  await client.connect();
  await ensureSchema(client);
  console.log('[hello-http] postgres ready');

  http
    .createServer(async (req, res) => {
      const url = req.url?.split('?')[0] ?? '/';
      console.log(`[hello-http] ${req.method} ${url}`);
      try {
        if (req.method !== 'GET') {
          res.writeHead(404);
          res.end();
          return;
        }

        if (url === '/health') {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('ok\n');
          return;
        }

        if (url === '/') {
          json(res, 200, {
            message: 'hola diply',
            endpoints: [
              '/health',
              '/usuarios',
              '/cine',
              '/generos',
              '/peliculas',
              '/actores',
              '/reparto',
            ],
          });
          return;
        }

        if (url === '/usuarios') {
          json(res, 200, { usuarios: await listUsuarios(client) });
          return;
        }

        if (url === '/cine') {
          json(res, 200, await cineOverview(client));
          return;
        }

        if (url === '/generos') {
          json(res, 200, { generos: await listGeneros(client) });
          return;
        }

        if (url === '/peliculas') {
          json(res, 200, { peliculas: await listPeliculas(client) });
          return;
        }

        if (url === '/actores') {
          json(res, 200, { actores: await listActores(client) });
          return;
        }

        if (url === '/reparto') {
          json(res, 200, { reparto: await listReparto(client) });
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
