import type { QualityTier } from './config';
import { postToParent } from './messages';

type TelemetryEvent =
  | { name: 'loader_ready'; embedId: string }
  | { name: 'scene_loaded'; embedId: string; ms: number }
  | { name: 'first_frame'; embedId: string; ms: number }
  | { name: 'quality_tier'; tier: QualityTier }
  | { name: 'error'; code: string; message: string };

const startedAt = performance.now();

export function createEmbedTelemetry(embedId: string, enabled: boolean) {
  function emit(event: TelemetryEvent) {
    if (!enabled) return;

    switch (event.name) {
      case 'loader_ready':
        postToParent({ v: 1, type: 'pycad:iframe:ready', embedId: event.embedId, layout: 'section' });
        break;
      case 'scene_loaded':
        postToParent({ v: 1, type: 'pycad:iframe:loaded', embedId: event.embedId });
        break;
      case 'first_frame':
        postToParent({
          v: 1,
          type: 'pycad:iframe:first_frame',
          embedId: event.embedId,
          ms: event.ms,
        });
        break;
      case 'quality_tier':
        postToParent({ v: 1, type: 'pycad:iframe:quality_tier', tier: event.tier });
        break;
      case 'error':
        postToParent({ v: 1, type: 'pycad:iframe:error', code: event.code, message: event.message });
        break;
      default:
        break;
    }
  }

  return {
    markReady(layout: 'section' | 'full') {
      postToParent({ v: 1, type: 'pycad:iframe:ready', embedId, layout });
    },
    markLoaded() {
      emit({ name: 'scene_loaded', embedId, ms: performance.now() - startedAt });
    },
    markFirstFrame() {
      emit({ name: 'first_frame', embedId, ms: performance.now() - startedAt });
    },
    markQualityTier(tier: QualityTier) {
      emit({ name: 'quality_tier', tier });
    },
    markError(code: string, message: string) {
      emit({ name: 'error', code, message });
    },
    markStep(index: number, title: string) {
      postToParent({ v: 1, type: 'pycad:iframe:step', index, title });
    },
    reportHeight(height: number) {
      postToParent({ v: 1, type: 'pycad:iframe:height', height });
    },
  };
}

export type EmbedTelemetry = ReturnType<typeof createEmbedTelemetry>;
