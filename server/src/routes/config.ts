import type { FastifyInstance } from 'fastify';
import type { EmbedRepository } from '../config/types.js';
import { cspForEmbed, toPublicConfig, toRuntimeConfig } from '../security/csp.js';

interface ConfigRouteDeps {
  repository: EmbedRepository;
  assetBaseUrl: string;
  publicBaseUrl: string;
}

export async function registerConfigRoutes(app: FastifyInstance, deps: ConfigRouteDeps) {
  app.get('/api/config/:embedId', async (request, reply) => {
    const { embedId } = request.params as { embedId: string };
    const record = await deps.repository.getById(embedId);

    if (!record || record.status !== 'active') {
      return reply.code(404).send({ error: 'embed_not_found' });
    }

    const runtime = toRuntimeConfig(record, deps.assetBaseUrl, deps.publicBaseUrl);
    reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return toPublicConfig(runtime);
  });
}

export async function registerEmbedRoutes(app: FastifyInstance, deps: ConfigRouteDeps) {
  app.get('/e/:embedId', async (request, reply) => {
    const { embedId } = request.params as { embedId: string };
    const record = await deps.repository.getById(embedId);

    if (!record || record.status !== 'active') {
      return reply.code(404).type('text/html').send('<h1>Embed unavailable</h1>');
    }

    reply.header('Content-Security-Policy', cspForEmbed(record));
    reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return reply.sendFile('embed.html');
  });
}
