import type { EmbedLayout, QualityTier } from './config';

export const EMBED_MESSAGE_VERSION = 1 as const;

export type ParentToIframeMessage =
  | { v: 1; type: 'pycad:parent:resize'; width: number; height: number }
  | { v: 1; type: 'pycad:parent:visibility'; visible: boolean };

export type IframeToParentMessage =
  | { v: 1; type: 'pycad:iframe:ready'; embedId: string; layout: EmbedLayout }
  | { v: 1; type: 'pycad:iframe:height'; height: number }
  | { v: 1; type: 'pycad:iframe:loaded'; embedId: string }
  | { v: 1; type: 'pycad:iframe:first_frame'; embedId: string; ms: number }
  | { v: 1; type: 'pycad:iframe:quality_tier'; tier: QualityTier }
  | { v: 1; type: 'pycad:iframe:step'; index: number; title: string }
  | { v: 1; type: 'pycad:iframe:error'; code: string; message: string };

export type LoaderToParentMessage = IframeToParentMessage;

export function isValidMessage(value: unknown): value is ParentToIframeMessage | IframeToParentMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  return msg.v === EMBED_MESSAGE_VERSION && typeof msg.type === 'string' && msg.type.startsWith('pycad:');
}

export function postToParent(message: IframeToParentMessage, targetOrigin = '*') {
  if (window.parent === window) return;
  window.parent.postMessage(message, targetOrigin);
}

export function parseParentMessage(
  event: MessageEvent,
  allowedOrigins: string[],
): ParentToIframeMessage | null {
  if (!isValidMessage(event.data)) return null;
  if (!event.data.type.startsWith('pycad:parent:')) return null;
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin)) return null;
  return event.data as ParentToIframeMessage;
}
