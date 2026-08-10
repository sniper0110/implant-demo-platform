import { describe, expect, it } from 'vitest';
import { mapProgressToUiPercent, progressToPercent } from '../../src/embed/modelDownload';

describe('model download progress', () => {
  it('maps byte progress into the UI band', () => {
    expect(mapProgressToUiPercent({ loadedBytes: 0, totalBytes: 1000 })).toBe(10);
    expect(mapProgressToUiPercent({ loadedBytes: 500, totalBytes: 1000 })).toBe(48);
    expect(mapProgressToUiPercent({ loadedBytes: 1000, totalBytes: 1000 })).toBe(85);
  });

  it('computes raw percent safely', () => {
    expect(progressToPercent({ loadedBytes: 25, totalBytes: 100 })).toBe(25);
    expect(progressToPercent({ loadedBytes: 0, totalBytes: 0 })).toBe(0);
  });
});
