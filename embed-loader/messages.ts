export const EMBED_MESSAGE_VERSION = 1 as const;

export type EmbedLayout = 'section' | 'full';

export type ParentToIframeMessage =
  | { v: 1; type: 'pycad:parent:resize'; width: number; height: number }
  | { v: 1; type: 'pycad:parent:visibility'; visible: boolean };

export type IframeToParentMessage =
  | { v: 1; type: 'pycad:iframe:ready'; embedId: string; layout: EmbedLayout }
  | { v: 1; type: 'pycad:iframe:height'; height: number }
  | { v: 1; type: 'pycad:iframe:loaded'; embedId: string }
  | { v: 1; type: 'pycad:iframe:first_frame'; embedId: string; ms: number }
  | { v: 1; type: 'pycad:iframe:quality_tier'; tier: 'low' | 'medium' | 'high' }
  | { v: 1; type: 'pycad:iframe:step'; index: number; title: string }
  | { v: 1; type: 'pycad:iframe:error'; code: string; message: string };

export function isIframeMessage(value: unknown): value is IframeToParentMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  return msg.v === EMBED_MESSAGE_VERSION && typeof msg.type === 'string' && msg.type.startsWith('pycad:iframe:');
}

export function buildIframeSrc(baseUrl: string, embedId: string, layout: EmbedLayout): string {
  const url = new URL(`/e/${encodeURIComponent(embedId)}`, baseUrl);
  url.searchParams.set('layout', layout);
  return url.toString();
}

export const SECTION_MIN_HEIGHT = 520;
export const FULL_MIN_HEIGHT = 720;
