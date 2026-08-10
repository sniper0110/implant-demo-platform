#!/usr/bin/env node
/**
 * Validates production artifact sizes against embed platform budgets.
 * Run after: npm run build && npm run build:loader
 */
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

const BUDGETS = {
  loaderGzipBytes: 10 * 1024,
  shellGzipBytes: 150 * 1024,
  runtime3dGzipBytes: 350 * 1024,
  initialInteractiveGzipBytes: 512 * 1024,
  initialModelGzipBytes: Math.ceil(5.25 * 1024 * 1024),
  mobileModelGzipBytes: Math.ceil(5.25 * 1024 * 1024),
  detailModelBytes: 12 * 1024 * 1024,
};

async function gzipSize(filePath) {
  const buf = await readFile(filePath);
  return gzipSync(buf).length;
}

async function fileSize(filePath) {
  const s = await stat(filePath);
  return s.size;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function fail(msg) {
  console.error(`BUDGET FAIL: ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`BUDGET OK: ${msg}`);
}

async function main() {
  const loaderPath = join(DIST, 'embed', 'v1.js');
  const assetsDir = join(DIST, 'assets');
  const initialModelPath = join(DIST, 'models', 'lumbar-fusion-initial.glb');
  const mobileModelPath = join(DIST, 'models', 'lumbar-fusion-mobile.glb');
  const detailModelPath = join(DIST, 'models', 'lumbar-fusion-detail.glb');
  const legacyModelPath = join(DIST, 'models', 'lumbar-fusion.glb');

  try {
    await stat(loaderPath);
  } catch {
    fail(`Loader not found at ${loaderPath}. Run npm run build:loader`);
    return;
  }

  try {
    await stat(legacyModelPath);
    fail(`Legacy model still shipped at ${legacyModelPath}`);
  } catch {
    pass('Legacy lumbar-fusion.glb not shipped');
  }

  const loaderGzip = await gzipSize(loaderPath);
  if (loaderGzip > BUDGETS.loaderGzipBytes) {
    fail(`Loader ${loaderGzip} bytes gzip > ${BUDGETS.loaderGzipBytes}`);
  } else {
    pass(`Loader ${loaderGzip} bytes gzip`);
  }

  const assetFiles = await walk(assetsDir);
  const jsFiles = assetFiles.filter((f) => extname(f) === '.js');
  const cssFiles = assetFiles.filter((f) => extname(f) === '.css');

  let shellGzip = 0;
  let runtimeGzip = 0;

  for (const file of jsFiles) {
    const name = file.replace(/\\/g, '/');
    const gz = await gzipSize(file);
    if (name.includes('three') || name.includes('drei') || name.includes('r3f') || name.includes('scene')) {
      runtimeGzip += gz;
    } else {
      shellGzip += gz;
    }
  }

  for (const file of cssFiles) {
    shellGzip += await gzipSize(file);
  }

  if (shellGzip > BUDGETS.shellGzipBytes) {
    fail(`Shell ${shellGzip} bytes gzip > ${BUDGETS.shellGzipBytes}`);
  } else {
    pass(`Shell ${shellGzip} bytes gzip`);
  }

  if (runtimeGzip > BUDGETS.runtime3dGzipBytes) {
    fail(`3D runtime ${runtimeGzip} bytes gzip > ${BUDGETS.runtime3dGzipBytes}`);
  } else {
    pass(`3D runtime ${runtimeGzip} bytes gzip`);
  }

  const initialInteractive = loaderGzip + shellGzip;
  if (initialInteractive > BUDGETS.initialInteractiveGzipBytes) {
    fail(
      `Initial interactive ${initialInteractive} bytes gzip > ${BUDGETS.initialInteractiveGzipBytes}`,
    );
  } else {
    pass(`Initial interactive ${initialInteractive} bytes gzip (loader + shell, before 3D)`);
  }

  const deferred3d = runtimeGzip;
  if (initialInteractive + deferred3d > 5 * 1024 * 1024) {
    fail(`Deferred 3D bootstrap ${initialInteractive + deferred3d} bytes gzip > 5 MB`);
  } else {
    pass(`Deferred 3D bootstrap ${initialInteractive + deferred3d} bytes gzip`);
  }

  try {
    const modelGzip = await gzipSize(initialModelPath);
    if (modelGzip > BUDGETS.initialModelGzipBytes) {
      fail(`Initial model ${modelGzip} bytes gzip > ${BUDGETS.initialModelGzipBytes}`);
    } else {
      pass(`Initial model ${modelGzip} bytes gzip (loaded after viewport visibility)`);
    }

    const mobileGzip = await gzipSize(mobileModelPath);
    if (mobileGzip > BUDGETS.mobileModelGzipBytes) {
      fail(`Mobile model ${mobileGzip} bytes gzip > ${BUDGETS.mobileModelGzipBytes}`);
    } else {
      pass(`Mobile model ${mobileGzip} bytes gzip`);
    }

    if (mobileGzip > modelGzip) {
      fail(`Mobile model must not exceed initial (${mobileGzip} > ${modelGzip})`);
    } else if (mobileGzip < modelGzip) {
      pass(`Mobile model smaller than initial (${mobileGzip} < ${modelGzip})`);
    } else {
      pass(`Mobile model matches initial size (${mobileGzip} bytes gzip)`);
    }
  } catch {
    fail(`No initial/mobile model found at ${initialModelPath} / ${mobileModelPath}`);
  }

  try {
    await stat(detailModelPath);
    const detailBytes = await fileSize(detailModelPath);
    if (detailBytes > BUDGETS.detailModelBytes) {
      fail(`Detail model ${detailBytes} bytes > ${BUDGETS.detailModelBytes}`);
    } else {
      pass(`Detail model ${detailBytes} bytes (optional upgrade)`);
    }
  } catch {
    pass('Detail model not present (optional)');
  }

  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
