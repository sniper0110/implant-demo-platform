import pg from 'pg';
import type { EmbedRecord, EmbedRepository } from './types.js';

const { Pool } = pg;

export class PostgresEmbedRepository implements EmbedRepository {
  constructor(private pool: pg.Pool) {}

  async getById(embedId: string): Promise<EmbedRecord | null> {
    const result = await this.pool.query<EmbedRecord>(
      `SELECT embed_id, status, customer_name, allowed_origins, default_layout, release_id,
              product_family, branding, controls, models, telemetry_enabled
       FROM embed_configs
       WHERE embed_id = $1
       LIMIT 1`,
      [embedId],
    );
    return result.rows[0] ?? null;
  }
}

export function createPool(connectionString: string) {
  return new Pool({ connectionString });
}

export class MemoryEmbedRepository implements EmbedRepository {
  private records: EmbedRecord[];

  constructor(records: EmbedRecord[]) {
    this.records = records;
  }

  async getById(embedId: string): Promise<EmbedRecord | null> {
    return this.records.find((record) => record.embed_id === embedId) ?? null;
  }
}
