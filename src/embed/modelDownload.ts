import type { EmbedConfigResponse } from './config';
import { resolveInitialModelPath, resolveModelUrl } from './config';
import { isCoarsePointerDevice } from './deviceTier';

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
}

export type ProgressListener = (progress: DownloadProgress) => void;

declare global {
  interface Window {
    __PYCAD_EMBED_CONFIG__?: EmbedConfigResponse;
    __PYCAD_MODEL_FETCH__?: Promise<ArrayBuffer>;
    __PYCAD_MODEL_PROGRESS__?: DownloadProgress;
  }
}

const progressListeners = new Set<ProgressListener>();

function emitProgress(progress: DownloadProgress) {
  window.__PYCAD_MODEL_PROGRESS__ = progress;
  for (const listener of progressListeners) listener(progress);
}

export function subscribeModelProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  if (window.__PYCAD_MODEL_PROGRESS__) {
    listener(window.__PYCAD_MODEL_PROGRESS__);
  }
  return () => progressListeners.delete(listener);
}

export function readInlinedConfig(embedId: string): EmbedConfigResponse | null {
  const inlined = window.__PYCAD_EMBED_CONFIG__;
  if (!inlined || inlined.embedId !== embedId) return null;
  return inlined;
}

export function resolveBootstrapModelUrl(config: EmbedConfigResponse): string {
  const useMobile = isCoarsePointerDevice();
  const modelPath = resolveInitialModelPath(config.models, useMobile);
  const base = config.assetBaseUrl || window.location.origin;
  return resolveModelUrl(base, config.releaseId, modelPath);
}

async function streamResponseToBuffer(
  response: Response,
  onProgress?: ProgressListener,
): Promise<ArrayBuffer> {
  const totalBytes = Number(response.headers.get('content-length') || 0);
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    const progress = { loadedBytes: buffer.byteLength, totalBytes: buffer.byteLength || totalBytes };
    emitProgress(progress);
    onProgress?.(progress);
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    const progress = {
      loadedBytes,
      totalBytes: totalBytes || loadedBytes,
    };
    emitProgress(progress);
    onProgress?.(progress);
  }

  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

export async function downloadModelBuffer(
  url: string,
  onProgress?: ProgressListener,
): Promise<ArrayBuffer> {
  if (window.__PYCAD_MODEL_FETCH__) {
    const early = window.__PYCAD_MODEL_FETCH__;
    window.__PYCAD_MODEL_FETCH__ = undefined;
    const buffer = await early;
    const progress = {
      loadedBytes: buffer.byteLength,
      totalBytes: buffer.byteLength,
    };
    emitProgress(progress);
    onProgress?.(progress);
    return buffer;
  }

  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Model unavailable (${response.status})`);
  }
  return streamResponseToBuffer(response, onProgress);
}

export async function downloadModelBlobUrl(
  url: string,
  onProgress?: ProgressListener,
): Promise<string> {
  const buffer = await downloadModelBuffer(url, onProgress);
  const blob = new Blob([buffer], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

export function progressToPercent(progress: DownloadProgress): number {
  if (progress.totalBytes <= 0) return 0;
  return Math.min(100, Math.round((progress.loadedBytes / progress.totalBytes) * 100));
}

export function mapProgressToUiPercent(progress: DownloadProgress): number {
  const downloadPct = progressToPercent(progress);
  return 10 + Math.round(downloadPct * 0.75);
}
