#!/usr/bin/env node
/**
 * Copies versioned static assets into dist/assets/{releaseId}/ for embed CDN URLs.
 */
import { cp, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const RELEASE_ID = process.env.VITE_RELEASE_ID ?? process.env.RELEASE_ID ?? 'v1';
const TARGET = join(DIST, 'assets', RELEASE_ID);

const COPY_DIRS = ['models'];
const LEGACY_MODEL = 'lumbar-fusion.glb';

async function removeLegacyModel(baseDir) {
  try {
    await unlink(join(baseDir, 'models', LEGACY_MODEL));
    console.log(`[stage-release-assets] removed legacy ${LEGACY_MODEL} from ${baseDir}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function main() {
  await mkdir(TARGET, { recursive: true });

  for (const dir of COPY_DIRS) {
    const source = join(DIST, dir);
    const dest = join(TARGET, dir);
    try {
      await cp(source, dest, { recursive: true });
      console.log(`[stage-release-assets] ${dir} -> assets/${RELEASE_ID}/${dir}`);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        console.warn(`[stage-release-assets] skip missing ${dir}`);
        continue;
      }
      throw error;
    }
  }

  await removeLegacyModel(DIST);
  await removeLegacyModel(TARGET);
}

main().catch((error) => {
  console.error('[stage-release-assets] failed', error);
  process.exit(1);
});
