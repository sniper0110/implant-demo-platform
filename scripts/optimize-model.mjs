#!/usr/bin/env node
/**
 * Produces staged GLB assets: initial, detail upgrade, and mobile-optimized paths.
 */
import { mkdir, copyFile, stat, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INPUT = join(ROOT, 'public', 'models', 'lumbar-fusion.glb');
const OUT_DIR = join(ROOT, 'public', 'models');
const INITIAL_OUT = join(OUT_DIR, 'lumbar-fusion-initial.glb');
const DETAIL_OUT = join(OUT_DIR, 'lumbar-fusion-detail.glb');
const MOBILE_OUT = join(OUT_DIR, 'lumbar-fusion-mobile.glb');

const INITIAL_TARGET_BYTES = 4 * 1024 * 1024;
const MOBILE_TARGET_BYTES = 2 * 1024 * 1024;

async function tryGltfTransform() {
  try {
    const { NodeIO } = await import('@gltf-transform/core');
    const { cloneDocument, dedup, flatten, meshopt, quantize, simplify, weld } = await import('@gltf-transform/functions');
    const { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } = await import('meshoptimizer');
    const { EXTMeshoptCompression } = await import('@gltf-transform/extensions');

    await MeshoptEncoder.ready;
    await MeshoptDecoder.ready;
    await MeshoptSimplifier.ready;

    const io = new NodeIO()
      .registerExtensions([EXTMeshoptCompression])
      .registerDependencies({
        'meshopt.encoder': MeshoptEncoder,
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.simplifier': MeshoptSimplifier,
      });

    const source = await io.read(INPUT);

    const initialDoc = cloneDocument(source);
    await initialDoc.transform(
      dedup(),
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.01, error: 0.25 }),
      quantize(),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
      flatten(),
    );
    await io.write(INITIAL_OUT, initialDoc);

    const mobileDoc = cloneDocument(source);
    await mobileDoc.transform(
      dedup(),
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.006, error: 0.24 }),
      quantize(),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
      flatten(),
    );
    await io.write(MOBILE_OUT, mobileDoc);

    const detailDoc = cloneDocument(source);
    await detailDoc.transform(
      dedup(),
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.02 }),
      quantize(),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
      flatten(),
    );
    await io.write(DETAIL_OUT, detailDoc);

    return true;
  } catch (err) {
    console.warn('gltf-transform optimization unavailable, using copy fallback:', err.message);
    return false;
  }
}

async function copyFallback() {
  await mkdir(dirname(INITIAL_OUT), { recursive: true });
  await copyFile(INPUT, INITIAL_OUT);
  await copyFile(INPUT, DETAIL_OUT);
  await copyFile(INPUT, MOBILE_OUT);
}

async function report(path, label, targetBytes = INITIAL_TARGET_BYTES) {
  const s = await stat(path);
  const mb = (s.size / (1024 * 1024)).toFixed(2);
  const ok = s.size <= targetBytes ? 'OK' : 'OVER BUDGET';
  console.log(`${label}: ${mb} MB (${s.size} bytes) [${ok}]`);
  return s.size;
}

async function main() {
  const optimized = await tryGltfTransform();
  if (!optimized) {
    await copyFallback();
  }

  await report(INITIAL_OUT, 'Initial model');
  await report(DETAIL_OUT, 'Detail model', 12 * 1024 * 1024);
  await report(MOBILE_OUT, 'Mobile model', MOBILE_TARGET_BYTES);

  const initialGzip = gzipSync(await readFile(INITIAL_OUT)).length;
  const gzipTarget = Math.ceil(5.25 * 1024 * 1024);
  if (initialGzip > gzipTarget) {
    console.warn(`Initial model gzip ${initialGzip} exceeds ${gzipTarget} bytes target.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
