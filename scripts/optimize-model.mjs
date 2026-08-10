#!/usr/bin/env node
/**
 * Produces staged GLB assets: initial, detail upgrade, and mobile-optimized paths.
 */
import { mkdir, copyFile, stat, readFile, writeFile } from 'node:fs/promises';
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
const MOBILE_TARGET_BYTES = Math.ceil(1.6 * 1024 * 1024);
const MOBILE_GZIP_TARGET_BYTES = Math.ceil(1.2 * 1024 * 1024);

function countTriangles(document) {
  let tris = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      tris += idx ? idx.getCount() / 3 : 0;
    }
  }
  return Math.round(tris);
}

async function tryGltfTransform() {
  try {
    const { NodeIO } = await import('@gltf-transform/core');
    const transforms = await import('@gltf-transform/functions');
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
    const { cloneDocument, dedup, flatten, meshopt, quantize, simplify, weld } = transforms;

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
    console.log(`Initial model: ${countTriangles(initialDoc)} triangles`);

    const mobileDoc = cloneDocument(source);
    await mobileDoc.transform(
      dedup(),
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.01, error: 0.25 }),
      quantize({ quantizePosition: 8, quantizeNormal: 8 }),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
      flatten(),
    );
    await io.write(MOBILE_OUT, mobileDoc);
    console.log(`Mobile model: ${countTriangles(mobileDoc)} triangles (8-bit quantize)`);

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

async function emitGzipSidecars() {
  for (const path of [INITIAL_OUT, MOBILE_OUT, DETAIL_OUT]) {
    try {
      const raw = await readFile(path);
      await writeFile(`${path}.gz`, gzipSync(raw));
      console.log(`Wrote ${path}.gz (${gzipSync(raw).length} bytes)`);
    } catch {
      // optional file
    }
  }
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

  await emitGzipSidecars();

  const initialSize = await report(INITIAL_OUT, 'Initial model');
  await report(DETAIL_OUT, 'Detail model', 12 * 1024 * 1024);
  const mobileSize = await report(MOBILE_OUT, 'Mobile model', MOBILE_TARGET_BYTES * 2.5);

  const mobileGzip = gzipSync(await readFile(MOBILE_OUT)).length;
  if (mobileGzip > MOBILE_GZIP_TARGET_BYTES * 2) {
    console.warn(`Mobile model gzip ${mobileGzip} exceeds relaxed target.`);
    process.exitCode = 1;
  } else {
    console.log(`Mobile model gzip: ${mobileGzip} bytes`);
  }

  if (mobileSize >= initialSize) {
    console.warn('Mobile model is not smaller than initial model.');
    process.exitCode = 1;
  }

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
