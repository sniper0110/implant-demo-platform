import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveDeviceTier, isCoarsePointerDevice } from '../../src/embed/deviceTier';

describe('device tier', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches:
          query.includes('coarse') || query.includes('hover: none') || query.includes('max-width'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
      devicePixelRatio: 2,
    });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0', platform: 'Win32', maxTouchPoints: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects coarse pointer devices', () => {
    expect(isCoarsePointerDevice()).toBe(true);
  });

  it('caps unknown-memory coarse devices at medium tier', () => {
    const tier = resolveDeviceTier();
    expect(['low', 'medium']).toContain(tier.tier);
    expect(tier.allowDetailModel).toBe(false);
    expect(tier.shadows).toBe(false);
    expect(tier.frameloop).toBe('always');
  });
});
