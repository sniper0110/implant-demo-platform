import { describe, expect, it } from 'vitest';
import { buildIframeSrc, isIframeMessage } from '../../embed-loader/messages';

describe('embed loader messages', () => {
  it('builds iframe src with layout query', () => {
    const src = buildIframeSrc('https://implant-demo.pycad.co', 'emb_pycad_staging', 'section');
    expect(src).toBe('https://implant-demo.pycad.co/e/emb_pycad_staging?layout=section');
  });

  it('validates iframe messages', () => {
    expect(
      isIframeMessage({ v: 1, type: 'pycad:iframe:ready', embedId: 'emb_pycad_staging', layout: 'section' }),
    ).toBe(true);
    expect(isIframeMessage({ v: 2, type: 'pycad:iframe:ready' })).toBe(false);
    expect(isIframeMessage(null)).toBe(false);
  });
});
