export type EmbedLayout = 'section' | 'full';

export type QualityTier = 'low' | 'medium' | 'high';

export interface EmbedBranding {
  brandName: string;
  brandTagline: string;
  moduleLabel: string;
  showHeader: boolean;
  showFooter: boolean;
  showSidePanel: boolean;
}

export interface EmbedControls {
  cage: boolean;
  pedicleScrews: boolean;
  labels: boolean;
  storyNavigation: boolean;
}

export interface EmbedModels {
  initial: string;
  detail?: string;
  mobile?: string;
}

export interface EmbedRuntimeConfig {
  embedId: string;
  releaseId: string;
  productFamily: 'lumbar-fusion';
  layout: EmbedLayout;
  allowedOrigins: string[];
  branding: EmbedBranding;
  controls: EmbedControls;
  models: EmbedModels;
  assetBaseUrl: string;
  telemetryEnabled: boolean;
  standaloneUrl: string;
}

export interface EmbedConfigResponse {
  embedId: string;
  releaseId: string;
  productFamily: 'lumbar-fusion';
  layout: EmbedLayout;
  branding: EmbedBranding;
  controls: EmbedControls;
  models: EmbedModels;
  assetBaseUrl: string;
  telemetryEnabled: boolean;
  standaloneUrl: string;
}

export const DEFAULT_EMBED_BRANDING: EmbedBranding = {
  brandName: 'PYCAD',
  brandTagline: 'Interactive Implant Demo Portal',
  moduleLabel: 'Lumbar Fusion',
  showHeader: true,
  showFooter: true,
  showSidePanel: true,
};

export const DEFAULT_EMBED_CONTROLS: EmbedControls = {
  cage: true,
  pedicleScrews: true,
  labels: false,
  storyNavigation: true,
};

export function resolveInitialModelPath(models: EmbedModels, useMobile: boolean): string {
  if (useMobile && models.mobile) return models.mobile;
  return models.initial;
}

export function toPublicConfig(config: EmbedRuntimeConfig): EmbedConfigResponse {
  return {
    embedId: config.embedId,
    releaseId: config.releaseId,
    productFamily: config.productFamily,
    layout: config.layout,
    branding: config.branding,
    controls: {
      cage: config.controls.cage,
      pedicleScrews: config.controls.pedicleScrews,
      labels: config.controls.labels,
      storyNavigation: config.controls.storyNavigation,
    },
    models: config.models,
    assetBaseUrl: config.assetBaseUrl,
    telemetryEnabled: config.telemetryEnabled,
    standaloneUrl: config.standaloneUrl,
  };
}

export function resolveModelUrl(baseUrl: string, releaseId: string, modelPath: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = modelPath.replace(/^\//, '');
  if (normalizedPath.startsWith('http')) return normalizedPath;
  if (normalizedPath.includes('/assets/')) {
    return `${normalizedBase}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  }
  return `${normalizedBase}/assets/${releaseId}/${normalizedPath}`;
}
