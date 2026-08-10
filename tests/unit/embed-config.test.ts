import { describe, expect, it } from 'vitest';
import {
  resolveModelUrl,
  resolveInitialModelPath,
  toPublicConfig,
  DEFAULT_EMBED_BRANDING,
  DEFAULT_EMBED_CONTROLS,
} from '../../src/embed/config';

describe('embed config', () => {
  it('resolves release-aware model urls', () => {
    const url = resolveModelUrl('https://cdn.example.com', 'v1', 'models/lumbar-fusion-initial.glb');
    expect(url).toBe('https://cdn.example.com/assets/v1/models/lumbar-fusion-initial.glb');
  });

  it('defaults labels to disabled', () => {
    expect(DEFAULT_EMBED_CONTROLS.labels).toBe(false);
    expect(DEFAULT_EMBED_CONTROLS).not.toHaveProperty('measurements');
  });

  it('selects mobile model on coarse devices', () => {
    const path = resolveInitialModelPath(
      {
        initial: 'models/lumbar-fusion-initial.glb',
        mobile: 'models/lumbar-fusion-mobile.glb',
      },
      true,
    );
    expect(path).toBe('models/lumbar-fusion-mobile.glb');
  });

  it('strips private fields from public config', () => {
    const publicConfig = toPublicConfig({
      embedId: 'emb_pycad_staging',
      releaseId: 'v1',
      productFamily: 'lumbar-fusion',
      layout: 'section',
      allowedOrigins: ['https://pycad.co'],
      branding: DEFAULT_EMBED_BRANDING,
      controls: DEFAULT_EMBED_CONTROLS,
      models: { initial: 'models/lumbar-fusion-initial.glb' },
      assetBaseUrl: 'https://implant-demo.pycad.co',
      telemetryEnabled: true,
      standaloneUrl: 'https://implant-demo.pycad.co/e/emb_pycad_staging',
    });

    expect(publicConfig).not.toHaveProperty('allowedOrigins');
    expect(publicConfig.controls.labels).toBe(false);
    expect(publicConfig.controls).not.toHaveProperty('measurements');
  });
});
