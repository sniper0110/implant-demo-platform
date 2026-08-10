import { describe, expect, it } from 'vitest';
import { cspForEmbed } from '../../server/src/security/csp.js';

describe('embed CSP', () => {
  it('allows WebAssembly required by Three.js GLTF decoders', () => {
    const csp = cspForEmbed({
      embed_id: 'emb_test',
      status: 'active',
      customer_name: 'Test',
      allowed_origins: ['https://pycad.co'],
      default_layout: 'section',
      release_id: 'v1',
      product_family: 'lumbar-fusion',
      branding: {},
      controls: {},
      models: {},
      telemetry_enabled: true,
    });

    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' blob:");
  });
});
