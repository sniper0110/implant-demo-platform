import type { EmbedRecord } from '../config/types.js';
import {
  DEFAULT_EMBED_BRANDING,
  DEFAULT_EMBED_CONTROLS,
  type EmbedConfigResponse,
  type EmbedControls,
  type EmbedRuntimeConfig,
} from '../config/defaults.js';

export function buildFrameAncestors(origins: string[]): string {
  if (origins.length === 0) return "'self'";
  return origins.map((origin) => origin.replace(/'/g, '')).join(' ');
}

function sanitizeControls(raw: Record<string, unknown>): EmbedControls {
  const merged = { ...DEFAULT_EMBED_CONTROLS, ...raw };
  return {
    cage: merged.cage !== false,
    pedicleScrews: merged.pedicleScrews !== false,
    labels: merged.labels === true,
    storyNavigation: merged.storyNavigation !== false,
  };
}

export function toRuntimeConfig(
  record: EmbedRecord,
  assetBaseUrl: string,
  standaloneBaseUrl: string,
): EmbedRuntimeConfig {
  const branding = { ...DEFAULT_EMBED_BRANDING, ...record.branding };
  const controls = sanitizeControls(record.controls as Record<string, unknown>);
  const models = {
    initial: record.models.initial ?? 'models/lumbar-fusion-initial.glb',
    detail: record.models.detail,
    mobile: record.models.mobile ?? 'models/lumbar-fusion-mobile.glb',
  };

  return {
    embedId: record.embed_id,
    releaseId: record.release_id,
    productFamily: record.product_family,
    layout: record.default_layout,
    allowedOrigins: record.allowed_origins,
    branding,
    controls,
    models,
    assetBaseUrl,
    telemetryEnabled: record.telemetry_enabled,
    standaloneUrl: `${standaloneBaseUrl.replace(/\/$/, '')}/e/${encodeURIComponent(record.embed_id)}`,
  };
}

export function toPublicConfig(config: EmbedRuntimeConfig): EmbedConfigResponse {
  return {
    embedId: config.embedId,
    releaseId: config.releaseId,
    productFamily: config.productFamily,
    layout: config.layout,
    branding: config.branding,
    controls: config.controls,
    models: config.models,
    assetBaseUrl: config.assetBaseUrl,
    telemetryEnabled: config.telemetryEnabled,
    standaloneUrl: config.standaloneUrl,
  };
}

export function cspForEmbed(record: EmbedRecord): string {
  const ancestors = buildFrameAncestors(record.allowed_origins);
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-ancestors ${ancestors}`,
  ].join('; ');
}
