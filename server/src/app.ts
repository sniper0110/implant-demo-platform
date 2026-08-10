import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type pg from 'pg';
import { createPool, MemoryEmbedRepository, PostgresEmbedRepository } from './config/repository.js';
import { registerConfigRoutes, registerEmbedRoutes } from './routes/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations(pool: pg.Pool) {
  const migrationPath = join(__dirname, '../migrations/001_embeds.sql');
  const sql = await readFile(migrationPath, 'utf8');
  await pool.query(sql);
}

function createDefaultRepository() {
  return new MemoryEmbedRepository([
    {
      embed_id: 'emb_pycad_staging',
      status: 'active',
      customer_name: 'PYCAD Internal Staging',
      allowed_origins: ['https://pycad.co', 'https://www.pycad.co'],
      default_layout: 'section',
      release_id: process.env.RELEASE_ID ?? 'v1',
      product_family: 'lumbar-fusion',
      branding: {},
      controls: {},
      models: {
        initial: 'models/lumbar-fusion-initial.glb',
        detail: 'models/lumbar-fusion-detail.glb',
        mobile: 'models/lumbar-fusion-mobile.glb',
      },
      telemetry_enabled: true,
    },
  ]);
}

export async function buildApp() {
  const fastify = (await import('fastify')).default({ logger: true });
  const helmet = (await import('@fastify/helmet')).default;
  const cors = (await import('@fastify/cors')).default;
  const rateLimit = (await import('@fastify/rate-limit')).default;
  const staticPlugin = (await import('@fastify/static')).default;

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Loader script is included from customer origins (e.g. pycad.co).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    frameguard: false,
  });
  await fastify.register(cors, { origin: true });
  await fastify.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  const staticRoot = process.env.STATIC_ROOT ?? join(__dirname, '../../dist');
  const distRoot =
    staticRoot.startsWith('/') || /^[A-Za-z]:[\\/]/.test(staticRoot)
      ? staticRoot
      : join(process.cwd(), staticRoot);
  await fastify.register(staticPlugin, {
    root: distRoot,
    prefix: '/',
    decorateReply: true,
    setHeaders(res, filePath) {
      const normalized = filePath.replace(/\\/g, '/');
      if (/assets\/[^/]+\/.+\.(js|css|glb|woff2?)$/i.test(normalized)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }
      if (normalized.endsWith('/embed/v1.js') || normalized.endsWith('embed/v1.js')) {
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return;
      }
      if (normalized.endsWith('embed.html') || normalized.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      }
    },
  });

  const assetBaseUrl = process.env.ASSET_BASE_URL ?? '';
  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://127.0.0.1:8787';

  let repository;
  if (process.env.DATABASE_URL) {
    const pool = createPool(process.env.DATABASE_URL);
    await runMigrations(pool);
    repository = new PostgresEmbedRepository(pool);
  } else {
    repository = createDefaultRepository();
  }

  const deps = { repository, assetBaseUrl, publicBaseUrl };
  await registerConfigRoutes(fastify, deps);
  await registerEmbedRoutes(fastify, deps);

  fastify.get('/health', async () => ({ ok: true }));
  fastify.get('/ready', async () => ({ ok: true, release: process.env.RELEASE_ID ?? 'v1' }));

  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return reply.sendFile('index.html');
  });

  return fastify;
}

async function main() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
