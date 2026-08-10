import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createPool } from './config/repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('DATABASE_URL not set; skipping migration.');
    return;
  }

  const pool = createPool(connectionString);
  const sql = await readFile(join(__dirname, '../migrations/001_embeds.sql'), 'utf8');
  await pool.query(sql);
  await pool.end();
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
