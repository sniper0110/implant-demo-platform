export type EmbedLayout = 'section' | 'full';

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

export interface EmbedRuntimeConfig extends EmbedConfigResponse {
  allowedOrigins: string[];
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
