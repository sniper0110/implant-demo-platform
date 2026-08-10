import type { EmbedBranding, EmbedControls, EmbedLayout, EmbedModels } from './defaults.js';

export interface EmbedRecord {
  embed_id: string;
  status: 'active' | 'disabled';
  customer_name: string;
  allowed_origins: string[];
  default_layout: EmbedLayout;
  release_id: string;
  product_family: 'lumbar-fusion';
  branding: Partial<EmbedBranding>;
  controls: Partial<EmbedControls>;
  models: Partial<EmbedModels>;
  telemetry_enabled: boolean;
}

export interface EmbedRepository {
  getById(embedId: string): Promise<EmbedRecord | null>;
}
